# Observability walkthrough

See a real span in Jaeger and a real metric in Grafana, produced by running
the `HTTP Example` node from inside n8n's own UI — not via
`apps/dogfood`'s tests or a host-side driver script.

## 1. Build and start the stack

```bash
pnpm --filter n8n-nodes-probe-example build   # dist/ must exist before n8n starts
docker compose -f docker/docker-compose.yml up -d
```

Give n8n a few seconds, then open <http://localhost:5678> and create the
owner account (first run only).

`docker-compose.yml` sets `N8N_PROBE_DEMO_OBSERVABILITY=1` on the n8n
service. That makes `HttpExample.node.ts` call `initTracing`/`initMetrics`
once, at container startup — see ADR-0011 in `docs/ARCHITECTURE.md` if you
want the full story on why that's safe and where it's wired.

## 2. Build a workflow

1. Create a new workflow.
2. Add a **Webhook** node (or **Manual Trigger**, for an editor-only test
   run — see the note below on why a webhook proves more).
3. Add an **HTTP Example** node after it, with a URL that returns JSON, e.g.
   `https://jsonplaceholder.typicode.com/todos/1`.
4. Connect them and save.

## 3. Run it and activate it

- **Manual Trigger**: click *Execute workflow* in the editor. This proves
  the node runs and is traced/instrumented, but only inside the editor's
  test-execution process.
- **Webhook** (recommended — exercises the actual long-running n8n process
  that Prometheus is scraping): toggle the workflow **Active** in the
  top-right of the editor, then call the production URL:
  ```bash
  curl http://localhost:5678/webhook/<your-path>
  ```

## 4. Check Jaeger

Open <http://localhost:16686>, pick service `n8n-probe-demo`, click
*Find Traces*. You should see an `n8n.node.execute` span
(`@n8n-probe/otel`'s `NODE_EXECUTE_SPAN`) for the `HTTP Example` node.

## 5. Check Prometheus / Grafana

- Prometheus (<http://localhost:9090>): query `n8n_node_executions_total` —
  it should show a `success` (or `error`) sample for `httpExample`.
- Grafana (<http://localhost:3000>, anonymous viewer): the
  `n8n-probe · node executions` dashboard is auto-provisioned
  (`docker/grafana/provisioning`). Both panels — executions/sec by status and
  p95 duration — start plotting once you've run the workflow a few times.

## Troubleshooting

- **Nothing in Jaeger/Prometheus, but the node still ran fine**: check
  `docker compose -f docker/docker-compose.yml logs n8n` for
  `[n8n-probe demo] ... failed`. The init block is defensive — a failure
  there degrades to the no-op tracer/meter, it never breaks the node itself.
- **n8n won't load the "HTTP Example" node at all**: rebuild
  (`pnpm --filter n8n-nodes-probe-example build`) and
  `docker compose -f docker/docker-compose.yml restart n8n` — the mount is
  read-only and doesn't pick up a stale `dist/`.
- **Webhook returns 404 "not registered"**: the workflow must be both saved
  *and* toggled Active in the editor; an inactive workflow only responds on
  its `/webhook-test/...` URL while the editor has "listen for test event"
  running.

```bash
docker compose -f docker/docker-compose.yml down -v
```
