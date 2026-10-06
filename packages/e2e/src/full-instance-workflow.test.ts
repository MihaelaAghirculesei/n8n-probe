import type { IRun } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
  INJECTED_TRIGGER_NAME,
  N8N_MANUAL_TRIGGER,
  parseExecuteOutput,
  stripInjectedTrigger,
  toFullInstanceWorkflow,
} from './full-instance-workflow.js';
import { runWorkflowInFullInstance } from './full-instance.js';
import { workflow } from './workflow-builder.js';

const EXAMPLE = 'n8n-nodes-probe-example.example';

describe('toFullInstanceWorkflow', () => {
  it('maps a data-less manualTrigger onto n8n-nodes-base.manualTrigger', () => {
    const wf = workflow('plain')
      .addNode({ name: 'Start', type: 'manualTrigger' })
      .addNode({ name: 'Up', type: EXAMPLE, parameters: { field: 'name' } })
      .connect('Start', 'Up')
      .build();

    const { json, seededNodeName } = toFullInstanceWorkflow(wf, 'abc123');

    expect(seededNodeName).toBeUndefined();
    expect(json).toMatchObject({ id: 'abc123', name: 'plain', active: false });
    expect(json.nodes.map((n) => [n.name, n.type])).toEqual([
      ['Start', N8N_MANUAL_TRIGGER],
      ['Up', EXAMPLE],
    ]);
    expect(json.connections).toEqual(wf.connections);
  });

  it('seeds trigger data through a Code node behind an injected trigger', () => {
    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger', parameters: { data: '[{"a":1},"x"]' } })
      .addNode({ name: 'Up', type: EXAMPLE })
      .connect('Start', 'Up')
      .build();

    const { json, seededNodeName } = toFullInstanceWorkflow(wf, 'id');

    expect(seededNodeName).toBe('Start');
    const start = json.nodes.find((n) => n.name === 'Start');
    expect(start?.type).toBe('n8n-nodes-base.code');
    expect(start?.parameters).toEqual({
      jsCode: 'return [{"a":1},{}].map((json) => ({ json }));',
    });
    expect(json.nodes.find((n) => n.name === INJECTED_TRIGGER_NAME)?.type).toBe(N8N_MANUAL_TRIGGER);
    expect(json.connections[INJECTED_TRIGGER_NAME]).toEqual({
      main: [[{ node: 'Start', type: 'main', index: 0 }]],
    });
    // The caller's definition is left untouched.
    expect(wf.nodes[0]?.type).toBe('manualTrigger');
    expect(wf.connections[INJECTED_TRIGGER_NAME]).toBeUndefined();
  });

  it('accepts a single object as trigger data', () => {
    const wf = workflow()
      .addNode({ name: 'Start', type: N8N_MANUAL_TRIGGER, parameters: { data: { a: 1 } } })
      .build();

    const start = toFullInstanceWorkflow(wf, 'id').json.nodes.find((n) => n.name === 'Start');
    expect(start?.parameters.jsCode).toBe('return [{"a":1}].map((json) => ({ json }));');
  });

  it('requires exactly one manual trigger', () => {
    const none = workflow().addNode({ name: 'Up', type: EXAMPLE }).build();
    const two = workflow()
      .addNode({ name: 'A', type: 'manualTrigger' })
      .addNode({ name: 'B', type: 'manualTrigger' })
      .build();

    expect(() => toFullInstanceWorkflow(none, 'id')).toThrow(/exactly one manual trigger.*found 0/);
    expect(() => toFullInstanceWorkflow(two, 'id')).toThrow(/found 2/);
  });

  it('rejects bare node types a real instance cannot resolve', () => {
    const wf = workflow()
      .addNode({ name: 'Start', type: 'manualTrigger' })
      .addNode({ name: 'Up', type: 'example' })
      .build();

    expect(() => toFullInstanceWorkflow(wf, 'id')).toThrow(/package-qualified.*"Up" \(example\)/);
  });
});

describe('parseExecuteOutput', () => {
  const runJson = JSON.stringify(
    {
      data: { resultData: { runData: { Up: [] } } },
      mode: 'cli',
      startedAt: '2026-10-05T17:57:33.259Z',
      stoppedAt: '2026-10-05T17:57:34.766Z',
      status: 'success',
      finished: true,
    },
    null,
    2,
  );

  it('extracts the run from between n8n log lines and restores its dates', () => {
    const stdout = [
      'n8n Task Broker ready on 127.0.0.1, port 5679',
      'Registered runner "JS Task Runner"',
      runJson,
      'Error: something logged after the run',
      '}',
    ].join('\n');

    const run = parseExecuteOutput(stdout);

    expect(run?.status).toBe('success');
    expect(run?.startedAt).toEqual(new Date('2026-10-05T17:57:33.259Z'));
    expect(run?.stoppedAt).toEqual(new Date('2026-10-05T17:57:34.766Z'));
  });

  it('handles CRLF output', () => {
    expect(parseExecuteOutput(runJson.replace(/\n/g, '\r\n'))?.mode).toBe('cli');
  });

  it('returns undefined when no run was printed', () => {
    expect(parseExecuteOutput('Unrecognized node type: x\n')).toBeUndefined();
    expect(parseExecuteOutput('{\n  "truncated": true')).toBeUndefined();
  });
});

describe('stripInjectedTrigger', () => {
  const run = (): IRun =>
    ({
      data: {
        resultData: {
          runData: {
            [INJECTED_TRIGGER_NAME]: [{ source: [] }],
            Start: [{ source: [{ previousNode: INJECTED_TRIGGER_NAME }] }],
          },
        },
      },
    }) as unknown as IRun;

  it('removes the injected trigger and its edge into the seeded node', () => {
    const stripped = stripInjectedTrigger(run(), 'Start');
    expect(Object.keys(stripped.data.resultData.runData)).toEqual(['Start']);
    expect(stripped.data.resultData.runData.Start?.[0]?.source).toEqual([]);
  });

  it('leaves a run without an injected trigger alone', () => {
    const original = run();
    expect(stripInjectedTrigger(original, undefined)).toBe(original);
    expect(Object.keys(original.data.resultData.runData)).toHaveLength(2);
  });
});

describe('runWorkflowInFullInstance', () => {
  it('rejects an invalid workflow before booting a container', async () => {
    const wf = workflow().addNode({ name: 'Up', type: EXAMPLE }).build();
    await expect(runWorkflowInFullInstance(wf)).rejects.toThrow(/exactly one manual trigger/);
  });
});
