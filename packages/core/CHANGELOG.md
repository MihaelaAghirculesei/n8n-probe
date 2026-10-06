# @n8n-probe/core

## 0.2.0

### Minor Changes

- 61de552: **Breaking:** `getNodeParameter` on the mock context now throws when the value
  holds an n8n expression (a string starting with `=`, at any depth) instead of
  returning the raw string, which let a node under test run on input no real
  execution would give it. Pass the resolved value in `params`, or run the node
  through `@n8n-probe/e2e`'s `runWorkflow`, which evaluates expressions with n8n's
  own engine.
- 99e69d5: Add `@n8n-probe/core/vitest` with `n8nProbeVitestConfig()`, the Vitest settings
  a project needs to use the toolkit: it pins `n8n-workflow` to the CommonJS build
  n8n nodes load (its ESM build cannot be loaded by Node, and two copies break
  `instanceof` between a node and its test) and inlines `@n8n-probe/*` so the pin
  applies inside the toolkit. Merge it into `vitest.config.ts` — see the README.

### Patch Changes

- 1310b3e: Deprecate `NotImplementedError`: no toolkit API throws it any more. It will be
  removed in `0.3.0`.

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
