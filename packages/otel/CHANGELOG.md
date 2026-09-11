# @n8n-probe/otel

## 0.1.0

### Minor Changes

- 06d2bf0: Implement OpenTelemetry tracing for node executions (Milestone 5).
  
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
