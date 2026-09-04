import type { IRun } from 'n8n-workflow';

import type { WorkflowDefinition } from './workflow-builder.js';

/** Options for {@link runWorkflowInFullInstance}. */
export interface RunInFullInstanceOptions {
  /** `n8nio/n8n` image tag to run. */
  image?: string;
}

/**
 * Full tier: boot the official `n8nio/n8n` image via `testcontainers`, import
 * and execute the workflow, and return an `IRun` shaped like {@link runWorkflow}'s.
 *
 * Not implemented yet — tracked in issue #12. The container orchestration plus
 * n8n's import/execute path (and mapping its output back to `IRun`) is a
 * self-contained piece of work that also can't be verified without Docker, so it
 * is deliberately split out rather than shipped unverified. Use {@link runWorkflow}
 * (fast, in-process) meanwhile.
 */
export function runWorkflowInFullInstance(
  _workflowDefinition: WorkflowDefinition,
  _options?: RunInFullInstanceOptions,
): Promise<IRun> {
  return Promise.reject(
    new Error(
      'runWorkflowInFullInstance is not implemented yet. Use runWorkflow for the ' +
        'in-process tier; the full Docker tier is tracked as a follow-up.',
    ),
  );
}
