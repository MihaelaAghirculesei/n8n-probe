export { workflow } from './workflow-builder.js';
export type { WorkflowBuilder, WorkflowDefinition, WorkflowNodeSpec } from './workflow-builder.js';

export { ManualTrigger, nodeTypesFrom } from './node-types.js';
export type { NodeTypeClass } from './node-types.js';

export { runWorkflow } from './run-workflow.js';
export type { RunWorkflowOptions } from './run-workflow.js';

export { DEFAULT_N8N_IMAGE, runWorkflowInFullInstance, startN8nInstance } from './full-instance.js';
export type { N8nInstance, RunInFullInstanceOptions } from './full-instance.js';

export { expectWorkflowSuccess, getNodeOutput } from './assertions.js';
