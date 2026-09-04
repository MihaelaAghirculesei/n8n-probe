import { Example, HttpExample } from 'n8n-nodes-probe-example';
import { mockApi, setupMswForTest } from '@n8n-probe/mock-http';
import type { IExecuteFunctions, INodeExecutionData, INodeType } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
  expectWorkflowSuccess,
  getNodeOutput,
  ManualTrigger,
  nodeTypesFrom,
  runWorkflow,
  runWorkflowInFullInstance,
  workflow,
} from './index.js';

describe('@n8n-probe/e2e public surface', () => {
  it('exposes the documented entry points', () => {
    expect(typeof workflow).toBe('function');
    expect(typeof runWorkflow).toBe('function');
    expect(typeof runWorkflowInFullInstance).toBe('function');
    expect(typeof expectWorkflowSuccess).toBe('function');
    expect(typeof getNodeOutput).toBe('function');
    expect(typeof nodeTypesFrom).toBe('function');
    expect(typeof ManualTrigger).toBe('function');
  });
});

describe('workflow() builder', () => {
  it('builds nodes and a main connection', () => {
    const wf = workflow('demo')
      .addNode({ name: 'Start', type: 'manualTrigger' })
      .addNode({ name: 'Up', type: 'example', parameters: { field: 'name' } })
      .connect('Start', 'Up')
      .build();

    expect(wf.name).toBe('demo');
    expect(wf.nodes.map((n) => n.name)).toEqual(['Start', 'Up']);
    expect(wf.connections).toEqual({
      Start: { main: [[{ node: 'Up', type: 'main', index: 0 }]] },
    });
  });

  it('rejects duplicate names and unknown connect targets', () => {
    const b = workflow().addNode({ name: 'A', type: 'manualTrigger' });
    expect(() => b.addNode({ name: 'A', type: 'example' })).toThrow(/duplicate/);
    expect(() => b.connect('A', 'ghost')).toThrow(/unknown node "ghost"/);
  });
});

describe('runWorkflow (in-process)', () => {
  it('runs ManualTrigger -> Example and returns IRun', async () => {
    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger', parameters: { data: [{ name: 'ada' }] } })
      .addNode({ name: 'Up', type: 'example', parameters: { field: 'name' } })
      .connect('Start', 'Up')
      .build();

    const run = await runWorkflow(wf, { nodeTypes: [Example] });

    expectWorkflowSuccess(run);
    expect(getNodeOutput(run, 'Up').map((i) => i.json)).toEqual([{ name: 'ADA' }]);
  });

  it('propagates pairedItem along the chain', async () => {
    const wf = workflow()
      .addNode({
        name: 'Start',
        type: 'manualTrigger',
        parameters: { data: [{ name: 'a' }, { name: 'b' }] },
      })
      .addNode({ name: 'Up', type: 'example', parameters: { field: 'name' } })
      .connect('Start', 'Up')
      .build();

    const run = await runWorkflow(wf, { nodeTypes: [Example] });

    expectWorkflowSuccess(run);
    expect(getNodeOutput(run, 'Up').map((i) => i.pairedItem)).toEqual([{ item: 0 }, { item: 1 }]);
  });

  it('surfaces a node error through expectWorkflowSuccess', async () => {
    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger', parameters: { data: [{ name: 42 }] } })
      .addNode({ name: 'Up', type: 'example', parameters: { field: 'name' } })
      .connect('Start', 'Up')
      .build();

    const run = await runWorkflow(wf, { nodeTypes: [Example] });

    expect(() => expectWorkflowSuccess(run)).toThrow(/node "Up".*is not a string/s);
  });

  it('parses the ManualTrigger default data and resolves a package-qualified type', async () => {
    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger' }) // default data '[{}]' (a string)
      .addNode({ name: 'Up', type: 'n8n-nodes-probe-example.example', parameters: { field: 'x' } })
      .connect('Start', 'Up')
      .build();

    const run = await runWorkflow(wf, { nodeTypes: [Example] });

    // The package-qualified 'n8n-nodes-probe-example.example' type resolved and
    // the trigger parsed its default string data into one empty item.
    expect(getNodeOutput(run, 'Start')).toEqual([{ json: {}, pairedItem: { item: 0 } }]);
  });

  it('reports a missing credential clearly', async () => {
    class NoCred {
      description = {
        displayName: 'X',
        name: 'noCred',
        group: ['transform'],
        version: 1,
        description: '',
        defaults: { name: 'X' },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [{ name: 'absent', required: true }],
        properties: [],
      } as INodeType['description'];
      async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        await this.getCredentials('absent');
        return [[]];
      }
    }

    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger' })
      .addNode({ name: 'C', type: 'noCred', credentials: { absent: { id: null, name: 'absent' } } })
      .connect('Start', 'C')
      .build();

    const run = await runWorkflow(wf, { nodeTypes: [NoCred] });
    expect(() => expectWorkflowSuccess(run)).toThrow(/no credentials provided for type "absent"/);
  });

  it('getNodeOutput returns [] for a node that did not run', async () => {
    const wf = workflow().addNode({ name: 'Start', type: 'manualTrigger' }).build();
    const run = await runWorkflow(wf);
    expect(getNodeOutput(run, 'Nope')).toEqual([]);
  });

  it('throws a clear error for an unregistered node type', async () => {
    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger' })
      .addNode({ name: 'X', type: 'mystery' })
      .connect('Start', 'X')
      .build();

    await expect(runWorkflow(wf)).rejects.toThrow(/no node type registered for "mystery"/);
  });

  it('passes credentials through to a node', async () => {
    class NeedsAuth implements INodeType {
      description = {
        displayName: 'Needs Auth',
        name: 'needsAuth',
        group: ['transform'],
        version: 1,
        description: '',
        defaults: { name: 'Needs Auth' },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [{ name: 'testApi', required: true }],
        properties: [],
      } as INodeType['description'];

      async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const creds = await this.getCredentials('testApi');
        return [[{ json: { key: creds.apiKey } }]];
      }
    }

    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger' })
      .addNode({
        name: 'Auth',
        type: 'needsAuth',
        credentials: { testApi: { id: '1', name: 'my testApi' } },
      })
      .connect('Start', 'Auth')
      .build();

    const run = await runWorkflow(wf, {
      nodeTypes: [NeedsAuth],
      credentials: { testApi: { apiKey: 'k-9' } },
    });

    expectWorkflowSuccess(run);
    expect(getNodeOutput(run, 'Auth').map((i) => i.json)).toEqual([{ key: 'k-9' }]);
  });
});

describe('runWorkflow + mock-http', () => {
  const server = setupMswForTest();

  it("intercepts a node's real HTTP call via MSW", async () => {
    server.use(
      ...mockApi()
        .get('https://api.example.test/widgets')
        .reply(200, [{ id: 7 }])
        .handlers(),
    );

    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger' })
      .addNode({
        name: 'Fetch',
        type: 'httpExample',
        parameters: { url: 'https://api.example.test/widgets' },
      })
      .connect('Start', 'Fetch')
      .build();

    const run = await runWorkflow(wf, { nodeTypes: [HttpExample] });

    expectWorkflowSuccess(run);
    expect(getNodeOutput(run, 'Fetch').map((i) => i.json)).toEqual([{ id: 7 }]);
  });
});

describe('runWorkflowInFullInstance', () => {
  it('rejects with a not-implemented message for now', async () => {
    await expect(runWorkflowInFullInstance(workflow().build())).rejects.toThrow(/not implemented/);
  });
});
