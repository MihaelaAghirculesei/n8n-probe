import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypes,
  INodeTypeDescription,
} from 'n8n-workflow';

/** Constructor of an n8n node type. */
export type NodeTypeClass = new () => INodeType;

/**
 * A minimal start node so a workflow can be self-contained without pulling in
 * `n8n-nodes-base`. Emits the items configured in its `data` parameter (an array
 * of plain objects; default one empty item), like n8n's own Manual Trigger in a
 * manual run.
 */
export class ManualTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Manual Trigger',
    name: 'manualTrigger',
    group: ['trigger'],
    version: 1,
    description: 'Starts the workflow with a fixed set of items',
    defaults: { name: 'When clicking Test workflow' },
    inputs: [],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Data',
        name: 'data',
        type: 'json',
        default: '[{}]',
        description: 'Array of JSON objects to emit as the first items',
      },
    ],
  };

  execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    let data = this.getNodeParameter('data', 0, [{}]) as unknown;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = [{}];
      }
    }
    const rows = Array.isArray(data) ? (data as unknown[]) : [data];
    return Promise.resolve([
      rows.map((json, item) => ({
        json: (json && typeof json === 'object' ? json : {}) as IDataObject,
        pairedItem: { item },
      })),
    ]);
  }
}

/**
 * Build an `INodeTypes` registry from node classes, resolving a workflow node's
 * `type` by its `description.name` (a package-qualified `pkg.name` also matches
 * on the bare `name`). {@link ManualTrigger} is always registered.
 */
export function nodeTypesFrom(classes: readonly NodeTypeClass[]): INodeTypes {
  const byName = new Map<string, INodeType>();
  for (const NodeClass of [ManualTrigger, ...classes]) {
    const instance = new NodeClass();
    byName.set(instance.description.name, instance);
  }

  const resolve = (type: string): INodeType => {
    const found = byName.get(type) ?? byName.get(type.split('.').pop() ?? type);
    if (!found) {
      throw new Error(
        `@n8n-probe/e2e: no node type registered for "${type}". ` +
          `Pass its class via runWorkflow(wf, { nodeTypes: [...] }). ` +
          `Registered: ${[...byName.keys()].join(', ')}.`,
      );
    }
    return found;
  };

  return {
    getByName: resolve,
    getByNameAndVersion: (type) => resolve(type),
    getKnownTypes: () => ({}),
  };
}
