import { NotImplementedError } from '@n8n-probe/core';
import type {
  INodeExecutionData,
  IRun,
  IWorkflowBase,
  WorkflowExecuteMode,
} from 'n8n-workflow';

/** A single node in a workflow under construction. */
export interface WorkflowNodeSpec {
  name: string;
  type: string;
  typeVersion?: number;
  parameters?: Record<string, unknown>;
  position?: [number, number];
}

/** Fluent builder producing an `IWorkflowBase`. */
export interface WorkflowBuilder {
  addNode(node: WorkflowNodeSpec): WorkflowBuilder;
  connect(from: string, to: string): WorkflowBuilder;
  build(): IWorkflowBase;
}

/** Options for {@link runWorkflow} (fast, in-process tier). */
export interface RunWorkflowOptions {
  credentials?: Record<string, unknown>;
  mode?: WorkflowExecuteMode;
}

/** Start building a workflow: `workflow().addNode(...).connect(a, b).build()`. */
export function workflow(): WorkflowBuilder {
  throw new NotImplementedError('workflow');
}

/**
 * Fast tier: execute the workflow in-process via `n8n-workflow` / `n8n-core`.
 * No server, no database.
 */
export function runWorkflow(
  _workflowBase: IWorkflowBase,
  _options?: RunWorkflowOptions,
): Promise<IRun> {
  return Promise.reject(new NotImplementedError('runWorkflow'));
}

/**
 * Full tier: boot the official `n8nio/n8n` image via `testcontainers`, import
 * and execute the workflow through the REST API, return the run.
 */
export function runWorkflowInFullInstance(
  _workflowBase: IWorkflowBase,
  _options?: { image?: string },
): Promise<IRun> {
  return Promise.reject(new NotImplementedError('runWorkflowInFullInstance'));
}

/** Assert the run finished without error. */
export function expectWorkflowSuccess(_run: IRun): void {
  throw new NotImplementedError('expectWorkflowSuccess');
}

/** Read a named node's output items from a completed run. */
export function getNodeOutput(_run: IRun, _nodeName: string): INodeExecutionData[] {
  throw new NotImplementedError('getNodeOutput');
}
