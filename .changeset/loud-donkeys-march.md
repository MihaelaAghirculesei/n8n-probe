---
'@n8n-probe/otel': minor
---

Implement OpenTelemetry tracing for node executions (Milestone 5).

- `initTracing({ serviceName, exporter, otlpEndpoint? })` — composes a
  `NodeTracerProvider` from the stable OpenTelemetry 2.x packages (dropping the
  `@opentelemetry/sdk-node` 0.x dependency the Milestone 0 scaffold listed by
  mistake, per ADR-0003), registers it globally, returns an async `shutdown()`.
  `exporter` is `'console'` (flush each span) or `'otlp-http'` (batched).
- `traced(executeFn)` — wraps a node `execute` so each call runs in an
  `n8n.node.execute` span carrying `n8n.node.type` / `.name` / `.type_version`,
  `n8n.item.count`, and `n8n.workflow.id` / `n8n.execution.id` when available.
  Records exceptions and error status; preserves `this`; passes the value or
  rejection through unchanged.
- `expectSpan(spans, { name, attributes? })` — name + attribute-subset match for
  tests; never asserts timing.
- `createTestTracing()` → `{ getSpans, reset, shutdown }` — an in-memory tracer
  registered as the global provider.
- `NODE_EXECUTE_SPAN` — the span-name constant.
