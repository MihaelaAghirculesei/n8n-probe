# @n8n-probe/unit

## 0.1.0

### Minor Changes

- 7518874: Implement the node unit-testing helpers (Milestone 2).
  
  - `executeNode(NodeClass, options?)` instantiates the node, builds a context via
    `@n8n-probe/core`, runs `execute()` and returns the raw output branches.
    Options: `input`, `params`, `credentials`, `node` (getNode overrides),
    `continueOnFail`. `typeVersion` defaults to the highest the node's
    `description` declares.
  - `expectNodeOutput(result, expected, branch?)` deep-equals a branch's `json`
    payloads with a readable diff; `branch` defaults to `0`.
  - `expectNodeError(promise, matcher?)` asserts a rejection by `message`
    (substring or RegExp) and/or `instanceOf`.
  - Declarative/routing nodes, nodes without `execute()`, and nodes returning an
    `EngineRequest` throw `NodeNotExecutableError` (ADR-0005) instead of running
    half-way.

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
