// Milestone 7: dogfood every pillar of the toolkit against the real fixture
// nodes (not stubs), so the examples in each package README stay honest.
// `Example` (`@n8n-probe/unit`) and `HttpExample` (`@n8n-probe/mock-http`
// I/O + `@n8n-probe/otel` + `@n8n-probe/metrics`, since it's the node that
// wires the "single call site") each anchor the pillar(s) they exercise best;
// `@n8n-probe/e2e` chains both together with mock-http composed in.
//
// This suite lives in its own app rather than inside `apps/example-node` — see
// this package's README for why (a workspace dependency cycle through the
// fixture app's own devDependencies would break `turbo run build`).
import { createServer } from 'node:net';

import { expectWorkflowSuccess, getNodeOutput, runWorkflow, workflow } from '@n8n-probe/e2e';
import { createMockHttpExecuteFunctions, mockApi, setupMswForTest } from '@n8n-probe/mock-http';
import { initMetrics } from '@n8n-probe/metrics';
import { createTestTracing, expectSpan, NODE_EXECUTE_SPAN } from '@n8n-probe/otel';
import type { TestTracing } from '@n8n-probe/otel';
import { executeNode, expectNodeError, expectNodeOutput } from '@n8n-probe/unit';
import { http, passthrough } from 'msw';
import { Example, HttpExample } from 'n8n-nodes-probe-example';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const API = 'https://dogfood.example.test';

/** An OS-assigned free TCP port, so parallel test files never collide. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

describe('@n8n-probe/unit on Example', () => {
  it('uppercases the configured field', async () => {
    const result = await executeNode(Example, {
      input: [{ json: { name: 'ada' } }],
      params: { field: 'name' },
    });
    expectNodeOutput(result, [{ name: 'ADA' }]);
  });

  it('rejects a non-string field with a clear message', async () => {
    await expectNodeError(
      executeNode(Example, { input: [{ json: { name: 42 } }], params: { field: 'name' } }),
      { message: /is not a string/ },
    );
  });
});

describe('@n8n-probe/mock-http on HttpExample', () => {
  const server = setupMswForTest();

  it('drives the real HTTP call through MSW', async () => {
    server.use(
      ...mockApi()
        .get(`${API}/users`)
        .reply(200, [{ id: 1 }])
        .handlers(),
    );

    const ctx = createMockHttpExecuteFunctions({
      input: [{ json: {} }],
      params: { url: `${API}/users` },
    });
    const out = await new HttpExample().execute.call(ctx);

    expect(out[0]?.map((item) => item.json)).toEqual([{ id: 1 }]);
  });
});

describe('@n8n-probe/e2e chaining HttpExample -> Example', () => {
  const server = setupMswForTest();

  it('fetches JSON via HttpExample, then uppercases a field via Example', async () => {
    server.use(...mockApi().get(`${API}/profile`).reply(200, { name: 'grace' }).handlers());

    const wf = workflow('dogfood')
      .addNode({ name: 'Start', type: 'manualTrigger' })
      .addNode({ name: 'Fetch', type: 'httpExample', parameters: { url: `${API}/profile` } })
      .addNode({ name: 'Upper', type: 'example', parameters: { field: 'name' } })
      .connect('Start', 'Fetch')
      .connect('Fetch', 'Upper')
      .build();

    const run = await runWorkflow(wf, { nodeTypes: [Example, HttpExample] });

    expectWorkflowSuccess(run);
    expect(getNodeOutput(run, 'Upper').map((i) => i.json)).toEqual([{ name: 'GRACE' }]);
  });
});

describe('@n8n-probe/otel: HttpExample emits its own n8n.node.execute span', () => {
  const server = setupMswForTest();
  let tracing: TestTracing;

  beforeEach(() => {
    tracing = createTestTracing();
  });
  afterEach(async () => {
    await tracing.shutdown();
  });

  it('records the span through the node-owned tracedExecute wiring, not a test-side traced()', async () => {
    server.use(...mockApi().get(`${API}/ping`).reply(200, { ok: true }).handlers());

    const ctx = createMockHttpExecuteFunctions({
      node: { name: 'Fetch', type: 'httpExample' },
      input: [{ json: {} }],
      params: { url: `${API}/ping` },
    });

    await new HttpExample().execute.call(ctx);

    expectSpan(tracing.getSpans(), {
      name: NODE_EXECUTE_SPAN,
      attributes: { 'n8n.node.type': 'httpExample', 'n8n.node.name': 'Fetch' },
    });
  });
});

describe('@n8n-probe/metrics: HttpExample records success and error executions', () => {
  const server = setupMswForTest();
  let port: number;
  let shutdown: () => Promise<void>;

  beforeEach(async () => {
    port = await freePort();
    shutdown = await initMetrics({ port, endpoint: '/metrics' });
  });
  afterEach(async () => {
    await shutdown();
  });

  it('exposes node_type="httpExample" series for both outcomes', async () => {
    server.use(
      ...mockApi().get(`${API}/ok`).reply(200, { ok: true }).handlers(),
      ...mockApi().get(`${API}/missing`).reply(404, { message: 'nope' }).handlers(),
      // The Prometheus exposition scrape at the end of this test is a real,
      // local HTTP request that MSW would otherwise also intercept (and
      // reject, under the `onUnhandledRequest: 'error'` policy) — let it
      // through explicitly.
      http.get(`http://127.0.0.1:${port}/metrics`, () => passthrough()),
    );

    const okCtx = createMockHttpExecuteFunctions({
      input: [{ json: {} }],
      params: { url: `${API}/ok` },
    });
    await new HttpExample().execute.call(okCtx);

    const failCtx = createMockHttpExecuteFunctions({
      input: [{ json: {} }],
      params: { url: `${API}/missing`, maxRetries: 0 },
    });
    await expect(new HttpExample().execute.call(failCtx)).rejects.toThrow();

    const body = await (await fetch(`http://127.0.0.1:${port}/metrics`)).text();

    expect(body).toMatch(
      /n8n_node_executions_total\{[^}]*node_type="httpExample"[^}]*status="success"[^}]*\}\s+1/,
    );
    expect(body).toMatch(
      /n8n_node_executions_total\{[^}]*node_type="httpExample"[^}]*status="error"[^}]*\}\s+1/,
    );
  });
});
