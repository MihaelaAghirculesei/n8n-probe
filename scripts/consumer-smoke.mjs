#!/usr/bin/env node
// Install the packages the way a user gets them — `pnpm pack` tarballs, in a
// project outside this workspace — and run a consumer suite against them.
// Catches what in-repo tests cannot: broken `exports`/`types`, a dependency
// that only resolves thanks to the workspace, a config the monorepo hides
// (ADR-0014). Run after `pnpm build`:
//
//   node scripts/consumer-smoke.mjs        (KEEP=1 keeps the scratch project)
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const packages = ['core', 'unit', 'mock-http', 'e2e', 'otel', 'metrics'];

const scratch = mkdtempSync(join(tmpdir(), 'n8n-probe-consumer-'));
const tarballs = join(scratch, 'tarballs');
const consumer = join(scratch, 'consumer');

function run(command, args, cwd) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  // pnpm is a .cmd shim on Windows, which needs a shell; quote what has spaces.
  const windows = process.platform === 'win32';
  const quoted = windows ? args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)) : args;
  const result = spawnSync(command, quoted, { cwd, stdio: 'inherit', shell: windows });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status ?? result.signal}`);
  }
}

/** The version range the workspace itself builds against, so peers match. */
function devRange(name) {
  const manifest = JSON.parse(readFileSync(join(repo, 'packages/e2e/package.json'), 'utf8'));
  const range = manifest.devDependencies[name];
  if (!range) throw new Error(`packages/e2e has no devDependency "${name}"`);
  return range;
}

try {
  for (const name of packages) {
    run(
      'pnpm',
      ['--dir', join(repo, 'packages', name), 'pack', '--pack-destination', tarballs],
      repo,
    );
  }
  const files = Object.fromEntries(
    readdirSync(tarballs).map((file) => [
      `@n8n-probe/${file.replace(/^n8n-probe-/, '').replace(/-\d+\.\d+\.\d+.*\.tgz$/, '')}`,
      `file:${join(tarballs, file).split('\\').join('/')}`,
    ]),
  );

  cpSync(join(repo, 'scripts/consumer-smoke'), consumer, { recursive: true });
  // Overrides make the packages' own `@n8n-probe/core@^x` ranges resolve to the
  // tarball too, not to whatever is on the registry.
  writeFileSync(
    join(consumer, 'pnpm-workspace.yaml'),
    [
      'overrides:',
      ...Object.entries(files).map(([name, spec]) => `  '${name}': '${spec}'`),
      // Same choices as the root pnpm-workspace.yaml: the native deps n8n-core
      // pulls in are never exercised by these tests.
      'allowBuilds:',
      '  esbuild: true',
      "  '@sentry/node-cpu-profiler': false",
      "  '@sentry/node-native-stacktrace': false",
      '  cpu-features: false',
      '  isolated-vm: false',
      '  msw: false',
      '  protobufjs: false',
      '  ssh2: false',
      '',
    ].join('\n'),
  );

  run(
    'pnpm',
    [
      'add',
      ...Object.values(files),
      `vitest@${devRange('vitest')}`,
      `n8n-workflow@${devRange('n8n-workflow')}`,
      `n8n-core@${devRange('n8n-core')}`,
      `typescript@${devRange('typescript')}`,
      `@types/node@${devRange('@types/node')}`,
    ],
    consumer,
  );

  const lockfile = readFileSync(join(consumer, 'pnpm-lock.yaml'), 'utf8');
  if (/^\s+testcontainers@/m.test(lockfile)) {
    throw new Error('testcontainers was installed; it must stay an optional peer dependency.');
  }
  console.log('\ntestcontainers is not installed (optional peer) — OK');

  run('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], consumer);
  run('node', ['test/require.cjs'], consumer);
  run('pnpm', ['exec', 'vitest', 'run'], consumer);
  console.log('\nconsumer smoke test passed');
} finally {
  if (process.env.KEEP) console.log(`\nkept ${scratch}`);
  else rmSync(scratch, { recursive: true, force: true });
}
