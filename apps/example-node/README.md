# n8n-nodes-probe-example

Two small example n8n community nodes. **Not published** — they exist purely
as a shared fixture so the `@n8n-probe/*` packages test and document against
real nodes.

- Follows n8n's `n8n-nodes-*` community-node naming convention.
- Both are programmatic style (explicit `execute()`).

**`Example`** uppercases a string field on each item; honours
`continueOnFail()`, throws `NodeOperationError` on non-string input.

**`HttpExample`** fetches JSON from a URL through `this.helpers.httpRequest`,
retrying a 429/503 a configurable number of times before wrapping a final
failure in a `NodeApiError`. Its `execute()` runs through one `traced()` +
`instrument()` wrapper (`@n8n-probe/otel` + `@n8n-probe/metrics`), so every
call emits an `n8n.node.execute` span and updates
`n8n_node_executions_total` / `..._duration_seconds` for `node_type:
"httpExample"` — a no-op until `initTracing`/`initMetrics` are running. See
`../dogfood` for a suite that exercises both nodes across all five pillars
together.

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
