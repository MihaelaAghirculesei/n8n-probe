# n8n-nodes-probe-example

A small example n8n community node (`Example`) that uppercases a string field
on each item. It is **not published** — it exists purely as a shared fixture so
the `@n8n-probe/*` packages test and document against a real node.

- Follows n8n's `n8n-nodes-*` community-node naming convention.
- Programmatic style (explicit `execute()`), honours `continueOnFail()`, throws
  `NodeOperationError` on non-string input.

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
