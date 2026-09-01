import { NotImplementedError } from '@n8n-probe/core';

/** Options for {@link initMetrics}. */
export interface InitMetricsOptions {
  /** Port the Prometheus exposition endpoint listens on. Default `9464`. */
  port?: number;
  /** Path the metrics are served from. Default `/metrics`. */
  endpoint?: string;
}

/** Per-node-type recorder returned by {@link instrument}. */
export interface ExecutionInstrument {
  recordExecution(status: 'success' | 'error', durationSeconds: number): void;
}

/**
 * Start a `MeterProvider` with a `PrometheusExporter`. Returns an async
 * `shutdown()` that stops the endpoint.
 */
export function initMetrics(_options?: InitMetricsOptions): () => Promise<void> {
  throw new NotImplementedError('initMetrics');
}

/**
 * Get a recorder for a node type. `recordExecution` updates an executions
 * counter and a duration histogram, labelled by node type and status.
 */
export function instrument(_nodeType: string): ExecutionInstrument {
  throw new NotImplementedError('instrument');
}
