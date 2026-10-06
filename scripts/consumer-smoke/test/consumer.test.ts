import { createMockExecuteFunctions, itemsFrom } from '@n8n-probe/core';
import {
  DEFAULT_N8N_IMAGE,
  expectWorkflowSuccess,
  getNodeOutput,
  runWorkflow,
  runWorkflowInFullInstance,
  workflow,
} from '@n8n-probe/e2e';
import { instrument } from '@n8n-probe/metrics';
import { mockApi, setupMswForTest } from '@n8n-probe/mock-http';
import { createTestTracing, expectSpan, traced } from '@n8n-probe/otel';
import { executeNode, expectNodeError, expectNodeOutput } from '@n8n-probe/unit';
import { NodeOperationError } from 'n8n-workflow';
import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

class Upper implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Upper',
    name: 'upper',
    group: ['transform'],
    version: 1,
    description: 'Uppercases one field',
    defaults: { name: 'Upper' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [{ displayName: 'Field', name: 'field', type: 'string', default: '' }],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const field = this.getNodeParameter('field', 0) as string;
    return [
      this.getInputData().map((item, index) => {
        const value = item.json[field];
        if (typeof value !== 'string') {
          throw new NodeOperationError(this.getNode(), `"${field}" is not a string`);
        }
        return {
          json: { ...item.json, [field]: value.toUpperCase() } as IDataObject,
          pairedItem: { item: index },
        };
      }),
    ];
  }
}

describe('@n8n-probe/* installed from tarballs, outside the monorepo', () => {
  const server = setupMswForTest();

  it('core + unit run a node and keep NodeOperationError identity', async () => {
    expect(createMockExecuteFunctions().getNode().name).toBe('Test Node');

    const result = await executeNode(Upper, {
      input: itemsFrom([{ name: 'ada' }]),
      params: { field: 'name' },
    });
    expectNodeOutput(result, [{ name: 'ADA' }]);

    await expectNodeError(
      executeNode(Upper, { input: itemsFrom([{ name: 1 }]), params: { field: 'name' } }),
      { instanceOf: NodeOperationError, message: 'not a string' },
    );
  });

  it('e2e fast tier evaluates expressions', async () => {
    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger', parameters: { data: [{ n: 'x', f: 'n' }] } })
      .addNode({ name: 'Up', type: 'pkg.upper', parameters: { field: '={{ $json.f }}' } })
      .connect('Start', 'Up')
      .build();

    const run = await runWorkflow(wf, { nodeTypes: [Upper] });

    expectWorkflowSuccess(run);
    expect(getNodeOutput(run, 'Up').map((i) => i.json)).toEqual([{ n: 'X', f: 'n' }]);
    expect(DEFAULT_N8N_IMAGE).toMatch(/^n8nio\/n8n:/);
  });

  it('e2e full tier names the missing optional peer', async () => {
    const wf = workflow().addNode({ name: 'Start', type: 'manualTrigger' }).build();
    await expect(runWorkflowInFullInstance(wf)).rejects.toThrow(/testcontainers/);
  });

  it('otel + metrics wrap an execution', async () => {
    const tracing = createTestTracing();
    const execute = traced(async function (this: IExecuteFunctions) {
      instrument('upper').recordExecution('success', 0.01);
      return [[]];
    });

    await execute.call(createMockExecuteFunctions());

    expectSpan(tracing.getSpans(), { name: 'n8n.node.execute' });
    await tracing.shutdown();
  });

  it('mock-http intercepts fetch', async () => {
    server.use(...mockApi().get('https://api.test/x').reply(200, { ok: true }).handlers());
    await expect(fetch('https://api.test/x').then((r) => r.json())).resolves.toEqual({ ok: true });
  });
});
