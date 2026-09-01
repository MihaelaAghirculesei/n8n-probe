# @n8n-probe/e2e

Build and run whole n8n workflows in tests.

```ts
import { workflow, runWorkflow, expectWorkflowSuccess, getNodeOutput } from '@n8n-probe/e2e';

const wf = workflow()
  .addNode({ name: 'Start', type: 'n8n-nodes-base.manualTrigger' })
  .addNode({ name: 'Do', type: 'n8n-nodes-probe-example.example' })
  .connect('Start', 'Do')
  .build();

const run = await runWorkflow(wf);
expectWorkflowSuccess(run);
```

Two tiers:

- **Fast** — `runWorkflow` executes in-process via `n8n-workflow` / `n8n-core`.
  Runs in `pnpm test`.
- **Full** — `runWorkflowInFullInstance` boots a real `n8nio/n8n` container via
  `testcontainers`. Runs only in `pnpm test:e2e:full` (needs Docker).

> Pre-release. See [`docs/PLAN.md`](../../docs/PLAN.md) for status.

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
