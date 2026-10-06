---
'@n8n-probe/e2e': minor
---

`runWorkflow` gains a `startNode` option. **Breaking:** a workflow with several
entry nodes (nodes no connection points to) now throws instead of silently
starting from the first one and skipping whatever it does not reach — pass
`startNode` to choose. Each run also gets a unique execution id instead of the
fixed `e2e-exec`.
