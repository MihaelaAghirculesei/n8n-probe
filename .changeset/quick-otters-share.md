---
'@n8n-probe/mock-http': minor
---

Implement the HTTP mocking pillar (Milestone 3).

- `setupMswForTest(handlers?)` — one shared MSW server per test file, wired to
  `beforeAll` / `afterEach` / `afterAll`, `onUnhandledRequest: 'error'`; returns
  the server for per-case `server.use(...)`.
- `mockApi()` — fluent handler builder
  (`.get/.post/.put/.delete(path).reply(status, body?)`).
- `presets` — `rateLimited` (429 + `Retry-After`), `timeout` (never settles),
  `flakyThenSuccess(path, n, body?)` (n × 503, then 200).
- `createMockHttpExecuteFunctions(options?)` / `performHttpRequest(node, options)`
  — `@n8n-probe/core`'s mock context with `helpers.httpRequest` backed by a real
  axios client, so a node's outbound calls are actually intercepted. A non-2xx
  response (unless `ignoreHttpStatusErrors`) or a transport failure is thrown as
  `NodeApiError`.
- `startWireMock({ mappingsDir?, image? })` — opt-in `testcontainers` + WireMock
  tier for real-server / contract tests; `pnpm test:e2e:full` only, never part
  of `pnpm test`.
