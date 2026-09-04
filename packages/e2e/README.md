# @n8n-probe/e2e

Build and run whole n8n workflows in tests — fast and in-process.

```ts
import { workflow, runWorkflow, expectWorkflowSuccess, getNodeOutput } from '@n8n-probe/e2e';
import { Example } from 'n8n-nodes-probe-example';

const wf = workflow('uppercase a name')
  .addNode({ name: 'Start', type: 'manualTrigger', parameters: { data: [{ name: 'ada' }] } })
  .addNode({ name: 'Up', type: 'example', parameters: { field: 'name' } })
  .connect('Start', 'Up')
  .build();

const run = await runWorkflow(wf, { nodeTypes: [Example] });

expectWorkflowSuccess(run);
getNodeOutput(run, 'Up').map((i) => i.json); // [{ name: 'ADA' }]
```

## API

- **`workflow(name?)`** → `.addNode({ name, type, typeVersion?, parameters?, credentials? })`,
  `.connect(from, to, fromOutput?, toInput?)`, `.build()` → a `WorkflowDefinition`.
- **`runWorkflow(definition, options?)`** — executes in-process via
  `n8n-workflow` / `n8n-core`. No server, no database. Returns n8n's `IRun`.
  Options:
  - `nodeTypes` — the node classes the workflow references (matched by
    `description.name`; a `pkg.name` type also matches the bare `name`).
    `ManualTrigger` is always registered.
  - `credentials` — decrypted objects keyed by credential type, handed to a
    node's `getCredentials(type)`.
  - `mode` — n8n execution mode, default `'manual'`.
- **`expectWorkflowSuccess(run)`** — throws (naming the failing node) unless the
  run finished cleanly.
- **`getNodeOutput(run, nodeName, branch?)`** — that node's output items for the
  run (branch `0` by default; `[]` if it did not run).
- **`ManualTrigger`** — a built-in start node; its `data` parameter (a JSON array)
  is the first items. **`nodeTypesFrom(classes)`** — build an `INodeTypes`
  registry directly.

`runWorkflow`'s node context is n8n's real one, so a node's `helpers.httpRequest`
hits the network layer — pair it with [`@n8n-probe/mock-http`](../mock-http/README.md)
to stub those calls.

## Not yet

`runWorkflowInFullInstance` (boot a real `n8nio/n8n` container via
`testcontainers`) is stubbed and rejects — tracked as a follow-up. Credential
support in `runWorkflow` is `getDecrypted`-only (no OAuth / credential CRUD).

---

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
