# @n8n-probe/core

Typed mock n8n execution context and data fixtures.

```ts
import { createMockExecuteFunctions, itemsFrom, binaryFixture } from '@n8n-probe/core';
```

- `createMockExecuteFunctions(overrides?)` — deep, type-safe `IExecuteFunctions` mock.
- `itemsFrom(json[])` — wrap plain values as `INodeExecutionData[]`.
- `binaryFixture({ fileName, mimeType, data })` — build an `IBinaryData` fixture.

> Pre-release. See [`docs/PLAN.md`](../../docs/PLAN.md) for status.

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
