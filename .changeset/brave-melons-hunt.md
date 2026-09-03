---
'@n8n-probe/unit': minor
---

Implement the node unit-testing helpers (Milestone 2).

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
