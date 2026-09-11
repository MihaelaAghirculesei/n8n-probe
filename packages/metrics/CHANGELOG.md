# @n8n-probe/metrics

## 0.1.0

### Minor Changes

- 535c637: Implement Prometheus metrics for node executions (Milestone 6).
  
  - `initMetrics({ port?, endpoint?, host? })` — starts a `MeterProvider` whose
    only reader is a `PrometheusExporter` (`@opentelemetry/sdk-metrics` 2.x, no
    `prom-client`, per ADR-0003), registers it globally and serves the exposition
    endpoint (default `:9464/metrics`). It is **async** — resolves once the server
    is listening — and resolves to `shutdown()`.
  - `instrument(nodeType)` → `{ recordExecution(status, durationSeconds) }` bumps
    `n8n_node_executions_total{node_type,status}` and observes
    `n8n_node_execution_duration_seconds{node_type,status}`. Instrument names are
    exported as `EXECUTIONS_COUNTER` / `DURATION_HISTOGRAM`.

### Patch Changes

- 057c4dc: Fix `repository.url` in each package manifest: it pointed at
  `github.com/n8n-probe/n8n-probe`, a path that was never claimed, instead of
  where the repository actually lives
  (`github.com/MihaelaAghirculesei/n8n-probe`). Broken "Repository" link on
  npm, and would have failed/mislabeled npm provenance attestation at the
  first publish. No API change.
- 73aa201: Add `homepage` to each package manifest, pointing at its directory on
  GitHub. Closes the last gap in Milestone 9's "every package ships
  `repository`/`homepage` metadata" checklist item. No API change.
