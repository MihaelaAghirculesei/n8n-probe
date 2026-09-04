import { createServer } from 'node:net';

import { metrics } from '@opentelemetry/api';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DURATION_HISTOGRAM, EXECUTIONS_COUNTER, initMetrics, instrument } from './index.js';

/** An OS-assigned free TCP port. */
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

describe('@n8n-probe/metrics public surface', () => {
  it('exposes the documented entry points', () => {
    expect(typeof initMetrics).toBe('function');
    expect(typeof instrument).toBe('function');
    expect(EXECUTIONS_COUNTER).toBe('n8n_node_executions');
    expect(DURATION_HISTOGRAM).toBe('n8n_node_execution_duration_seconds');
  });

  it('instrument() before initMetrics() is a no-op', () => {
    expect(() => instrument('x').recordExecution('success', 0.1)).not.toThrow();
  });
});

describe('initMetrics + instrument', () => {
  let port: number;
  let shutdown: () => Promise<void>;

  const scrape = async (path = '/metrics'): Promise<Response> =>
    fetch(`http://127.0.0.1:${port}${path}`);

  beforeEach(async () => {
    port = await freePort();
    shutdown = await initMetrics({ port, endpoint: '/metrics' });
  });

  afterEach(async () => {
    await shutdown();
    metrics.disable();
  });

  it('serves the executions counter and duration histogram in Prometheus format', async () => {
    const m = instrument('n8n-nodes-probe-example.example');
    m.recordExecution('success', 0.25);
    m.recordExecution('success', 0.75);

    const body = await (await scrape()).text();

    expect(body).toMatch(
      /n8n_node_executions_total\{[^}]*node_type="n8n-nodes-probe-example\.example"[^}]*status="success"[^}]*\}\s+2/,
    );
    expect(body).toContain('n8n_node_execution_duration_seconds_count{');
    expect(body).toMatch(/n8n_node_execution_duration_seconds_sum\{[^}]*\}\s+1\b/);
    expect(body).toContain('n8n_node_execution_duration_seconds_bucket{');
  });

  it('keeps a separate series per node type and status', async () => {
    instrument('a').recordExecution('success', 0.1);
    instrument('a').recordExecution('error', 0.2);
    instrument('b').recordExecution('success', 0.3);

    const body = await (await scrape()).text();

    expect(body).toMatch(
      /n8n_node_executions_total\{[^}]*node_type="a"[^}]*status="success"[^}]*\}\s+1/,
    );
    expect(body).toMatch(
      /n8n_node_executions_total\{[^}]*node_type="a"[^}]*status="error"[^}]*\}\s+1/,
    );
    expect(body).toMatch(
      /n8n_node_executions_total\{[^}]*node_type="b"[^}]*status="success"[^}]*\}\s+1/,
    );
  });

  it('404s on any path other than the endpoint', async () => {
    const res = await scrape('/not-metrics');
    expect(res.status).toBe(404);
  });
});

describe('initMetrics defaults', () => {
  it('serves on /metrics when no endpoint is given', async () => {
    const port = await freePort();
    const shutdown = await initMetrics({ port });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/metrics`);
      expect(res.status).toBe(200);
    } finally {
      await shutdown();
      metrics.disable();
    }
  });
});
