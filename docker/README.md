# Local observability stack

A throwaway n8n + Prometheus + Grafana + Jaeger stack for manually verifying
`@n8n-probe/otel` and `@n8n-probe/metrics`.

```bash
pnpm --filter n8n-nodes-probe-example build   # so n8n can load the example node
docker compose -f docker/docker-compose.yml up -d
```

| Service    | URL                     | Notes                              |
| ---------- | ----------------------- | ---------------------------------- |
| n8n        | http://localhost:5678   | example node mounted read-only     |
| Prometheus | http://localhost:9090   | scrapes `host.docker.internal:9464`|
| Grafana    | http://localhost:3000   | anonymous viewer; dashboard auto-provisioned |
| Jaeger     | http://localhost:16686  | OTLP HTTP in on `:4318`            |

Point `@n8n-probe/otel` at `http://localhost:4318` and start
`@n8n-probe/metrics` `initMetrics()` on the host (`:9464`).

```bash
docker compose -f docker/docker-compose.yml down -v
```
