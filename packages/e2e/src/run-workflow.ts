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
}

/**
 * A `getDecrypted`-backed credentials helper over a plain type -> object map.
 * The in-process runner only ever calls `getDecrypted`; the rest of
 * `ICredentialsHelper` (OAuth flows, credential CRUD) is intentionally not
 * implemented for this tier in v1.
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

  return { getDecrypted } as unknown as ICredentialsHelper;
}

/** The first node that is never a connection target — the workflow's entry point. */
function findStartNodeName(definition: WorkflowDefinition): string {
  const targets = new Set<string>();
  for (const nodeConnections of Object.values(definition.connections)) {
    for (const outputs of Object.values(nodeConnections)) {
      for (const links of outputs ?? []) {
        for (const link of links ?? []) targets.add(link.node);
      }
    }
  }
  const start = definition.nodes.find((node) => !targets.has(node.name));
  if (!start) {
    throw new Error(
      '@n8n-probe/e2e: the workflow has no entry node (every node is a connection target).',
    );
  }
  return start.name;
}

/** Minimal `IWorkflowExecuteAdditionalData` the in-process engine needs. */
function createAdditionalData(
  workflowDefinition: WorkflowDefinition,
  options: RunWorkflowOptions,
): IWorkflowExecuteAdditionalData {
  const executionId = 'e2e-exec';
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

  const startNode = workflow.getNode(findStartNodeName(workflowDefinition)) ?? undefined;
  return workflowExecute.run({ workflow, startNode });
}
