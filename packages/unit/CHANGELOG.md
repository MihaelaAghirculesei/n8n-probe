# @n8n-probe/unit

## 0.2.0

### Minor Changes

- 03dbba9: **Breaking:** `core`, `unit` and `mock-http` no longer ship a CommonJS build. Those builds never loaded, because they `require()` Vitest and Vitest cannot be required. Vitest test files already used the ESM build, so they are unaffected. `@n8n-probe/core/vitest` keeps its CommonJS build for config files in CommonJS projects. TypeScript test files in a CommonJS project still type-check with `moduleResolution` `node` (n8n's node starter) or `nodenext`. With `node16`, switch to `nodenext` or use `.mts` test files.

### Patch Changes

- Updated dependencies [87f0a40]
- Updated dependencies [03dbba9]
  - @n8n-probe/core@0.3.0

## 0.1.2

### Patch Changes

- a06ed38: Accept Vitest 5 as a peer (`^4.0.0 || ^5.0.0`). A fresh `vitest` install now resolves 5.x, which reported an unmet peer and made npm 10 crash during install.
- Updated dependencies [a06ed38]
  - @n8n-probe/core@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [61de552]
- Updated dependencies [1310b3e]
- Updated dependencies [99e69d5]
  - @n8n-probe/core@0.2.0

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
