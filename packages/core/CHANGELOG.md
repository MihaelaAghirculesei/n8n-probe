# @n8n-probe/core

## 0.1.0

### Minor Changes

- 7375029: Add a `credentials` option to `createMockExecuteFunctions`. It wires
  `getCredentials(type)` to return the matching decrypted object and to throw when
  a node asks for a type that was not provided — mirroring a real run with
  unconfigured credentials rather than handing back `undefined`.
- 61cc09e: Implement the mock execution context and fixtures (Milestone 1).
  
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
