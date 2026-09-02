# @n8n-probe/mock-http

HTTP mocking for n8n nodes that call external APIs, built on
[MSW](https://mswjs.io).

```ts
import { setupMswForTest, mockApi, presets } from '@n8n-probe/mock-http';

setupMswForTest([
  ...mockApi()
    .get('https://api.example.com/users')
    .reply(200, [{ id: 1 }])
    .handlers(),
  presets.rateLimited('https://api.example.com/slow'),
]);
```

- `setupMswForTest(handlers?)` — shared server wired to the test lifecycle.
- `mockApi()` — fluent handler builder.
- `presets` — `rateLimited`, `timeout`, `flakyThenSuccess`.
- `startWireMock(options?)` — real HTTP server via `testcontainers` (optional peer).

> Pre-release. See [`docs/PLAN.md`](../../docs/PLAN.md) for status.

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
