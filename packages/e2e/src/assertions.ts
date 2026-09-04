import type { INodeExecutionData, IRun } from 'n8n-workflow';

/**
 * Assert the run finished without error. Throws with the failing node and
 * message otherwise.
 */
export function expectWorkflowSuccess(run: IRun): void {
  const error = run.data.resultData.error;
  if (error || run.status === 'error' || run.status === 'crashed') {
    const runData = run.data.resultData.runData;
    const failed = Object.keys(runData).find((name) => runData[name]?.some((task) => task.error));
    const detail = error?.message ?? runData[failed ?? '']?.find((t) => t.error)?.error?.message;
    throw new Error(
      `Expected the workflow to succeed, but status is "${run.status}"` +
        (failed ? ` (node "${failed}")` : '') +
        (detail ? `: ${detail}` : ''),
    );
  }
}

/**
 * Read a node's output items for one run and output branch (default `0`).
 * Returns `[]` if the node did not run or produced nothing on that branch.
 */
export function getNodeOutput(run: IRun, nodeName: string, branch = 0): INodeExecutionData[] {
  return run.data.resultData.runData[nodeName]?.[0]?.data?.main?.[branch] ?? [];
}
