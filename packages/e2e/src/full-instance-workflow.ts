import type { IConnections, INode, IRun } from 'n8n-workflow';

import { manualTriggerRows } from './node-types.js';
import type { WorkflowDefinition } from './workflow-builder.js';

/** n8n's own Manual Trigger, the only start node `n8n execute` accepts. */
export const N8N_MANUAL_TRIGGER = 'n8n-nodes-base.manualTrigger';

/**
 * Name of the trigger injected in front of a seeded {@link ManualTrigger}.
 * Stripped from the returned run data, so tests never see it.
 */
export const INJECTED_TRIGGER_NAME = '__n8nProbeTrigger';

const MANUAL_TRIGGER_TYPES = new Set(['manualTrigger', N8N_MANUAL_TRIGGER]);

/** The JSON document `n8n import:workflow` reads, plus the start node to report. */
export interface FullInstanceWorkflow {
  /** Workflow export as n8n's CLI expects it (top-level `id` is mandatory). */
  json: {
    id: string;
    name: string;
    active: false;
    nodes: INode[];
    connections: IConnections;
    settings: WorkflowDefinition['settings'];
  };
  /** The node the caller's definition starts from, when a trigger was injected. */
  seededNodeName?: string;
}

/**
 * Translate a {@link WorkflowDefinition} built for the in-process tier into one
 * a real n8n instance can import and run from its CLI:
 *
 * - The toolkit's `manualTrigger` becomes n8n's own `n8n-nodes-base.manualTrigger`.
 *   n8n's trigger cannot emit configured items and the CLI ignores pinned data,
 *   so a trigger with a `data` parameter is replaced by a Code node returning
 *   those items, fed by an injected Manual Trigger.
 * - Every other node type must be package-qualified (`n8n-nodes-probe-example.example`):
 *   a real instance has no bare-name lookup, and failing here is cheaper than
 *   after a container boot.
 */
export function toFullInstanceWorkflow(
  definition: WorkflowDefinition,
  id: string,
): FullInstanceWorkflow {
  const triggers = definition.nodes.filter((node) => MANUAL_TRIGGER_TYPES.has(node.type));
  if (triggers.length !== 1) {
    throw new Error(
      `@n8n-probe/e2e: the full tier runs workflows through \`n8n execute\`, which needs ` +
        `exactly one manual trigger node; found ${triggers.length}.`,
    );
  }

  const unqualified = definition.nodes.filter(
    (node) => !MANUAL_TRIGGER_TYPES.has(node.type) && !node.type.includes('.'),
  );
  if (unqualified.length > 0) {
    const list = unqualified.map((node) => `"${node.name}" (${node.type})`).join(', ');
    throw new Error(
      `@n8n-probe/e2e: the full tier needs package-qualified node types, e.g. ` +
        `"n8n-nodes-my-package.myNode" instead of "myNode". Unqualified: ${list}.`,
    );
  }

  const nodes: INode[] = [];
  const connections: IConnections = structuredClone(definition.connections);
  let seededNodeName: string | undefined;

  for (const node of definition.nodes) {
    if (!MANUAL_TRIGGER_TYPES.has(node.type)) {
      nodes.push(structuredClone(node));
      continue;
    }

    const { data } = node.parameters;
    if (data === undefined) {
      nodes.push({ ...node, type: N8N_MANUAL_TRIGGER, typeVersion: 1, parameters: {} });
      continue;
    }

    // The CLI needs a Manual Trigger to start from, so the seeded node keeps its
    // name (and therefore its connections and run data) as a Code node, and a
    // fresh trigger is wired in front of it.
    const rows = JSON.stringify(manualTriggerRows(data));
    nodes.push({
      id: INJECTED_TRIGGER_NAME,
      name: INJECTED_TRIGGER_NAME,
      type: N8N_MANUAL_TRIGGER,
      typeVersion: 1,
      position: [node.position[0] - 220, node.position[1]],
      parameters: {},
    });
    nodes.push({
      ...node,
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      parameters: { jsCode: `return ${rows}.map((json) => ({ json }));` },
    });
    connections[INJECTED_TRIGGER_NAME] = {
      main: [[{ node: node.name, type: 'main', index: 0 }]],
    };
    seededNodeName = node.name;
  }

  const json = {
    id,
    name: definition.name,
    active: false as const,
    nodes,
    connections,
    settings: definition.settings,
  };
  return seededNodeName === undefined ? { json } : { json, seededNodeName };
}

/**
 * Pull the `IRun` out of `n8n execute --rawOutput` output. n8n prints it as
 * two-space-indented JSON, but on the same stream as its own log lines (task
 * runner start-up, license notices, and on failure the error after the run), so
 * the document is located by its unindented opening and closing braces.
 */
export function parseExecuteOutput(stdout: string): IRun | undefined {
  const lines = stdout.split(/\r?\n/);
  const start = lines.indexOf('{');
  if (start === -1) return undefined;
  const end = lines.indexOf('}', start);
  if (end === -1) return undefined;

  // JSON carries the timestamps as ISO strings; restore the `Date`s `IRun` declares.
  const { startedAt, stoppedAt, ...rest } = JSON.parse(
    lines.slice(start, end + 1).join('\n'),
  ) as Omit<IRun, 'startedAt' | 'stoppedAt'> & { startedAt: string; stoppedAt?: string };
  const run: IRun = { ...rest, startedAt: new Date(startedAt) };
  if (stoppedAt !== undefined) run.stoppedAt = new Date(stoppedAt);
  return run;
}

/** Remove the injected trigger so the run reads as if the definition ran as written. */
export function stripInjectedTrigger(run: IRun, seededNodeName: string | undefined): IRun {
  if (seededNodeName === undefined) return run;
  const { runData } = run.data.resultData;
  delete runData[INJECTED_TRIGGER_NAME];
  for (const task of runData[seededNodeName] ?? []) task.source = [];
  return run;
}
