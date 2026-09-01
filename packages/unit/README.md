# @n8n-probe/unit

Run one n8n node in isolation and assert on its output.

```ts
import { executeNode, expectNodeOutput, expectNodeError } from '@n8n-probe/unit';

const result = await executeNode(MyNode, {
  input: [{ json: { name: 'ada' } }],
  params: { field: 'name' },
});

expectNodeOutput(result, [{ name: 'ADA' }]);
```

- `executeNode(NodeClass, options)` — instantiate, run `execute()`, return output branches.
- `expectNodeOutput(result, expected)` — deep-equal the first branch's `json` payloads.
- `expectNodeError(promise, matcher)` — assert a rejection by message and/or type.

> Pre-release. See [`docs/PLAN.md`](../../docs/PLAN.md) for status.

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
