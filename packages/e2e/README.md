# @n8n-probe/e2e

Build and run whole n8n workflows in tests — fast and in-process by default,
inside a real n8n container when you need the real thing.

```ts
import { workflow, runWorkflow, expectWorkflowSuccess, getNodeOutput } from '@n8n-probe/e2e';
import { Example } from 'n8n-nodes-probe-example';

const wf = workflow('uppercase a name')
  .addNode({ name: 'Start', type: 'manualTrigger', parameters: { data: [{ name: 'ada' }] } })
  .addNode({ name: 'Up', type: 'n8n-nodes-probe-example.example', parameters: { field: 'name' } })
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

## Full tier: a real n8n instance (opt-in)

The same `WorkflowDefinition` can run inside the official `n8nio/n8n` image,
with your node package installed the way n8n installs a community package. Use
it for what the in-process tier cannot prove: that the **built** package loads
in n8n, that its node types resolve, and that it behaves the same there.

Needs Docker and the optional peer dependency `testcontainers`
(`pnpm add -D testcontainers`). Keep these suites out of the default test run
(e.g. `*.full.test.ts` with their own Vitest config) — each run takes seconds.

```ts
import { startN8nInstance, expectWorkflowSuccess, getNodeOutput } from '@n8n-probe/e2e';
import type { N8nInstance } from '@n8n-probe/e2e';

let n8n: N8nInstance;
beforeAll(async () => {
  n8n = await startN8nInstance({ nodePackages: ['/abs/path/to/n8n-nodes-my-package'] });
}, 300_000);
afterAll(() => n8n.stop());

it('runs in a real n8n', async () => {
  const run = await n8n.run(wf); // the definition from above
  expectWorkflowSuccess(run);
  expect(getNodeOutput(run, 'Up').map((i) => i.json)).toEqual([{ name: 'ADA' }]);
});
```

- **`startN8nInstance(options?)`** → `{ run(definition), stop() }`. Boots one
  container; runs on it are serialised. Options:
  - `nodePackages` — host paths of **built** node packages (a `package.json`
    whose `n8n.nodes` lists the node files, plus what its `files` field names,
    default `dist`). Runtime dependencies are not installed — bundle them.
  - `image` — defaults to `DEFAULT_N8N_IMAGE`, the release this tier was last
    verified against (`n8nio/n8n:2.41.7`).
  - `env` — extra environment variables for n8n.
  - `runTimeoutMs` — bound for one run (default 120 000). After a timeout the
    instance rejects further runs (the timed-out n8n process may still be
    alive in the container); `stop()` it and start a new one.
- **`runWorkflowInFullInstance(definition, options?)`** — boot, run, stop in one
  call. Convenient for a single test; prefer `startN8nInstance` for a suite.

Both resolve with n8n's `IRun` even when a node fails, so
`expectWorkflowSuccess` / `getNodeOutput` work unchanged. Infrastructure
problems (no Docker, a package that does not load) reject.

How a definition maps onto a real instance:

- Node types must be **package-qualified** (`n8n-nodes-my-package.myNode`) —
  a real instance has no bare-name lookup. Qualified types also work in
  `runWorkflow`, so one definition serves both tiers. Bare types are rejected
  before any container starts.
- Runs go through n8n's CLI (`import:workflow` + `execute`), which needs exactly
  one `manualTrigger`. It becomes n8n's own Manual Trigger; when it has `data`,
  the CLI cannot inject items, so the toolkit feeds them through an n8n Code
  node under the trigger's name (an extra internal trigger is stripped from the
  returned run). Its items' `pairedItem` then point at that internal trigger's
  single item, as n8n itself would report them.
- Timestamps (`startedAt`, `stoppedAt`) come back as `Date`s.

## Not yet

- Credentials in the full tier (n8n would need them imported and encrypted).
- Webhook / polling triggers in either tier; sub-workflows.
- Credential support in `runWorkflow` is `getDecrypted`-only (no OAuth /
  credential CRUD).

---

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
