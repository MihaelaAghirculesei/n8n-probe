---
'@n8n-probe/otel': minor
'@n8n-probe/metrics': minor
---

Move to OpenTelemetry JS 3.x (`sdk-trace`/`sdk-metrics`/`resources` 3.0, exporters 0.300). The `@opentelemetry/api` peer range is now `^1.10.0`, which the 3.x SDK requires. `@n8n-probe/otel` builds on `@opentelemetry/sdk-trace`, because 3.x removed `sdk-trace-node`, and still registers the AsyncLocalStorage context manager and W3C propagators globally. `initMetrics` now binds `0.0.0.0` by default: the 0.300 Prometheus exporter would otherwise bind `localhost` only, and a scraper in another container could no longer reach it.
