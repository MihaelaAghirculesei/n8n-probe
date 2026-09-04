# PLAN.md — implementation roadmap

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

This file tracks _what_ is built and in which order. Rationale lives in
`docs/ARCHITECTURE.md`. Update the checkboxes in the same commit that lands the
work.

---

## Milestone 0 — repository foundation `[x]`

- [x] Repository init, base tooling config (`.gitignore`, `.editorconfig`, `LICENSE`)
- [x] README with scope and non-affiliation notice
- [x] pnpm workspace + Turborepo pipeline
- [x] Shared TypeScript config
- [x] ESLint (flat) + Prettier
- [x] Changesets
- [x] `docs/ARCHITECTURE.md` + `docs/PLAN.md`
- [x] `docs/CONTRIBUTING.md` + `CODE_OF_CONDUCT.md`
- [x] Package skeletons for all six libraries (build/test/lint wired, `src/index.ts` typed stubs)
- [x] `apps/example-node` skeleton (`n8n-nodes-probe-example`, not published)
- [x] CI workflow (build/lint/typecheck/test matrix on Node 22 + 24)
- [x] `pnpm install` produces a committed lockfile; `pnpm build` + `pnpm test` green on stubs
- [x] `AGENTS.md` at repo root (working agreement / non-negotiable constraints)
- [x] Local observability stack (`docker/docker-compose.yml`) for manual testing
- [x] ADR-0001…0006 recorded

Exit criteria: `pnpm install && pnpm build && pnpm lint && pnpm test` all pass
on a clean checkout with only placeholder implementations. — **met on
2026-09-02** (build 7/7, lint 8/8, test 14/14; `n8n-workflow@2.16.0`).

---

## Milestone 1 — `@n8n-probe/core` `[~]`

- [x] `createMockExecuteFunctions(options?)` backed by `vitest-mock-extended`
      (`mockDeep<IExecuteFunctions>()`), with sensible defaults for
      `getNode`, `getInputData`, `getNodeParameter`, `helpers.*`, `continueOnFail`,
      `logger`. Takes an options object (`node` / `input` / `params` /
      `continueOnFail`) rather than a raw `Partial<IExecuteFunctions>`; the
      returned deep mock is still mutable for per-test refinement. Architecture
      sketch updated to match.
- [x] `itemsFrom(json[])` → `INodeExecutionData[]` (wraps each entry as
      `{ json, pairedItem: { item } }`; rejects non-object entries).
- [x] `binaryFixture({ fileName, mimeType, data })` → `IBinaryData` (base64
      encode, set `fileSize`, `fileExtension`).
- [~] `getNodeParameter` resolution from a plain params object: dotted paths and
  exact-key-first matching done. `$parameter`-style expression resolution is
  deferred (needs `n8n-workflow`'s expression engine wired in) — tracked for
  a later `core` pass.
- [x] Unit tests for every export; public surface fully exercised (100% funcs,
      100% lines, >96% branches on `core`).
- [x] README with a copy-pasteable example.

Risks: n8n frequently reshapes `IExecuteFunctions`; pin `n8n-workflow` and add a
renovate/CI check that flags minor bumps for manual review.

---

## Milestone 2 — `@n8n-probe/unit` `[x]`

- [x] `executeNode(NodeClass, { input, params, credentials, node, continueOnFail })`
      — instantiates the node, builds a context via `@n8n-probe/core`, invokes
      `execute()`, returns `INodeExecutionData[][]`. `typeVersion` defaults to the
      description's highest. (`node` / `continueOnFail` added beyond the original
      sketch — see `ARCHITECTURE.md`.)
- [x] `expectNodeOutput(result, expected, branch?)` — compares
      `result[branch].map(i => i.json)` to `expected` with a readable diff.
- [x] `expectNodeError(promise, matcher)` — asserts rejection by message
      (string / RegExp) and/or `instanceOf` (e.g. `NodeApiError`, `NodeOperationError`).
- [x] Support multiple output branches (`result[branchIndex]`, `expectNodeOutput`
      `branch` argument).
- [x] Best-effort path for declarative nodes: no `execute()` + routing config
      (`requestDefaults` / `requestOperations` / property `routing`) or
      `customOperations` → `NodeNotExecutableError` (ADR-0005). `INodeTypeDescription`
      has no top-level `routing` field; those are the real signals.
- [x] Tests using the `Example` fixture node from `apps/example-node`
      (happy path, params, thrown error, `continueOnFail`, `pairedItem`).
- [x] `@n8n-probe/core`: `credentials` option wiring `getCredentials(type)`.

---

## Milestone 3 — `@n8n-probe/mock-http` `[x]`

- [x] `setupMswForTest(handlers?)` — registers a shared `setupServer`, wires
      `beforeAll(listen{onUnhandledRequest:'error'})`, `afterEach(resetHandlers)`,
      `afterAll(close)`; returns the server for per-case `server.use(...)`.
- [x] `mockApi()` fluent builder → MSW handlers
      (`.get/.post/.put/.delete(path).reply(status, body?)`).
- [x] `presets.rateLimited` (429 + `Retry-After`), `presets.timeout` (never
      settles), `presets.flakyThenSuccess(path, n, body?)` (n × 503 then 200).
- [x] `createMockHttpExecuteFunctions()` / `performHttpRequest()` — axios-backed
      `helpers.httpRequest` so a node's calls actually reach MSW (ADR-0008,
      issue #9).
- [x] `startWireMock({ mappingsDir?, image? })` via `testcontainers` +
      `wiremock/wiremock:3.13.2` → `{ baseUrl, stop() }`. Opt-in Docker tier
      (`*.full.test.ts` + `vitest.full.config.ts`, `pnpm test:e2e:full`), not in
      `pnpm test`. **Not run locally (no Docker here)** — exercised by the CI
      `e2e-full` job / a labelled PR run.
- [x] Tests: `HttpExample` fixture node driven through happy path, retry,
      persistent failure, timeout, unmatched request, `continueOnFail`.
- [x] New fixture `apps/example-node` → `HttpExample.node.ts` (calls
      `helpers.httpRequest`, retries 429/503, `NodeApiError` on give-up).

---

## Milestone 4 — `@n8n-probe/e2e` `[~]`

- [x] `workflow(name?)` builder → `WorkflowDefinition` (`.addNode`, `.connect`,
      `.build`). Returns a structural subset of `IWorkflowBase` (no DB-entity
      fields) — enough for the in-process runner and a REST import.
- [x] `runWorkflow(definition, options?)` — fast tier: `Workflow` +
      `WorkflowExecute` from `n8n-workflow` / `n8n-core`, run in-process with
      n8n's own per-node context, return `IRun`. Options: `nodeTypes` (classes,
      matched by `description.name`), `credentials` (`getDecrypted`-only),
      `mode`. `ManualTrigger` start node built in; entry node is picked as the
      first node that is not a connection target.
- [x] `expectWorkflowSuccess(run)` (names the failing node),
      `getNodeOutput(run, nodeName, branch?)`.
- [~] `runWorkflowInFullInstance(definition, { image? })` — **deferred to a
  follow-up** (issue #12). Stubbed; rejects with a clear message. The
  container + n8n import/execute + `IRun` mapping is a self-contained chunk
  that also can't be verified without Docker. ADR-0004 already frames this
  tier as opt-in / secondary.
- [x] Fast-tier tests in `pnpm test` (Example / HttpExample fixtures,
      `pairedItem` along a chain, `expectWorkflowSuccess` on a node error,
      unregistered-type error, credentials, and MSW composition via
      `@n8n-probe/mock-http`). Full-tier `*.full.test.ts` stays a skipped stub.
- [x] Shared `vitest.config.base` made a plain object + renamed `.mts` (kills the
      `UNRESOLVED_IMPORT 'vitest/config'` warning the extracted config introduced).

Subset the in-process runner does NOT reproduce (documented): the full-instance
tier is the backstop. Known gaps — trigger/webhook/poll activation, credential
`authenticate`/OAuth, sub-workflows, `$execution` resume URLs.

---

## Milestone 5 — `@n8n-probe/otel` `[x]`

- [x] `initTracing({ serviceName, exporter, otlpEndpoint? })` — `NodeTracerProvider`
      composed from stable `@opentelemetry/sdk-trace-node` 2.x (NOT
      `@opentelemetry/sdk-node`, per ADR-0003/0006 — the M0 scaffold's
      `package.json` had the wrong dep; fixed here), `console` (SimpleSpanProcessor)
      or `otlp-http` (BatchSpanProcessor) exporter; `register()`s globally;
      returns an async `shutdown()`.
- [x] `traced(nodeExecuteFn)` — wraps `execute` in an `n8n.node.execute` span
      (`NODE_EXECUTE_SPAN` const), attributes `n8n.node.type` / `.name` /
      `.type_version`, `n8n.item.count`, `n8n.workflow.id` / `n8n.execution.id`
      when available; `recordException` + error status on throw; preserves `this`
      and passes the value/rejection through.
- [x] `expectSpan(spans, { name, attributes? })` — name + attribute-subset
      match, readable failure messages, never timing.
- [x] `createTestTracing()` → `{ getSpans, reset, shutdown }` (in-memory
      `NodeTracerProvider` registered globally).
- [x] Tests: span metadata, return-value passthrough, exception + error status,
      partial-context tolerance, `expectSpan` failure paths (100% lines).

---

## Milestone 6 — `@n8n-probe/metrics` `[x]`

- [x] `initMetrics({ port?, endpoint?, host? })` — `MeterProvider` +
      `PrometheusExporter` (`@opentelemetry/exporter-prometheus`), default
      `:9464/metrics`. **async** (`Promise<() => Promise<void>>`) — resolves once
      the server is listening, so a caller/test knows the bind succeeded.
- [x] `instrument(nodeType)` → `{ recordExecution(status, durationSeconds) }`
      updating counter `n8n_node_executions_total{node_type,status}` and
      histogram `n8n_node_execution_duration_seconds{node_type,status}`.
      Instruments named without the `_total` suffix (the exporter adds it);
      exported as `EXECUTIONS_COUNTER` / `DURATION_HISTOGRAM`.
- [~] Optional single call site emitting both a span and the metric — deferred
  to Milestone 7 (dogfooding on `apps/example-node`), where a real node
  wires both. `otel` and `metrics` compose through the OTel API already.
- [x] Tests scrape `/metrics` (OS-assigned free port) and assert the exposition
      text — counter series per `node_type`/`status`, histogram
      `_count`/`_sum`/`_bucket`, 404 off-endpoint (100% lines).

No `@opentelemetry/sdk-node` / `prom-client` (ADR-0003). The M0 scaffold's
metrics deps were already correct (unlike `otel`).

---

## Milestone 7 — `apps/example-node` `[ ]`

- [ ] A small but non-trivial programmatic node (e.g. calls a public API, maps
      fields, supports `continueOnFail`, throws `NodeOperationError` on bad
      input). Named `n8n-nodes-probe-example` to follow n8n's community-node
      naming rule.
- [ ] Used as the fixture across `unit`, `mock-http`, `e2e`, `otel`, `metrics`
      tests so the examples stay real.
- [ ] Not published (ignored in Changesets config).

---

## Milestone 8 — local observability stack + docs `[ ]`

- [ ] `docker/docker-compose.yml` (n8n + Prometheus + Grafana + Jaeger).
- [ ] `docker/prometheus.yml` scrape config for the metrics endpoint.
- [ ] `docker/grafana/provisioning` datasource + one starter dashboard.
- [ ] `docs/` walkthrough: instrument the example node, run the stack, see the
      trace in Jaeger and the panel in Grafana.

---

## Milestone 9 — release readiness `[ ]`

- [ ] `pnpm install --frozen-lockfile` green in CI on Node 22 and 24.
- [ ] Every package: `README.md`, `LICENSE` field, `files`, `exports`,
      `sideEffects: false`, `repository` + `homepage` metadata.
- [ ] `@n8n-probe/*` reserved on npm (first `0.1.0` publish, possibly `--tag next`).
- [ ] npm Trusted Publisher (OIDC) configured.
- [ ] Add `.github/workflows/release.yml` (own workflow, `push: [main]` only)
      running `changesets/action` with `publish: pnpm release` and
      `permissions: contents: write, id-token: write, pull-requests: write`.
      It is **not** part of `ci.yml` — a failing release job must never redden
      the validation workflow.
- [ ] Enable **Settings → Actions → General → Workflow permissions → "Allow
      GitHub Actions to create and approve pull requests"** so Changesets can
      open its "Version Packages" PR (`can_approve_pull_request_reviews: true`).
      Without it the release job fails at PR creation.
- [ ] `CHANGELOG.md` generated via Changesets (`pnpm version-packages` locally
      until the workflow above exists; the `.changeset/*` files accumulate).
- [ ] Docs site (optional `apps/docs`) or a docs section in the root README.

---

## Open questions

- Do we need a `@n8n-probe/preset-jest` compatibility shim for teams still on
  Jest? Defer until asked (roadmap, not v1).
- Declarative-node support: confirm demand before committing to v1.1 scope.
- Should `e2e` full-tier reuse a single container across a file via a Vitest
  global setup, or one per test? Benchmark during Milestone 4.

---

## Appendix A — day-by-day schedule

The milestones above define _what_ and _in which order_. This is the same work
laid over a ~4-week calendar (~3–5 h/day; compressible to ~2 weeks full-time).
Each day ends with a verifiable check. Milestone 0 (Days 1–2) is done.

### Week 1 — foundation + the unit-testing pillar

- **Day 1 — repo bootstrap.** pnpm workspace, Turborepo, shared `tsconfig`,
  ESLint flat + Prettier, `LICENSE` (MIT), README vision, first CI job (lint +
  typecheck on Node 22/24). Pin every version. Do **not** write feature code;
  do **not** install `prom-client`. _Done when:_ `pnpm install && pnpm lint &&
pnpm typecheck` green on CI. — **complete**
- **Day 2 — architecture + ADRs.** Write the ADRs (monorepo tool, test runner,
  OTel-vs-prom-client, two-tier e2e, declarative scope, version reconciliation).
  Scaffold the six empty packages (`package.json` / `tsup.config.ts` /
  `tsconfig.json` extending the base). Define `core` types. _Done when:_ 6
  packages scaffolded, empty build passes, ADRs committed. — **complete**
- **Day 3 — mock context builder.** `core`: `createMockExecuteFunctions(overrides)`
  on `mockDeep<IExecuteFunctions>()`, sensible defaults (`getNode`,
  `continueOnFail`, `helpers.httpRequest`). `itemsFrom(json[])` fixture helper.
  _Done when:_ the factory has its own passing meta-tests.
- **Day 4 — `executeNode()` helper.** `unit`: `executeNode(NodeClass, {input,
params, credentials})` builds the context and calls `node.execute.call(ctx)`.
  `expectNodeOutput`, `expectNodeError`. Test against 2–3 fake nodes: happy
  path, thrown error, `continueOnFail`, **`pairedItem` propagation**. _Done
  when:_ >90% coverage on `core` + `unit`, working examples in the READMEs.
- **Day 5 — close pillar 1.** Explicit scope: programmatic-style nodes are
  first-class; declarative/routing nodes documented as best-effort v1.1 — not
  half-built silently. Finish the `unit` README. _Done when:_ `pnpm test` +
  CI green on Node 22 and 24.

### Week 2 — the E2E pillar (MSW + WireMock, two tiers)

- **Day 6 — fast-tier in-process runner.** `workflow().addNode().connect().build()`
  → minimal `IWorkflowBase`, executed via `Workflow` + `WorkflowExecute` from
  `n8n-workflow` / `n8n-core` — no server, no DB. Validate on a trivial
  Set→NoOp workflow. Do **not** start from full Docker.
- **Day 7 — extend the runner.** Mock credential injection, capture the full
  `IRun`, `expectWorkflowSuccess(run)`, `getNodeOutput(run, name)`. Test a
  3-node flow with `pairedItem` verified along the whole chain.
- **Day 8 — MSW wrapper.** `mock-http`: `mockApi().get('/x').reply(200, json)`,
  `setupMswForTest()` hook (kills the `beforeAll`/`afterEach`/`afterAll`
  boilerplate), presets: `rateLimited` (429 + `Retry-After`), `timeout`,
  `flakyThenSuccess(path, n)`. Wire it into the fast-tier runner.
- **Day 9 — WireMock via testcontainers.** `startWireMock()` on
  `GenericContainer('wiremock/wiremock')`, mappings from JSON files. Document
  WireMock (reusable cross-team/cross-language stubs, latency/chaos,
  record & replay) vs MSW (fast, in-process, no Docker).
- **Day 10 — full-tier Docker runner.** Real n8n via `testcontainers`
  (`n8nio/n8n`), workflow imported via REST API, execution polled. Opt-in only
  (`pnpm test:e2e:full`) — excluded from per-PR CI, runs on schedule/label. Do
  **not** run this on every PR. _Checkpoint:_ both tiers green on the example
  node.

### Week 3 — the observability pillar + demo

- **Day 11 — OTel tracing.** `otel`: `initTracing({serviceName, exporter})`,
  `traced(nodeExecuteFn)` opens a span per `execute()` with attributes
  (`n8n.node.type`, `n8n.workflow.id`, `n8n.execution.id`, `n8n.item.count`),
  `recordException`, context propagation to child HTTP calls.
- **Day 12 — tracing in the e2e runner.** Every fast-tier test emits a full
  span tree. In-memory exporter for `expectSpan(spans, {name, attributes})`;
  configurable OTLP exporter for real use. Never assert exact span timings.
- **Day 13 — metrics + Prometheus exporter.** `metrics`: `MeterProvider`,
  standard set (`n8n_node_executions_total{node_type,status}`,
  `n8n_node_execution_duration_seconds` histogram, `n8n_active_executions`
  gauge). One `instrument(nodeType)` entry point emits both trace and metrics.
  Expose via `@opentelemetry/exporter-prometheus` on `:9464/metrics`.
- **Day 14 — real example node.** A genuine community node with real logic:
  429 retry, pagination, error handling. Covered across all pillars.
- **Day 15 — demo stack.** `docker compose up` → n8n + mounted example node +
  Prometheus scraping the exporter + Grafana with a pre-built dashboard
  (exec/sec, p95 duration, error rate) + Jaeger receiving OTLP, Grafana→Jaeger
  datasource wired. Live in < 2 min. Capture screenshots/GIF now.

### Week 4 — polish, DX, release, launch

- **Day 16 — documentation.** VitePress site: 5-minute quickstart, one guide
  per pillar with copy-pasteable code, API reference (typedoc), ADR page,
  comparison table, FAQ/troubleshooting. Two GIFs (terminal + Grafana).
- **Day 17 — CI/CD hardening.** Node 22/24 matrix (+ optional
  `windows-latest`), separate `lint`/`typecheck`/`unit`/`e2e-fast`/
  `e2e-full` (scheduled)/`build` jobs, Codecov + badge, dependency scan,
  Renovate/Dependabot, PR/issue templates. Release via Changesets + **OIDC
  trusted publishing — no static `NPM_TOKEN`**.
- **Day 18 — robustness.** Edge cases (empty array, large volumes, malformed
  credentials, unmatched MSW handler → clear error, not a hang), timeouts
  everywhere, zero open handles, `tsc --noEmit` strict with
  `noUncheckedIndexedAccess`. `SECURITY.md`.
- **Day 19 — external validation.** Install a `pnpm pack` tarball into a fresh
  empty project generated by `npm create @n8n/node` — outside the monorepo.
  Verify `exports`/`types`/`main` for a real consumer. Tag `v0.1.0-rc`. Do
  **not** publish `1.0.0` without this.
- **Day 20 — launch.** Publish `0.1.0` (provenance on), publish docs, README
  badges, launch post on `community.n8n.io` (show-and-tell), optional Show HN,
  3–5 well-scoped "good first issue"s, `docs/RETROSPECTIVE.md` with the roadmap
  (declarative nodes, Jest compat shim, reusable GitHub Action).

---

## Appendix B — review checklist (what a senior does / does not do)

**Do:** verify the exact n8n toolchain versions and align to them, not from
memory · write ADRs before the code · keep packages modular with an explicit
dependency DAG · dogfood on a real node before calling it done · two e2e tiers,
not everything on the heavy one · CI from Day 1 · OIDC trusted publishing now,
not as a later refactor · cover `pairedItem` / `continueOnFail` / node
versioning, not just happy paths · test `exports`/`types` from an external
project · document what v1 does **not** cover (declarative nodes).

**Do not:** install `prom-client` (deprecated) or a second Prometheus client
alongside OTel · jump to TypeScript 6/7 and break the n8n toolchain · depend on
`@wiremock/wiremock-testcontainers-node` (`0.0.1`, abandoned) · run full-Docker
e2e on every PR · publish with a static npm token · depend on experimental
`@opentelemetry/sdk-node` (`0.x`) without flagging the risk · assert exact span
timings · ship one monolithic package · leave docs for the last day · scope
creep (Jest + Vitest + declarative + CLI + VS Code extension all in v1).
