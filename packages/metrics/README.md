# @n8n-probe/metrics

Node execution metrics, recorded through the OpenTelemetry Metrics API and
exposed in Prometheus exposition format — no separate Prometheus client
dependency (ADR-0003).

```ts
import { initMetrics, instrument } from '@n8n-probe/metrics';

const shutdown = await initMetrics({ port: 9464 }); // serves GET /metrics

const m = instrument('n8n-nodes-probe-example.example');
const started = performance.now();
try {
  // ...run the node...
  m.recordExecution('success', (performance.now() - started) / 1000);
} catch (err) {
  m.recordExecution('error', (performance.now() - started) / 1000);
  throw err;
}

// on process shutdown
await shutdown();
```

## API

- **`initMetrics({ port?, endpoint?, host? })`** — starts a `MeterProvider` whose
  only reader is a `PrometheusExporter`, registers it as the global provider, and
  serves the exposition endpoint (default `:9464/metrics`). Resolves once the
  server is listening; the returned `shutdown()` stops it.
- **`instrument(nodeType)`** → `{ recordExecution(status, durationSeconds) }` —
  `status` is `'success'` or `'error'`. Each call bumps
  `n8n_node_executions_total{node_type,status}` and observes
  `n8n_node_execution_duration_seconds{node_type,status}`. Call it after
  `initMetrics`; before it, the OpenTelemetry no-op meter makes it a cheap no-op.
- **`EXECUTIONS_COUNTER`** / **`DURATION_HISTOGRAM`** — the instrument names (the
  counter gains Prometheus's `_total` suffix in the exposition).

Pairs with [`@n8n-probe/otel`](../otel): one records the metric, the other opens
the span, through the same OpenTelemetry APIs.

---

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
