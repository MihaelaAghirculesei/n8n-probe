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

## Milestone 1 — `@n8n-probe/core` `[ ]`

- [ ] `createMockExecuteFunctions(overrides?)` backed by `vitest-mock-extended`
      (`mockDeep<IExecuteFunctions>()`), with sensible defaults for
      `getNode`, `getInputData`, `getNodeParameter`, `helpers.*`, `continueOnFail`,
      `logger`.
- [ ] `itemsFrom(json[])` → `INodeExecutionData[]` (wraps each entry as `{ json }`,
      sets `pairedItem` index).
- [ ] `binaryFixture({ fileName, mimeType, data })` → `IBinaryData` (base64 encode,
      set `fileSize`, `fileExtension`).
- [ ] `getNodeParameter` override helper that resolves from a plain params object
      including dotted paths and `$parameter` expressions where feasible.
- [ ] Unit tests for every export; 100% of the public surface exercised.
- [ ] README with a copy-pasteable example.

Risks: n8n frequently reshapes `IExecuteFunctions`; pin `n8n-workflow` and add a
renovate/CI check that flags minor bumps for manual review.

---

## Milestone 2 — `@n8n-probe/unit` `[ ]`

- [ ] `executeNode(NodeClass, { input, params, credentials })` — instantiates the
      node, builds a context via `@n8n-probe/core`, invokes `execute()`, returns
      `INodeExecutionData[][]`.
- [ ] `expectNodeOutput(result, expected)` — compares `result[0].map(i => i.json)`
      to `expected` with a readable diff.
- [ ] `expectNodeError(promise, matcher)` — asserts rejection by message
      (string / RegExp) and/or `instanceOf` (e.g. `NodeApiError`, `NodeOperationError`).
- [ ] Support multiple output branches (`result[branchIndex]`).
- [ ] Best-effort path for declarative nodes: detect `description.routing`, skip
      with a clear "not supported in v1" error (ADR-0005).
- [ ] Tests using a fixture node from `apps/example-node`.

---

## Milestone 3 — `@n8n-probe/mock-http` `[ ]`

- [ ] `setupMswForTest(handlers?)` — registers a shared `setupServer`, wires
      `beforeAll(listen)`, `afterEach(resetHandlers)`, `afterAll(close)`.
- [ ] `mockApi()` fluent builder → MSW handlers (`.get/.post(path).reply(status, body)`).
- [ ] `presets.rateLimited` (429 + `Retry-After`), `presets.timeout` (delayed
      infinite response), `presets.flakyThenSuccess(path, n)` (n failures then 200).
- [ ] `startWireMock({ mappingsDir? })` via `testcontainers` for contract-style
      tests that need a real HTTP server; returns `{ baseUrl, stop() }`.
- [ ] Tests: drive a node that calls an external API through each preset.

---

## Milestone 4 — `@n8n-probe/e2e` `[ ]`

- [ ] `workflow()` builder → `IWorkflowBase` (`.addNode`, `.connect`, `.build`).
- [ ] `runWorkflow(workflowBase, options?)` — fast tier: construct `Workflow` + `WorkflowExecute` from `n8n-workflow` / `n8n-core`, run with a
      `NodeExecuteFunctions`-style context, return `IRun`.
- [ ] `expectWorkflowSuccess(run)`, `getNodeOutput(run, nodeName)`.
- [ ] `runWorkflowInFullInstance(workflowBase, { image? })` — full tier:
      `testcontainers` boots `n8nio/n8n`, imports the workflow via the public
      REST API, executes, polls the execution result. Gated behind
      `test:e2e:full`.
- [ ] Fast-tier tests in `pnpm test`; full-tier tests excluded by default.

Risks: the in-process runner reproduces a subset of real execution semantics.
Document which subset; the full tier is the backstop.

---

## Milestone 5 — `@n8n-probe/otel` `[ ]`

- [ ] `initTracing({ serviceName, exporter, otlpEndpoint? })` — tracer provider
      composed from the stable `@opentelemetry/sdk-trace-node` (NOT the `0.x`
      `@opentelemetry/sdk-node`, per ADR-0003/ADR-0006), `console` or `otlp-http`
      span exporter; returns an async `shutdown()`.
- [ ] `traced(nodeExecuteFn)` — wraps an `execute` function in a span named
      `n8n.node.execute`, attributes for node type / name / item count, records
      exceptions and sets span status on throw.
- [ ] `expectSpan(spans, matcher)` for tests, backed by
      `InMemorySpanExporter` + `SimpleSpanProcessor`.
- [ ] Tests assert span tree and attributes for success and error paths.

---

## Milestone 6 — `@n8n-probe/metrics` `[ ]`

- [ ] `initMetrics({ port?, endpoint? })` — `MeterProvider` +
      `PrometheusExporter` (`@opentelemetry/exporter-prometheus`), default
      `:9464/metrics`; returns async `shutdown()`.
- [ ] `instrument(nodeType)` → `{ recordExecution(status, durationSeconds) }`
      updating a counter (`n8n_node_executions_total{node_type,status}`) and a
      histogram (`n8n_node_execution_duration_seconds`).
- [ ] Optional single call site that emits both an OTel span (via `otel`) and
      the metric updates.
- [ ] Tests scrape the `/metrics` endpoint and assert exposition output.

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
- [ ] npm Trusted Publisher (OIDC) configured; release workflow enabled.
- [ ] `CHANGELOG.md` generated via Changesets.
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
