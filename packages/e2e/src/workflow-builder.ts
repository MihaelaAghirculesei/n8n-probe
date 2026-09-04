import type { IConnections, INode, INodeParameters, IWorkflowSettings } from 'n8n-workflow';

/** A node to add to a workflow under construction. `type` is a node-type name. */
export interface WorkflowNodeSpec {
  name: string;
  type: string;
  typeVersion?: number;
  parameters?: INodeParameters;
  position?: [number, number];
  credentials?: INode['credentials'];
}

/**
 * The subset of an n8n workflow the toolkit needs: enough to construct a
 * `Workflow` for the in-process runner and to POST to a real instance's REST
 * API. A structural subset of `IWorkflowBase` (no DB-entity fields).
 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: INode[];
  connections: IConnections;
  active: boolean;
  settings: IWorkflowSettings;
}

/** Fluent builder producing a {@link WorkflowDefinition}. */
export interface WorkflowBuilder {
  /** Add a node. Names must be unique within the workflow. */
  addNode(node: WorkflowNodeSpec): WorkflowBuilder;
  /**
   * Wire the `main` output of `from` to the `main` input of `to`. Call order
   * sets the connection index, so the first `connect(x, …)` is `x`'s output 0.
   */
  connect(from: string, to: string, fromOutput?: number, toInput?: number): WorkflowBuilder;
  build(): WorkflowDefinition;
}

/** Start building a workflow: `workflow().addNode(…).connect(a, b).build()`. */
export function workflow(name = 'test workflow'): WorkflowBuilder {
  const nodes: INode[] = [];
  const connections: IConnections = {};

  const builder: WorkflowBuilder = {
    addNode(spec) {
      if (nodes.some((n) => n.name === spec.name)) {
        throw new Error(`workflow(): duplicate node name "${spec.name}"`);
      }
      const node: INode = {
        id: spec.name,
        name: spec.name,
        type: spec.type,
        typeVersion: spec.typeVersion ?? 1,
        position: spec.position ?? [nodes.length * 220, 0],
        parameters: spec.parameters ?? {},
      };
      if (spec.credentials) node.credentials = spec.credentials;
      nodes.push(node);
      return builder;
    },

    connect(from, to, fromOutput = 0, toInput = 0) {
      for (const name of [from, to]) {
        if (!nodes.some((n) => n.name === name)) {
          throw new Error(`workflow(): connect() references unknown node "${name}"`);
        }
      }
      const nodeConnections = (connections[from] ??= {});
      const main = (nodeConnections.main ??= []);
      while (main.length <= fromOutput) main.push([]);
      const slot = (main[fromOutput] ??= []);
      slot.push({ node: to, type: 'main', index: toInput });
      return builder;
    },

    build() {
      return { id: 'wf', name, nodes, connections, active: false, settings: {} };
    },
  };

  return builder;
}
