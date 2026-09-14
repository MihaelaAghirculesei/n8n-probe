# @n8n-probe/mock-http

## 0.1.0

### Minor Changes

- ef80f89: Implement the HTTP mocking pillar (Milestone 3).
  
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

### Patch Changes

- 999674a: Bump `axios` from `1.15.0` to `1.20.0` (already within the existing
  `^1.15.0` range; the lockfile was just stale). Closes 28 published advisories
  against `1.15.0` (11 high, 16 moderate, 1 low) — prototype pollution, SSRF via
  `NO_PROXY`/proxy handling, ReDoS, and credential/header leaks. No API change.
- 057c4dc: Fix `repository.url` in each package manifest: it pointed at
  `github.com/n8n-probe/n8n-probe`, a path that was never claimed, instead of
  where the repository actually lives
  (`github.com/MihaelaAghirculesei/n8n-probe`). Broken "Repository" link on
  npm, and would have failed/mislabeled npm provenance attestation at the
  first publish. No API change.
- 73aa201: Add `homepage` to each package manifest, pointing at its directory on
  GitHub. Closes the last gap in Milestone 9's "every package ships
  `repository`/`homepage` metadata" checklist item. No API change.
- Updated dependencies [7375029]
- Updated dependencies [057c4dc]
- Updated dependencies [61cc09e]
- Updated dependencies [73aa201]
  - @n8n-probe/core@0.1.0
