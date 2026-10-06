# @n8n-probe/core

Typed mock n8n execution context and data fixtures for testing custom nodes.

```ts
import { createMockExecuteFunctions, itemsFrom, binaryFixture } from '@n8n-probe/core';
```

## Vitest set-up: `@n8n-probe/core/vitest`

Every project testing n8n nodes with `@n8n-probe/*` needs one setting in
`vitest.config.ts`:

```ts
import { n8nProbeVitestConfig } from '@n8n-probe/core/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(n8nProbeVitestConfig(), defineConfig({ test: {} }));
```

**`n8nProbeVitestConfig({ root? })`** pins every `n8n-workflow` import to its
CommonJS build — the one n8n nodes load — and inlines `@n8n-probe/*` so the pin
applies inside the toolkit too. Without it, `n8n-workflow`'s ESM build fails to
load under Node (`Cannot find module …/dist/esm/logger-proxy`), and two copies
of its classes break `instanceof` checks between a node and its test. `root`
(default `process.cwd()`) is where `n8n-workflow` is resolved from. It is a
separate entry point because a config file must not load the main entry's
runtime `vitest` dependency.

## `createMockExecuteFunctions(options?)`

Builds a deep, type-safe mock of n8n's `IExecuteFunctions` (via
[`vitest-mock-extended`](https://github.com/eratio08/vitest-mock-extended)) with
the members a node's `execute()` usually reads already wired up: `getNode`,
`getInputData`, `getNodeParameter`, `continueOnFail`, `logger` and `helpers.*`.

```ts
import { createMockExecuteFunctions, itemsFrom } from '@n8n-probe/core';
import { MyNode } from '../nodes/MyNode/MyNode.node';

it('uppercases the configured field', async () => {
  const ctx = createMockExecuteFunctions({
    input: itemsFrom([{ name: 'ada' }]),
    params: { field: 'name' },
  });

  const output = await new MyNode().execute.call(ctx);

  expect(output).toEqual([[{ json: { name: 'ADA' }, pairedItem: { item: 0 } }]]);
});
```

| Option           | Default             | Purpose                                                             |
| ---------------- | ------------------- | ------------------------------------------------------------------- |
| `node`           | a generic test node | Overrides merged over the node returned by `getNode()`              |
| `input`          | `[]`                | Items returned by `getInputData()`                                  |
| `params`         | `{}`                | Resolved by `getNodeParameter(name, itemIndex, fallback?)`          |
| `credentials`    | `{}`                | Decrypted objects keyed by type, returned by `getCredentials(type)` |
| `continueOnFail` | `false`             | Value returned by `continueOnFail()`                                |

`getNodeParameter` resolves against the node's own `parameters` with `params`
layered on top (so `params` wins on a key collision). Keys may be flat
(`'field'`) or dotted (`'options.limit'`); a flat key containing dots is matched
before the path is walked. It returns the fallback when a value is absent, and
throws when there is neither a value nor a fallback.

n8n expressions (any string starting with `=`, such as `'={{ $json.id }}'`, at
any depth of the value) are **not evaluated** by the mock, and reading one
throws instead of handing the node the raw string — a test would otherwise pass
on behaviour no real run has. Either pass the already-resolved value in
`params`, or run the node through `runWorkflow` from
[`@n8n-probe/e2e`](../e2e/README.md), which evaluates expressions with n8n's own
engine.

`getCredentials(type)` resolves the matching entry from `credentials` and throws
when the node asks for a type that was not provided — the same failure a real
run produces when credentials are missing, rather than silently handing back
`undefined`.

```ts
const ctx = createMockExecuteFunctions({
  credentials: { myApi: { apiKey: 'secret' } },
});
await ctx.getCredentials('myApi'); // { apiKey: 'secret' }
```

The result is a live deep mock, so anything can be refined per test:

```ts
const ctx = createMockExecuteFunctions();
ctx.getInputData.mockReturnValue(itemsFrom([{ retry: true }]));
ctx.helpers.httpRequest.mockResolvedValue({ ok: true });
```

## `itemsFrom(json[])`

Wraps plain objects as `INodeExecutionData[]` — `{ json, pairedItem: { item } }`
per entry. Non-object entries throw, so a stray primitive fails loudly instead of
producing an item with no `json`.

```ts
itemsFrom([{ a: 1 }, { a: 2 }]);
// [{ json: { a: 1 }, pairedItem: { item: 0 } }, { json: { a: 2 }, pairedItem: { item: 1 } }]
```

## `binaryFixture({ fileName, mimeType, data })`

Builds an `IBinaryData` fixture from an in-memory `Buffer`: base64-encodes the
data and fills in `mimeType`, `fileName`, `fileExtension` (from the name) and
`fileSize`.

```ts
binaryFixture({ fileName: 'report.csv', mimeType: 'text/csv', data: Buffer.from('a,b,c') });
// { data: 'YSxiLGM=', mimeType: 'text/csv', fileName: 'report.csv', fileExtension: 'csv', fileSize: '5 B' }
```

---

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
