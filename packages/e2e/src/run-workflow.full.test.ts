import { createRequire } from 'node:module';
import { dirname } from 'node:path';

import { Example } from 'n8n-nodes-probe-example';
import type { INodeParameters } from 'n8n-workflow';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  expectWorkflowSuccess,
  getNodeOutput,
  runWorkflow,
  runWorkflowInFullInstance,
  startN8nInstance,
  workflow,
} from './index.js';
import type { N8nInstance, WorkflowDefinition } from './index.js';

// Full tier: only runs under `pnpm test:e2e:full`; needs a Docker daemon and a
// built `apps/example-node` (turbo builds it first as a dependency).
const examplePackage = dirname(
  createRequire(import.meta.url).resolve('n8n-nodes-probe-example/package.json'),
);

const uppercase = (data?: INodeParameters['data']): WorkflowDefinition =>
  workflow('full tier')
    .addNode({ name: 'Start', type: 'manualTrigger', ...(data ? { parameters: { data } } : {}) })
    .addNode({
      name: 'Up',
      type: 'n8n-nodes-probe-example.example',
      parameters: { field: 'name' },
    })
    .connect('Start', 'Up')
    .build();

describe('startN8nInstance', () => {
  let n8n: N8nInstance | undefined;

  beforeAll(async () => {
    n8n = await startN8nInstance({ nodePackages: [examplePackage] });
  }, 300_000);

  afterAll(async () => {
    await n8n?.stop();
  });

  it('runs a custom node inside a real n8n and matches the in-process tier', async () => {
    const wf = uppercase([{ name: 'ada' }, { name: 'bob' }]);

    const full = await n8n!.run(wf);
    const fast = await runWorkflow(wf, { nodeTypes: [Example] });

    expectWorkflowSuccess(full);
    expect(full.status).toBe('success');
    expect(full.startedAt).toBeInstanceOf(Date);
    expect(Object.keys(full.data.resultData.runData).sort()).toEqual(['Start', 'Up']);
    expect(getNodeOutput(full, 'Up')).toEqual(getNodeOutput(fast, 'Up'));
  });

  it('returns the failed run, not a rejection, when a node errors', async () => {
    // n8n's own Manual Trigger emits one empty item, which has no "name" field.
    const run = await n8n!.run(uppercase());

    expect(run.status).toBe('error');
    expect(() => expectWorkflowSuccess(run)).toThrow(/node "Up".*not a string/);
  });
});

describe('startN8nInstance run timeout', () => {
  it('rejects the slow run and refuses further runs on that instance', async () => {
    const n8n = await startN8nInstance({ nodePackages: [examplePackage], runTimeoutMs: 1 });
    try {
      await expect(n8n.run(uppercase([{ name: 'x' }]))).rejects.toThrow(
        /did not finish within 1 ms/,
      );
      await expect(n8n.run(uppercase([{ name: 'y' }]))).rejects.toThrow(/timed out; stop\(\) it/);
    } finally {
      await n8n.stop();
    }
  }, 300_000);
});

describe('runWorkflowInFullInstance', () => {
  it('boots, runs and tears down in one call', async () => {
    const run = await runWorkflowInFullInstance(uppercase([{ name: 'cy' }]), {
      nodePackages: [examplePackage],
    });

    expectWorkflowSuccess(run);
    expect(getNodeOutput(run, 'Up').map((item) => item.json)).toEqual([{ name: 'CY' }]);
  }, 300_000);
});
