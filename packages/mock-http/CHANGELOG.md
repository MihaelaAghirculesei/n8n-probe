# @n8n-probe/mock-http

## 0.2.0

### Minor Changes

- 03dbba9: **Breaking:** `core`, `unit` and `mock-http` no longer ship a CommonJS build. Those builds never loaded, because they `require()` Vitest and Vitest cannot be required. Vitest test files already used the ESM build, so they are unaffected. `@n8n-probe/core/vitest` keeps its CommonJS build for config files in CommonJS projects. TypeScript test files in a CommonJS project still type-check with `moduleResolution` `node` (n8n's node starter) or `nodenext`. With `node16`, switch to `nodenext` or use `.mts` test files.
- 2576bb4: **Breaking:** move to MSW 3 and make `msw` a peer dependency (`^3.0.0`) instead of a bundled one. Tests build handlers with their own `msw` import, and `setupMswForTest` / `presets` take and return MSW types, so both sides must share one copy. Install it yourself: `pnpm add -D msw`, and follow the [MSW 3 migration guide](https://mswjs.io/docs/migrations/2.x-to-3.x) for your own handlers. `setupMswForTest` still fails a test on an unmatched request; MSW 3 renamed the option to `onUnhandledFrame: 'error'`.

### Patch Changes

- Updated dependencies [87f0a40]
- Updated dependencies [03dbba9]
  - @n8n-probe/core@0.3.0

## 0.1.2

### Patch Changes

- a06ed38: Accept Vitest 5 as a peer (`^4.0.0 || ^5.0.0`). A fresh `vitest` install now resolves 5.x, which reported an unmet peer and made npm 10 crash during install.
- Updated dependencies [a06ed38]
  - @n8n-probe/core@0.2.1

## 0.1.1

### Patch Changes

- Updated dependencies [61de552]
- Updated dependencies [1310b3e]
- Updated dependencies [99e69d5]
  - @n8n-probe/core@0.2.0

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
