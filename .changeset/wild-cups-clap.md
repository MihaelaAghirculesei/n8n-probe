---
'@n8n-probe/core': minor
---

Implement the mock execution context and fixtures (Milestone 1).

- `createMockExecuteFunctions(options?)` returns a `vitest-mock-extended` deep
  mock of `IExecuteFunctions` with `getNode`, `getInputData`, `getNodeParameter`,
  `continueOnFail`, `logger` and `helpers.*` pre-wired. Options: `node`, `input`,
  `params` (flat or dotted keys, fallback-aware), `continueOnFail`.
- `itemsFrom(json[])` wraps plain objects as `INodeExecutionData[]` with a
  `pairedItem` index and rejects non-object entries.
- `binaryFixture({ fileName, mimeType, data })` base64-encodes a `Buffer` and
  fills in `mimeType`, `fileName`, `fileExtension` and `fileSize`.

`$parameter`-style expression resolution in `getNodeParameter` is not included
yet.
