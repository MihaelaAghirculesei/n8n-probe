# @n8n-probe/otel

OpenTelemetry tracing for n8n node executions — a span per `execute()`, plus
span assertions for tests.

```ts
import { initTracing, traced } from '@n8n-probe/otel';

const shutdown = initTracing({ serviceName: 'n8n-nodes-acme', exporter: 'otlp-http' });

class AcmeNode {
  execute = traced(async function (this: IExecuteFunctions) {
    // ...your node logic; runs inside an `n8n.node.execute` span
  });
}

// on process shutdown
await shutdown();
```

In a test:

```ts
import { createTestTracing, traced, expectSpan, NODE_EXECUTE_SPAN } from '@n8n-probe/otel';

const tracing = createTestTracing();
afterAll(() => tracing.shutdown());

it('emits a span for the node', async () => {
  const execute = traced(myNode.execute.bind(myNode));
  await execute.call(ctx);

  expectSpan(tracing.getSpans(), {
    name: NODE_EXECUTE_SPAN,
    attributes: { 'n8n.node.type': 'acme', 'n8n.item.count': 3 },
  });
});
```

## API

- **`initTracing({ serviceName, exporter, otlpEndpoint? })`** — composes a
  `NodeTracerProvider` from the stable OpenTelemetry 2.x packages (no
  `@opentelemetry/sdk-node`, per ADR-0003), registers it globally, and returns an
  async `shutdown()`. `exporter`: `'console'` (prints, flushes each span) or
  `'otlp-http'` (batched POST to a collector; `otlpEndpoint` overrides the
  default URL).
- **`traced(executeFn)`** — wraps a node `execute` function so every call runs in
  an `n8n.node.execute` span with `n8n.node.type` / `.name` / `.type_version`,
  `n8n.item.count`, and `n8n.workflow.id` / `n8n.execution.id` when the context
  exposes them. Exceptions are recorded and the span status set to error; the
  return value / rejection passes through unchanged. `this` is preserved.
- **`expectSpan(spans, { name, attributes? })`** — asserts a span by name and a
  subset of attributes. Never asserts timing.
- **`createTestTracing()`** → `{ getSpans(), reset(), shutdown() }` — an
  in-memory tracer registered as the global provider. `shutdown()` in teardown.
- **`NODE_EXECUTE_SPAN`** — the span name constant (`'n8n.node.execute'`).

Metrics live in [`@n8n-probe/metrics`](../metrics); they record through the same
OpenTelemetry APIs (ADR-0003).

---

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
