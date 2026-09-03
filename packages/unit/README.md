# @n8n-probe/unit

Run one n8n node in isolation and assert on its output. Built on
[`@n8n-probe/core`](../core/README.md)'s mock execution context.

```ts
import { executeNode, expectNodeOutput, expectNodeError } from '@n8n-probe/unit';
import { NodeOperationError } from 'n8n-workflow';
import { MyNode } from '../nodes/MyNode/MyNode.node';

it('uppercases the configured field', async () => {
  const result = await executeNode(MyNode, {
    input: [{ json: { name: 'ada' } }],
    params: { field: 'name' },
  });

  expectNodeOutput(result, [{ name: 'ADA' }]);
});

it('rejects a non-string field', async () => {
  await expectNodeError(
    executeNode(MyNode, { input: [{ json: { name: 42 } }], params: { field: 'name' } }),
    { instanceOf: NodeOperationError, message: /is not a string/ },
  );
});
```

## `executeNode(NodeClass, options?)`

Instantiates `NodeClass`, builds a context from `options` via `@n8n-probe/core`,
calls `execute()` and returns the raw output branches
(`result[branchIndex][itemIndex]`).

| Option           | Default | Purpose                                                             |
| ---------------- | ------- | ------------------------------------------------------------------- |
| `input`          | `[]`    | Items the node reads through `getInputData()`                       |
| `params`         | `{}`    | Parameter values, layered over the node's own `parameters`          |
| `credentials`    | `{}`    | Decrypted objects keyed by type, returned by `getCredentials(type)` |
| `node`           | —       | Overrides for `getNode()` — `name`, `typeVersion`, `parameters`, …  |
| `continueOnFail` | `false` | Value returned by `this.continueOnFail()` inside the node           |

`typeVersion` defaults to the highest version the node's `description` declares;
pass `node: { typeVersion }` to pin another.

**Scope (v1).** Only programmatic-style nodes — an explicit `execute()` method —
are supported. A declarative/routing node, a node with no `execute()`, or one
that returns an `EngineRequest` throws `NodeNotExecutableError` (ADR-0005).

## `expectNodeOutput(result, expected, branch?)`

Deep-equals one output branch's `json` payloads against `expected`. `branch`
defaults to `0`; a missing branch compares as `[]`.

```ts
expectNodeOutput(result, [{ side: 'left' }]);
expectNodeOutput(result, [{ side: 'right' }], 1);
```

## `expectNodeError(promise, matcher?)`

Asserts that `promise` rejects, and that the rejection matches `matcher`:

- `message` — a substring (string) or pattern (RegExp) the message must satisfy.
- `instanceOf` — a constructor the rejection must be an `instanceof`.

Resolving, or matching neither field, throws.

---

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
