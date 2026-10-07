import { randomUUID } from 'node:crypto';

import { ExecutionLifecycleHooks, WorkflowExecute } from 'n8n-core';
import { Workflow } from 'n8n-workflow';
import type {
  ICredentialDataDecryptedObject,
  ICredentialsHelper,
  INodeCredentialsDetails,
  IRun,
  IWorkflowBase,
  IWorkflowExecuteAdditionalData,
  WorkflowExecuteMode,
} from 'n8n-workflow';

import { nodeTypesFrom } from './node-types.js';
import type { NodeTypeClass } from './node-types.js';
import type { WorkflowDefinition } from './workflow-builder.js';

/** Options for {@link runWorkflow} (fast, in-process tier). */
export interface RunWorkflowOptions {
  /** Extra node classes the workflow references, keyed off `description.name`. */
  nodeTypes?: readonly NodeTypeClass[];
  /** Decrypted credential objects keyed by credential type name. */
  credentials?: Record<string, ICredentialDataDecryptedObject>;
  /** Execution mode passed to n8n. Defaults to `'manual'`. */
  mode?: WorkflowExecuteMode;
  /**
   * Name of the node to start from. Defaults to the workflow's only entry node
   * (a node no connection points to); required when there are several.
   */
  startNode?: string;
}

/**
 * A `getDecrypted`-backed credentials helper over a plain type -> object map.
 * The in-process runner calls `getDecrypted` and, since n8n-core 2.41,
 * `isCredentialUsableByNode` before every `getCredentials`. Per-node credential
 * restrictions are an n8n server policy with no meaning in a test, so every
 * type is usable. The rest of `ICredentialsHelper` (OAuth flows, credential
 * CRUD) is intentionally not implemented for this tier.
 */
function mapCredentialsHelper(
  store: Record<string, ICredentialDataDecryptedObject>,
): ICredentialsHelper {
  const getDecrypted = (
    _additionalData: IWorkflowExecuteAdditionalData,
    nodeCredentials: INodeCredentialsDetails,
    type: string,
  ): Promise<ICredentialDataDecryptedObject> => {
    const found = store[type] ?? store[nodeCredentials.name];
    if (!found) {
      return Promise.reject(
        new Error(
          `@n8n-probe/e2e: no credentials provided for type "${type}". ` +
            'Pass them via runWorkflow(wf, { credentials: { [type]: {...} } }).',
        ),
      );
    }
    return Promise.resolve(found);
  };

  const isCredentialUsableByNode = (): boolean => true;

  return { getDecrypted, isCredentialUsableByNode } as unknown as ICredentialsHelper;
}

/**
 * The node execution starts from: `requested` if given, otherwise the single
 * node that is never a connection target. Several candidates are an error
 * rather than a guess — the engine only runs what is reachable from the start
 * node, so picking the wrong one would silently skip part of the workflow.
 */
function resolveStartNodeName(definition: WorkflowDefinition, requested?: string): string {
  if (requested !== undefined) {
    if (!definition.nodes.some((node) => node.name === requested)) {
      throw new Error(`@n8n-probe/e2e: startNode "${requested}" is not a node of the workflow.`);
    }
    return requested;
  }

  const targets = new Set<string>();
  for (const nodeConnections of Object.values(definition.connections)) {
    for (const outputs of Object.values(nodeConnections)) {
      for (const links of outputs ?? []) {
        for (const link of links ?? []) targets.add(link.node);
      }
    }
  }
  const candidates = definition.nodes.filter((node) => !targets.has(node.name));
  const [start, ...others] = candidates;
  if (!start) {
    throw new Error(
      '@n8n-probe/e2e: the workflow has no entry node (every node is a connection target).',
    );
  }
  if (others.length > 0) {
    const names = candidates.map((node) => `"${node.name}"`).join(', ');
    throw new Error(
      `@n8n-probe/e2e: the workflow has several entry nodes (${names}). ` +
        'Pass runWorkflow(wf, { startNode }) to choose one.',
    );
  }
  return start.name;
}

/** Minimal `IWorkflowExecuteAdditionalData` the in-process engine needs. */
function createAdditionalData(
  workflowDefinition: WorkflowDefinition,
  options: RunWorkflowOptions,
): IWorkflowExecuteAdditionalData {
  // Unique per run, so spans/metrics/logs from parallel runs never alias.
  const executionId = `e2e-${randomUUID()}`;
  const base = 'http://localhost:5678';
  const additionalData = {
    executionId,
    userId: 'e2e',
    variables: {},
    restApiUrl: `${base}/rest`,
    instanceBaseUrl: base,
    baseUrl: base,
    webhookBaseUrl: `${base}/webhook`,
    webhookTestBaseUrl: `${base}/webhook-test`,
    webhookWaitingBaseUrl: `${base}/webhook-waiting`,
    formWaitingBaseUrl: `${base}/form-waiting`,
    currentNodeParameters: undefined,
    credentialsHelper: mapCredentialsHelper(options.credentials ?? {}),
    hooks: new ExecutionLifecycleHooks(options.mode ?? 'manual', executionId, {
      id: workflowDefinition.id,
      name: workflowDefinition.name,
      active: false,
      nodes: workflowDefinition.nodes,
      connections: workflowDefinition.connections,
      settings: workflowDefinition.settings,
    } as unknown as IWorkflowBase),
  };
  return additionalData as unknown as IWorkflowExecuteAdditionalData;
}

/**
 * Fast tier: execute the workflow in-process via `n8n-workflow` / `n8n-core`.
 * No server, no database. Returns n8n's `IRun` — inspect it with
 * {@link expectWorkflowSuccess} / {@link getNodeOutput}.
 */
export async function runWorkflow(
  workflowDefinition: WorkflowDefinition,
  options: RunWorkflowOptions = {},
): Promise<IRun> {
  // Resolved first: a structural mistake should not surface as a node-type error.
  const startNodeName = resolveStartNodeName(workflowDefinition, options.startNode);

  const workflow = new Workflow({
    id: workflowDefinition.id,
    name: workflowDefinition.name,
    nodes: workflowDefinition.nodes,
    connections: workflowDefinition.connections,
    active: workflowDefinition.active,
    settings: workflowDefinition.settings,
    nodeTypes: nodeTypesFrom(options.nodeTypes ?? []),
  });

  const workflowExecute = new WorkflowExecute(
    createAdditionalData(workflowDefinition, options),
    options.mode ?? 'manual',
  );

  const startNode = workflow.getNode(startNodeName) ?? undefined;
  return workflowExecute.run({ workflow, startNode });
}
