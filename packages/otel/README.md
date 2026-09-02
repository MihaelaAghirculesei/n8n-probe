# @n8n-probe/otel

OpenTelemetry tracing for n8n node executions.

```ts
import { initTracing, traced, expectSpan } from '@n8n-probe/otel';

const shutdown = initTracing({ serviceName: 'my-node', exporter: 'otlp-http' });
const execute = traced(myNode.execute.bind(myNode));
// ...
await shutdown();
```

- `initTracing(options)` — start a `NodeSDK`; returns an async `shutdown()`.
- `traced(executeFn)` — wrap `execute()` in an `n8n.node.execute` span.
- `expectSpan(spans, matcher)` — assert a span by name and attributes in tests.

Metrics live in [`@n8n-probe/metrics`](../metrics); it records through the same
OpenTelemetry APIs (see ADR-0003).

> Pre-release. See [`docs/PLAN.md`](../../docs/PLAN.md) for status.

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
