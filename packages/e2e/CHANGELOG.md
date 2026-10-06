# @n8n-probe/e2e

## 0.2.0

### Minor Changes

- 849adf4: `runWorkflow` gains a `startNode` option. **Breaking:** a workflow with several
  entry nodes (nodes no connection points to) now throws instead of silently
  starting from the first one and skipping whatever it does not reach — pass
  `startNode` to choose. Each run also gets a unique execution id instead of the
  fixed `e2e-exec`.
- f70d196: Implement the full tier: `startN8nInstance({ nodePackages })` boots the official
  `n8nio/n8n` image (pinned default `DEFAULT_N8N_IMAGE`), installs your built node
  packages as community packages and runs workflow definitions through n8n's CLI;
  `runWorkflowInFullInstance` does boot + run + stop in one call. Both resolve
  with an `IRun` that `expectWorkflowSuccess` / `getNodeOutput` accept. Node types
  must be package-qualified (`n8n-nodes-my-package.myNode`) for this tier.

### Patch Changes

- e3a8709: Stop installing `testcontainers` (and the unused `@n8n-probe/core`) for every
  consumer. `testcontainers` is now an optional peer dependency, needed only for
  the Docker-backed full tier — add it with `pnpm add -D testcontainers` if you use
  that tier.

## 0.1.0

### Minor Changes

- 7fe7a24: Implement the in-process workflow tier (Milestone 4).
  
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

### Patch Changes

- 057c4dc: Fix `repository.url` in each package manifest: it pointed at
  `github.com/n8n-probe/n8n-probe`, a path that was never claimed, instead of
  where the repository actually lives
  (`github.com/MihaelaAghirculesei/n8n-probe`). Broken "Repository" link on
  npm, and would have failed/mislabeled npm provenance attestation at the
  first publish. No API change.
- 73aa201: Add `homepage` to each package manifest, pointing at its directory on
  GitHub. Closes the last gap in Milestone 9's "every package ships
  `repository`/`homepage` metadata" checklist item. No API change.
- Updated dependencies [7375029]
- Updated dependencies [057c4dc]
- Updated dependencies [61cc09e]
- Updated dependencies [73aa201]
  - @n8n-probe/core@0.1.0
