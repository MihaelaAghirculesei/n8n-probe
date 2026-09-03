import type {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import { Example } from 'n8n-nodes-probe-example';

import { executeNode, expectNodeError, expectNodeOutput, NodeNotExecutableError } from './index.js';

/** Minimal valid `INodeTypeDescription`, overridable per fixture. */
function makeDescription(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
  return {
    displayName: 'Fixture',
    name: 'fixture',
    group: ['transform'],
    version: 1,
    description: 'test fixture',
    defaults: { name: 'Fixture' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [],
    ...overrides,
  };
}

describe('executeNode', () => {
  it('runs a programmatic node and returns its output branches', async () => {
    const result = await executeNode(Example, {
      input: [{ json: { name: 'ada' } }],
      params: { field: 'name' },
    });

    expect(result).toEqual([[{ json: { name: 'ADA' }, pairedItem: { item: 0 } }]]);
  });

  it('reads params from the `node` override as well as `params`', async () => {
    const result = await executeNode(Example, {
      input: [{ json: { title: 'grace' } }],
      node: { parameters: { field: 'title' } },
    });

    expectNodeOutput(result, [{ title: 'GRACE' }]);
  });

  it('propagates pairedItem for every produced item', async () => {
    const result = await executeNode(Example, {
      input: [{ json: { name: 'a' } }, { json: { name: 'b' } }],
      params: { field: 'name' },
    });

    expect(result[0]?.map((item) => item.pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
  });

  it('lets the node throw when continueOnFail is off (the default)', async () => {
    await expectNodeError(
      executeNode(Example, { input: [{ json: { name: 42 } }], params: { field: 'name' } }),
      { instanceOf: NodeOperationError, message: /is not a string/ },
    );
  });

  it('routes failures to the output when continueOnFail is on', async () => {
    const result = await executeNode(Example, {
      input: [{ json: { name: 'ada' } }, { json: { name: 7 } }],
      params: { field: 'name' },
      continueOnFail: true,
    });

    expect(result[0]).toHaveLength(2);
    expect(result[0]?.[0]?.json).toEqual({ name: 'ADA' });
    expect(result[0]?.[1]?.json).toEqual({ name: 7 });
    expect(result[0]?.[1]?.error).toBeInstanceOf(NodeOperationError);
  });

  it('defaults typeVersion to the highest the description declares', async () => {
    class Versioned implements INodeType {
      description = makeDescription({ version: [1, 2, 3] });
      execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return Promise.resolve([[{ json: { typeVersion: this.getNode().typeVersion } }]]);
      }
    }

    const result = await executeNode(Versioned, {});
    expectNodeOutput(result, [{ typeVersion: 3 }]);

    const pinned = await executeNode(Versioned, { node: { typeVersion: 1 } });
    expectNodeOutput(pinned, [{ typeVersion: 1 }]);
  });

  it('passes credentials through to getCredentials', async () => {
    class NeedsAuth implements INodeType {
      description = makeDescription();
      async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const creds = await this.getCredentials('testApi');
        return [[{ json: { ...creds } }]];
      }
    }

    const result = await executeNode(NeedsAuth, {
      credentials: { testApi: { apiKey: 'k-123' } },
    });
    expectNodeOutput(result, [{ apiKey: 'k-123' }]);
  });

  it('returns every output branch', async () => {
    class TwoBranches implements INodeType {
      description = makeDescription({ outputs: ['main', 'main'] });
      execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return Promise.resolve([[{ json: { side: 'left' } }], [{ json: { side: 'right' } }]]);
      }
    }

    const result = await executeNode(TwoBranches, {});
    expect(result).toHaveLength(2);
    expectNodeOutput(result, [{ side: 'left' }]);
    expectNodeOutput(result, [{ side: 'right' }], 1);
  });

  it('normalises a null return to no branches', async () => {
    class Empty implements INodeType {
      description = makeDescription();
      execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return Promise.resolve(null as unknown as INodeExecutionData[][]);
      }
    }

    await expect(executeNode(Empty, {})).resolves.toEqual([]);
  });

  it('rejects a declarative/routing node with a clear error', async () => {
    class Declarative implements INodeType {
      description = makeDescription({
        requestDefaults: { baseURL: 'https://api.example.test' },
      });
    }

    await expectNodeError(executeNode(Declarative, {}), {
      instanceOf: NodeNotExecutableError,
      message: /declarative\/routing node/,
    });
  });

  it('detects a declarative node by a property-level routing config', async () => {
    class RoutingProp implements INodeType {
      description = makeDescription({
        properties: [
          {
            displayName: 'Resource',
            name: 'resource',
            type: 'string',
            default: '',
            routing: { request: { method: 'GET', url: '/resource' } },
          },
        ],
      });
    }

    await expectNodeError(executeNode(RoutingProp, {}), {
      instanceOf: NodeNotExecutableError,
      message: /declarative\/routing node/,
    });
  });

  it('rejects a node that has no execute() method', async () => {
    class TriggerOnly implements INodeType {
      description = makeDescription();
    }

    await expectNodeError(executeNode(TriggerOnly, {}), {
      instanceOf: NodeNotExecutableError,
      message: /no execute\(\) method/,
    });
  });

  it('rejects a node that returns an EngineRequest', async () => {
    class Requester implements INodeType {
      description = makeDescription();
      execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        return Promise.resolve({ actions: [] } as unknown as INodeExecutionData[][]);
      }
    }

    await expectNodeError(executeNode(Requester, {}), {
      instanceOf: NodeNotExecutableError,
      message: /EngineRequest/,
    });
  });
});

describe('expectNodeOutput', () => {
  it('compares the chosen branch by json payload', () => {
    const result: INodeExecutionData[][] = [
      [{ json: { a: 1 } }, { json: { a: 2 } }],
      [{ json: { b: 9 } }],
    ];

    expectNodeOutput(result, [{ a: 1 }, { a: 2 }]);
    expectNodeOutput(result, [{ b: 9 }], 1);
  });

  it('treats a missing branch as empty', () => {
    expectNodeOutput([], []);
    expectNodeOutput([[{ json: { a: 1 } }]], [], 5);
  });

  it('fails on a mismatch', () => {
    expect(() => expectNodeOutput([[{ json: { a: 1 } }]], [{ a: 2 }])).toThrow();
  });
});

describe('expectNodeError', () => {
  it('passes when the promise rejects and the matcher is satisfied', async () => {
    await expectNodeError(Promise.reject(new TypeError('bad input value')), {
      instanceOf: TypeError,
      message: 'bad input',
    });
    await expectNodeError(Promise.reject(new Error('code 429 rate limited')), {
      message: /\d{3} rate limited/,
    });
  });

  it('throws when the promise resolves', async () => {
    await expect(expectNodeError(Promise.resolve('ok'))).rejects.toThrow(/resolved successfully/);
  });

  it('throws when the type does not match', async () => {
    await expect(
      expectNodeError(Promise.reject(new Error('nope')), { instanceOf: TypeError }),
    ).rejects.toThrow(/instance of TypeError/);
  });

  it('throws when the message does not match', async () => {
    await expect(
      expectNodeError(Promise.reject(new Error('actual message')), { message: 'expected' }),
    ).rejects.toThrow(/Expected the rejection message to contain "expected"/);
  });
});
