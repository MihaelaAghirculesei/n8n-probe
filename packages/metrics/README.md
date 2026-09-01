# @n8n-probe/metrics

Node execution metrics, recorded through the OpenTelemetry Metrics API and
exposed in Prometheus exposition format (see ADR-0003 — no separate Prometheus
client dependency).

```ts
import { initMetrics, instrument } from '@n8n-probe/metrics';

const shutdown = initMetrics({ port: 9464 }); // serves /metrics
const m = instrument('n8n-nodes-probe-example.example');

const started = performance.now();
try {
  // ...run the node...
  m.recordExecution('success', (performance.now() - started) / 1000);
} catch (err) {
  m.recordExecution('error', (performance.now() - started) / 1000);
  throw err;
}
```

Exposes `n8n_node_executions_total{node_type,status}` and
`n8n_node_execution_duration_seconds`.

> Pre-release. See [`docs/PLAN.md`](../../docs/PLAN.md) for status.

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
