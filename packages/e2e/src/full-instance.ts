import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';

import type { IRun } from 'n8n-workflow';
import type { StartedTestContainer } from 'testcontainers';

import {
  parseExecuteOutput,
  stripInjectedTrigger,
  toFullInstanceWorkflow,
} from './full-instance-workflow.js';
import type { WorkflowDefinition } from './workflow-builder.js';

/** Options for {@link startN8nInstance} and {@link runWorkflowInFullInstance}. */
export interface RunInFullInstanceOptions {
  /** `n8nio/n8n` image to run. Defaults to a pinned, tested release. */
  image?: string;
  /**
   * Host paths of built n8n node packages to install into the instance — each
   * a directory with a `package.json` (whose `n8n.nodes` lists the node files)
   * and the files its `files` field names (default `dist`). Installed the way
   * n8n installs a community package, so node types resolve as
   * `<package name>.<node name>`. Runtime dependencies are not installed:
   * bundle them into the package's output.
   */
  nodePackages?: readonly string[];
  /** Extra environment variables for the n8n process. */
  env?: Record<string, string>;
  /** Upper bound for one workflow run (import + execute), in ms. Defaults to 120 000. */
  runTimeoutMs?: number;
}

/** A running n8n container that workflows can be executed in, one at a time. */
export interface N8nInstance {
  /** Import and execute a workflow; resolves with its run even when a node failed. */
  run(workflowDefinition: WorkflowDefinition): Promise<IRun>;
  /** Stop and remove the container. Safe to call more than once. */
  stop(): Promise<void>;
}

/** Last release the full tier was verified against. Override with `image`. */
export const DEFAULT_N8N_IMAGE = 'n8nio/n8n:2.41.7';

const N8N_HOME = '/home/node/.n8n';
const STAGING_DIR = '/opt/n8n-probe';
const DEFAULT_RUN_TIMEOUT_MS = 120_000;

const BASE_ENV: Record<string, string> = {
  N8N_DIAGNOSTICS_ENABLED: 'false',
  N8N_UNVERIFIED_PACKAGES_ENABLED: 'true',
  N8N_PERSONALIZATION_ENABLED: 'false',
};

/**
 * Boot an `n8nio/n8n` container for the full tier. Nothing listens on a port:
 * every run goes through n8n's own CLI (`import:workflow` + `execute`), the
 * closest thing to a production run that needs no owner account or API key.
 *
 * `testcontainers` is an optional peer dependency and Docker must be running.
 * Reuse one instance across a suite and `await stop()` in its teardown — each
 * run still pays n8n's CLI start-up (seconds), the container boot is paid once.
 */
export async function startN8nInstance(
  options: RunInFullInstanceOptions = {},
): Promise<N8nInstance> {
  const { GenericContainer } = await import('testcontainers');

  // `sleep` keeps the container alive without starting n8n's server: a second
  // n8n process (the CLI) would otherwise collide with it on the task-broker port.
  const container = await new GenericContainer(options.image ?? DEFAULT_N8N_IMAGE)
    .withEntrypoint(['tini', '--', 'sh', '-c', 'sleep infinity'])
    .withEnvironment({ ...BASE_ENV, ...options.env })
    .start();

  try {
    for (const [index, packageDir] of (options.nodePackages ?? []).entries()) {
      await installNodePackage(container, packageDir, `${STAGING_DIR}/packages/${index}`);
    }
  } catch (error) {
    await container.stop();
    throw error;
  }

  const runTimeoutMs = options.runTimeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
  let queue: Promise<unknown> = Promise.resolve();
  let stopped = false;
  let timedOut = false;

  return {
    run(workflowDefinition) {
      if (stopped) return Promise.reject(new Error('@n8n-probe/e2e: the n8n instance is stopped.'));
      // Each CLI invocation is a full n8n process; two at once fight over the
      // task-broker port, so runs on one instance are serialised.
      const next = queue.then(() => {
        // A timed-out run's CLI process may still be alive in the container, and
        // the next one would collide with it — fail fast instead of flaking.
        if (timedOut) {
          throw new Error(
            '@n8n-probe/e2e: an earlier run on this n8n instance timed out; stop() it and start a new one.',
          );
        }
        return withTimeout(runOnce(container, workflowDefinition), runTimeoutMs, () => {
          timedOut = true;
        });
      });
      queue = next.catch(() => undefined);
      return next;
    },
    async stop() {
      if (stopped) return;
      stopped = true;
      await container.stop();
    },
  };
}

/**
 * Full tier, one-shot: boot a container, run the workflow, stop the container.
 * Returns an `IRun` shaped like {@link runWorkflow}'s, so `expectWorkflowSuccess`
 * and `getNodeOutput` work unchanged. Use {@link startN8nInstance} to run
 * several workflows against one container.
 */
export async function runWorkflowInFullInstance(
  workflowDefinition: WorkflowDefinition,
  options: RunInFullInstanceOptions = {},
): Promise<IRun> {
  // Validate before paying for a container boot.
  toFullInstanceWorkflow(workflowDefinition, 'validate');
  const instance = await startN8nInstance(options);
  try {
    return await instance.run(workflowDefinition);
  } finally {
    await instance.stop();
  }
}

async function runOnce(
  container: StartedTestContainer,
  workflowDefinition: WorkflowDefinition,
): Promise<IRun> {
  // n8n workflow ids are 16 alphanumerics; a fresh one per run keeps runs on a
  // shared instance from overwriting each other.
  const id = randomBytes(8).toString('hex');
  const { json, seededNodeName } = toFullInstanceWorkflow(workflowDefinition, id);
  const file = `${STAGING_DIR}/workflows/${id}.json`;
  await container.copyContentToContainer([
    { content: JSON.stringify(json), target: file, mode: 0o644 },
  ]);

  const imported = await container.exec(['n8n', 'import:workflow', `--input=${file}`]);
  if (imported.exitCode !== 0) {
    throw new Error(
      `@n8n-probe/e2e: \`n8n import:workflow\` failed (exit ${imported.exitCode}):\n${tail(imported.output)}`,
    );
  }

  // A node failure exits non-zero but still prints the run, which is what the
  // caller asserts on; only a missing run is an infrastructure error.
  const executed = await container.exec(['n8n', 'execute', `--id=${id}`, '--rawOutput']);
  const run = parseExecuteOutput(executed.stdout) ?? parseExecuteOutput(executed.output);
  if (!run) {
    throw new Error(
      `@n8n-probe/e2e: \`n8n execute\` produced no run data (exit ${executed.exitCode}):\n${tail(executed.output)}`,
    );
  }
  return stripInjectedTrigger(run, seededNodeName);
}

/** Copy a node package's published files in and install it as a community package. */
async function installNodePackage(
  container: StartedTestContainer,
  packageDir: string,
  stagingDir: string,
): Promise<void> {
  const manifest = JSON.parse(await readFile(join(packageDir, 'package.json'), 'utf8')) as {
    name?: unknown;
    files?: unknown;
  };
  if (typeof manifest.name !== 'string' || manifest.name === '') {
    throw new Error(`@n8n-probe/e2e: ${packageDir}/package.json has no "name".`);
  }
  const entries = Array.isArray(manifest.files)
    ? manifest.files.filter((entry): entry is string => typeof entry === 'string')
    : ['dist'];

  await container.copyFilesToContainer([
    { source: join(packageDir, 'package.json'), target: `${stagingDir}/package.json` },
  ]);
  for (const entry of entries) {
    const source = join(packageDir, entry);
    const target = posix.join(stagingDir, entry.split('\\').join('/'));
    const info = await stat(source).catch(() => undefined);
    if (!info) {
      throw new Error(
        `@n8n-probe/e2e: ${source} (listed in ${manifest.name}'s "files") does not exist — build the package first.`,
      );
    }
    if (info.isDirectory()) {
      await container.copyDirectoriesToContainer([{ source, target }]);
    } else {
      await container.copyFilesToContainer([{ source, target }]);
    }
  }

  // Copy as the image's own user: files Docker copies in are root-owned, and n8n
  // writes next to its community packages at start-up.
  const destination = `${N8N_HOME}/nodes/node_modules/${manifest.name}`;
  const installed = await container.exec([
    'sh',
    '-c',
    `mkdir -p "${destination}" && cp -R "${stagingDir}/." "${destination}/"`,
  ]);
  if (installed.exitCode !== 0) {
    throw new Error(
      `@n8n-probe/e2e: installing ${manifest.name} into the container failed:\n${tail(installed.output)}`,
    );
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`@n8n-probe/e2e: the workflow run did not finish within ${ms} ms.`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** The last lines of CLI output — enough to see n8n's error without its whole boot log. */
function tail(output: string, lines = 30): string {
  return output.trimEnd().split(/\r?\n/).slice(-lines).join('\n');
}
