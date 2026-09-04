import { createMockExecuteFunctions, itemsFrom } from '@n8n-probe/core';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { IExecuteFunctions } from 'n8n-workflow';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestTracing, expectSpan, initTracing, NODE_EXECUTE_SPAN, traced } from './index.js';
import type { TestTracing } from './index.js';

describe('@n8n-probe/otel public surface', () => {
  it('exposes the documented entry points', () => {
    expect(typeof initTracing).toBe('function');
    expect(typeof traced).toBe('function');
    expect(typeof expectSpan).toBe('function');
    expect(typeof createTestTracing).toBe('function');
    expect(NODE_EXECUTE_SPAN).toBe('n8n.node.execute');
  });
});

describe('initTracing', () => {
  afterEach(() => {
    // initTracing registers a global provider; detach it so later suites can
    // register their own in-memory one.
    trace.disable();
  });

  it('returns a shutdown() that resolves (console exporter)', async () => {
    const shutdown = initTracing({ serviceName: 'test', exporter: 'console' });
    await expect(shutdown()).resolves.toBeUndefined();
  });

  it('accepts the otlp-http exporter with a custom endpoint', async () => {
    const shutdown = initTracing({
      serviceName: 'test',
      exporter: 'otlp-http',
      otlpEndpoint: 'http://localhost:4318/v1/traces',
    });
    await expect(shutdown()).resolves.toBeUndefined();
  });
});

describe('traced', () => {
  let tracing: TestTracing;

  beforeEach(() => {
    tracing = createTestTracing();
  });
  afterEach(async () => {
    await tracing.shutdown();
  });

  it('records an n8n.node.execute span with node metadata', async () => {
    const ctx = createMockExecuteFunctions({
      node: { name: 'Upper', type: 'n8n-probe.example', typeVersion: 2 },
      input: itemsFrom([{ a: 1 }, { a: 2 }]),
    });

    const execute = traced(function (this: IExecuteFunctions) {
      return Promise.resolve([this.getInputData()]);
    });

    await execute.call(ctx);

    expectSpan(tracing.getSpans(), {
      name: NODE_EXECUTE_SPAN,
      attributes: {
        'n8n.node.type': 'n8n-probe.example',
        'n8n.node.name': 'Upper',
        'n8n.node.type_version': 2,
        'n8n.item.count': 2,
      },
    });
  });

  it('records the workflow and execution id when the context exposes them', async () => {
    const ctx = createMockExecuteFunctions();
    ctx.getWorkflow.mockReturnValue({ id: 'wf-1', name: 'demo', active: false });
    ctx.getExecutionId.mockReturnValue('exec-9');

    await traced(() => Promise.resolve(null)).call(ctx);

    expectSpan(tracing.getSpans(), {
      name: NODE_EXECUTE_SPAN,
      attributes: { 'n8n.workflow.id': 'wf-1', 'n8n.execution.id': 'exec-9' },
    });
  });

  it('passes the return value through unchanged', async () => {
    const ctx = createMockExecuteFunctions();
    const execute = traced(() => Promise.resolve('result'));

    await expect(execute.call(ctx)).resolves.toBe('result');
    expect(tracing.getSpans()).toHaveLength(1);
  });

  it('records the exception and error status, then rethrows', async () => {
    const ctx = createMockExecuteFunctions();
    const boom = new Error('kaboom');
    const execute = traced(() => Promise.reject(boom));

    await expect(execute.call(ctx)).rejects.toBe(boom);

    const [span] = tracing.getSpans();
    expect(span?.status.code).toBe(SpanStatusCode.ERROR);
    expect(span?.status.message).toBe('kaboom');
    expect(span?.events.map((e) => e.name)).toContain('exception');
  });

  it('tolerates a context that is not a full IExecuteFunctions', async () => {
    const execute = traced(() => Promise.resolve('ok'));
    await expect(execute.call({} as never)).resolves.toBe('ok');
    expect(tracing.getSpans()).toHaveLength(1);
  });

  it('reset() clears recorded spans', async () => {
    const execute = traced(() => Promise.resolve(null));
    await execute.call(createMockExecuteFunctions());
    expect(tracing.getSpans()).toHaveLength(1);

    tracing.reset();
    expect(tracing.getSpans()).toHaveLength(0);
  });
});

describe('expectSpan', () => {
  let tracing: TestTracing;
  beforeEach(() => {
    tracing = createTestTracing();
  });
  afterEach(async () => {
    await tracing.shutdown();
  });

  it('throws when no span has the name', () => {
    expect(() => expectSpan(tracing.getSpans(), { name: 'nope' })).toThrow(/no span named "nope"/);
  });

  it('passes on a name-only match', async () => {
    const execute = traced(() => Promise.resolve(null));
    await execute.call(createMockExecuteFunctions());
    expect(() => expectSpan(tracing.getSpans(), { name: NODE_EXECUTE_SPAN })).not.toThrow();
  });

  it('throws when the name matches but attributes do not', async () => {
    const execute = traced(() => Promise.resolve(null));
    await execute.call(createMockExecuteFunctions({ node: { type: 'x' } }));

    expect(() =>
      expectSpan(tracing.getSpans(), {
        name: NODE_EXECUTE_SPAN,
        attributes: { 'n8n.node.type': 'y' },
      }),
    ).toThrow(/none matched attributes/);
  });
});
