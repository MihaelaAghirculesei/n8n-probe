# Local observability stack

An n8n + Prometheus + Grafana + Jaeger stack for manually verifying
`@n8n-probe/otel` and `@n8n-probe/metrics` — including seeing a real trace and
metric come out of `HttpExample` running inside n8n's own UI.

```bash
pnpm --filter n8n-nodes-probe-example build   # so n8n can load the example node
docker compose -f docker/docker-compose.yml up -d
```

| Service    | URL                     | Notes                                        |
| ---------- | ----------------------- | --------------------------------------------- |
| n8n        | http://localhost:5678   | example node mounted read-only               |
| Prometheus | http://localhost:9090   | scrapes the n8n container's `:9464/metrics`  |
| Grafana    | http://localhost:3000   | anonymous viewer; dashboard auto-provisioned |
| Jaeger     | http://localhost:16686  | OTLP HTTP in on `:4318`                      |

`docker-compose.yml` sets `N8N_PROBE_DEMO_OBSERVABILITY=1` on the n8n service,
which makes `HttpExample.node.ts` call `initTracing`/`initMetrics` once at
startup (real providers, not the no-op fallback). See
`docs/observability-walkthrough.md` for the full walkthrough: build a workflow
with the "HTTP Example" node, run it, then find the span in Jaeger and the
panel in Grafana.

```bash
docker compose -f docker/docker-compose.yml down -v
```
