import { metrics } from '@opentelemetry/api';

const METER_NAME = '@n8n-probe/metrics';

/** Prometheus exposition names these produce (counter gains the `_total` suffix). */
export const EXECUTIONS_COUNTER = 'n8n_node_executions';
export const DURATION_HISTOGRAM = 'n8n_node_execution_duration_seconds';

/** Outcome of a node execution. */
export type ExecutionStatus = 'success' | 'error';

/** Per-node-type recorder returned by {@link instrument}. */
export interface ExecutionInstrument {
  /** Record one finished execution: bumps the counter and the duration histogram. */
  recordExecution(status: ExecutionStatus, durationSeconds: number): void;
}

/**
 * Get a recorder for a node type. `recordExecution` updates
 * `n8n_node_executions_total{node_type,status}` and
 * `n8n_node_execution_duration_seconds{node_type,status}`. Call after
 * {@link initMetrics} so the instruments bind to the running provider; before
 * it, the OpenTelemetry API's no-op meter makes this a cheap no-op.
 */
export function instrument(nodeType: string): ExecutionInstrument {
  const meter = metrics.getMeter(METER_NAME);
  const counter = meter.createCounter(EXECUTIONS_COUNTER, {
    description: 'Total n8n node executions',
  });
  const histogram = meter.createHistogram(DURATION_HISTOGRAM, {
    description: 'n8n node execution duration in seconds',
    unit: 's',
  });

  return {
    recordExecution(status, durationSeconds) {
      const attributes = { node_type: nodeType, status };
      counter.add(1, attributes);
      histogram.record(durationSeconds, attributes);
    },
  };
}
