---
'@n8n-probe/e2e': minor
---

Implement the in-process workflow tier (Milestone 4).

- `workflow(name?)` — fluent builder (`.addNode`, `.connect`, `.build`) →
  `WorkflowDefinition` (a structural subset of `IWorkflowBase`).
- `runWorkflow(definition, options?)` — executes the whole workflow in-process
  via `n8n-workflow` / `n8n-core` (no server, no database) and returns n8n's
  `IRun`. Options: `nodeTypes` (node classes, matched by `description.name`),
  `credentials` (`getDecrypted`-only), `mode`. `ManualTrigger` is a built-in
  start node. Because it uses n8n's own per-node context, a node's
  `helpers.httpRequest` is real and composes with `@n8n-probe/mock-http`.
- `expectWorkflowSuccess(run)` (names the failing node),
  `getNodeOutput(run, nodeName, branch?)`.
- `nodeTypesFrom(classes)` to build an `INodeTypes` registry directly.
- `runWorkflowInFullInstance` is stubbed and rejects — the real n8n container
  tier is deferred (issue #12).
