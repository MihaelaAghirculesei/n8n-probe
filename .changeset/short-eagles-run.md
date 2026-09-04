---
'@n8n-probe/metrics': minor
---

Implement Prometheus metrics for node executions (Milestone 6).

- `initMetrics({ port?, endpoint?, host? })` — starts a `MeterProvider` whose
  only reader is a `PrometheusExporter` (`@opentelemetry/sdk-metrics` 2.x, no
  `prom-client`, per ADR-0003), registers it globally and serves the exposition
  endpoint (default `:9464/metrics`). It is **async** — resolves once the server
  is listening — and resolves to `shutdown()`.
- `instrument(nodeType)` → `{ recordExecution(status, durationSeconds) }` bumps
  `n8n_node_executions_total{node_type,status}` and observes
  `n8n_node_execution_duration_seconds{node_type,status}`. Instrument names are
  exported as `EXECUTIONS_COUNTER` / `DURATION_HISTOGRAM`.
