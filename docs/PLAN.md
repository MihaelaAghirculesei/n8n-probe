# PLAN.md — implementation roadmap

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done

This file tracks *what* is built and in which order. Rationale lives in
`docs/ARCHITECTURE.md`. Update the checkboxes in the same commit that lands the
work.

---

## Milestone 0 — repository foundation `[~]`

- [x] Repository init, base tooling config (`.gitignore`, `.editorconfig`, `LICENSE`)
- [x] README with scope and non-affiliation notice
- [x] pnpm workspace + Turborepo pipeline
- [x] Shared TypeScript config
- [x] ESLint (flat) + Prettier
- [x] Changesets
- [x] `docs/ARCHITECTURE.md` + `docs/PLAN.md`
- [ ] `docs/CONTRIBUTING.md` + `CODE_OF_CONDUCT.md`
- [ ] Package skeletons for all six libraries (build/test/lint wired, `src/index.ts` typed stubs)
- [ ] `apps/example-node` skeleton
- [ ] CI workflow (build/lint/typecheck/test matrix)
- [ ] `pnpm install` produces a committed lockfile; `pnpm build` + `pnpm test` green on stubs

Exit criteria: `pnpm install && pnpm build && pnpm lint && pnpm test` all pass
on a clean checkout with only placeholder implementations.

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
- [ ] `runWorkflow(workflowBase, options?)` — fast tier: construct `Workflow`
      + `WorkflowExecute` from `n8n-workflow` / `n8n-core`, run with a
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

- [ ] `initTracing({ serviceName, exporter, otlpEndpoint? })` — `NodeSDK` from
      `@opentelemetry/sdk-node`, `console` or `otlp-http` span exporter; returns
      an async `shutdown()`.
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
