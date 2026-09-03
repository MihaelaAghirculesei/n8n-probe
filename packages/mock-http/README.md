# @n8n-probe/mock-http

HTTP mocking for n8n nodes that call external APIs, built on
[MSW](https://mswjs.io) for the fast in-process tier and
[`testcontainers`](https://testcontainers.com) + WireMock for the opt-in
real-server tier.

```ts
import {
  setupMswForTest,
  mockApi,
  presets,
  createMockHttpExecuteFunctions,
} from '@n8n-probe/mock-http';
import { MyHttpNode } from '../nodes/MyHttpNode/MyHttpNode.node';

const server = setupMswForTest();

it('reads a user from the API', async () => {
  server.use(...mockApi().get('https://api.example.com/users/1').reply(200, { id: 1 }).handlers());

  const ctx = createMockHttpExecuteFunctions({
    input: [{ json: {} }],
    params: { url: 'https://api.example.com/users/1' },
  });
  const out = await new MyHttpNode().execute.call(ctx);

  expect(out[0][0].json).toEqual({ id: 1 });
});
```

## MSW tier (part of `pnpm test`)

- **`setupMswForTest(handlers?)`** — one shared server per test file, wired to
  `beforeAll` / `afterEach` / `afterAll`. An unmatched request fails the test
  (`onUnhandledRequest: 'error'`) instead of hanging or hitting the network.
  Returns the server for per-case `server.use(...)`.
- **`mockApi()`** — fluent handler builder:
  `mockApi().get(url).reply(200, body).post(url2).reply(201).handlers()`.
  `body`: `string` → text, `ArrayBuffer` / typed array → binary, anything else →
  JSON, omitted → empty.
- **`presets`** — ready-made handlers for the failure modes node authors get
  wrong: `rateLimited(path)` (429 + `Retry-After: 1`), `timeout(path)` (never
  settles — set a bounded request `timeout`), `flakyThenSuccess(path, n, body?)`
  (503 for the first `n` calls, then 200).
- **`createMockHttpExecuteFunctions(options?)`** — `@n8n-probe/core`'s mock
  context with `helpers.httpRequest` wired to a real axios client, so a node's
  outbound calls are actually intercepted. Same options as
  `createMockExecuteFunctions`.
- **`performHttpRequest(node, options)`** — the axios-backed
  `helpers.httpRequest` stand-in on its own. Maps the common `IHttpRequestOptions`
  fields; a non-2xx response (unless `ignoreHttpStatusErrors`) or a transport
  failure is thrown as `NodeApiError`.

## WireMock tier (opt-in, needs Docker — `pnpm test:e2e:full`)

- **`startWireMock({ mappingsDir?, image? })`** — boots `wiremock/wiremock` via
  `testcontainers` and returns `{ baseUrl, stop() }`. Use it for reusable stub
  mappings, latency and fault injection, or cross-language contract stubs.
  `testcontainers` is an optional peer dependency. Always `await stop()`.

MSW vs WireMock: MSW is in-process, millisecond-fast and needs no Docker — use it
for the default suite. WireMock is a real HTTP server in a container — use it when
the stubs must be shared across teams or languages, or when you need realistic
network behaviour (latency, connection resets, proxying, record & replay).

---

Part of [n8n-probe](../../README.md). Not affiliated with n8n GmbH.
