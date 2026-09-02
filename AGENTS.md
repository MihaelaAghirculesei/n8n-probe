# AGENTS.md — working agreement for this repository

Read this before working in the repo — contributors and AI coding agents alike.
It is the short, non-negotiable summary. Rationale lives in
`docs/ARCHITECTURE.md`; the ordered backlog lives in `docs/PLAN.md`. When any of
the three disagree, fix them in the same commit — the plan, the design, and the
code must not diverge silently.

---

## Mission

`n8n-probe` is a **testing and observability toolkit for n8n custom nodes and
workflows**. It packages, as a reusable public library, the patterns n8n keeps
internal: a typed mock execution context, node unit-test helpers, HTTP mocking
presets, an in-process workflow runner (plus an opt-in real-instance tier), and
drop-in OpenTelemetry tracing + Prometheus metrics for node executions.

It is **not** an n8n node. It must never claim the reserved `n8n-nodes-*`
package prefix except for the throwaway fixture app (see below).

## Language

All code, comments, identifiers, docs, commit messages, changesets and
community posts are in **English**. The project lives in an English-speaking
ecosystem (n8n source, npm, `community.n8n.io`); mixing languages guarantees
drift between docs and reality. Chat with the maintainer can be any language;
anything written to the repo is English.

---

## Non-negotiable constraints

These were verified against the live npm registry on 2026-09-01. Re-verify with
`npm view <pkg> version` before a fresh install — a few months of drift is
expected — but do not "upgrade to latest" past these ceilings without updating
the relevant ADR first.

### Runtime

- **Node.js `>=22.22 <25`.** n8n supports Node `20.19`–`24.x`; `@n8n/node-cli`
  needs `>=22.22`. Develop and pin CI's primary job on **Node 22 LTS**; also
  test on Node 24.
- **pnpm** — this is a pnpm workspace. Use the version in `packageManager`
  (`pnpm@11.22.0`). Never `npm install` or `yarn` here.

### Language / toolchain

- **TypeScript `~5.9.3`. Do NOT move to TypeScript 6 or 7 (`tsgo`).**
  `typescript-eslint` (current stable) caps its peer range below `6.1.0`;
  adopting TS 6/7 breaks type-aware linting and is untested against every n8n
  type package. Revisit only when `typescript-eslint` ships a peer range that
  includes it.
- **`turbo.json` uses the `"tasks"` key**, never `"pipeline"` (removed in
  Turborepo 2.0).
- `tsc` runs in `strict` mode with `noUncheckedIndexedAccess`.

### Testing

- **Vitest `^4`. Never a `5.x` pre-release** — do not run a beta test runner.
- **`vitest-mock-extended` `^5`** for deep, type-safe `IExecuteFunctions`
  mocking (the `jest-mock-extended` equivalent n8n's own node tests use).
- **MSW `^2.15`** for in-process HTTP mocking.
- For cross-service HTTP mocking use **`testcontainers` + the official
  `wiremock/wiremock` Docker image**. Do **not** depend on
  `@wiremock/wiremock-testcontainers-node` (stuck at `0.0.1`, abandoned).
- Never assert exact span durations or timings — use ranges/thresholds. Timing
  assertions are flaky by design.

### Observability

- **Metrics go through the OpenTelemetry Metrics API only** and are exposed in
  Prometheus format via `@opentelemetry/exporter-prometheus`. See ADR-0003.
- **Do NOT install `prom-client`** (deprecated by its author) **or
  `@prometheus-io/client`.** One instrumentation call site emits both the span
  and the metric update; there is no second registry.
- Use the **stable OpenTelemetry 2.x packages** (`@opentelemetry/api ^1.9`,
  `@opentelemetry/sdk-trace-node ^2.x`, `@opentelemetry/sdk-metrics ^2.x`,
  `@opentelemetry/exporter-prometheus ^2.x`, `@opentelemetry/instrumentation-http`).
  Do **not** depend on `@opentelemetry/sdk-node` (still `0.x`, marked
  experimental). Compose the SDK from the stable parts.

### Release / supply chain

- Publish via **Changesets + npm Trusted Publishing (OIDC)** with provenance
  attestation on. **No static `NPM_TOKEN` secret** — npm is restricting
  token-based publish, and provenance is already mandatory for n8n community
  nodes (since 2026-05-01). The release workflow needs `id-token: write`.
- `@n8n-probe/*` packages are `0.x`; minor bumps may break. Every published
  package ships `README.md`, `LICENSE`, `files`, `exports`, `sideEffects: false`
  and `repository`/`homepage` metadata.

### Scope discipline (v1)

- v1 fully supports **programmatic-style nodes** (explicit `execute()`).
  **Declarative/routing nodes are best-effort only** — the mock context must not
  break on them, but they are documented as "not fully supported in v1"
  (ADR-0005). Do not half-implement them silently.
- Cover **n8n-specific semantics** that most authors get wrong: `pairedItem`
  propagation through a chain, `continueOnFail`, node `typeVersion`. Not just
  the happy path.
- Do not add Jest compat, a CLI, a VS Code extension, or declarative support to
  v1. Ship a solid `0.1.0` with a written roadmap instead.

---

## Repository layout

```
packages/
  core/        typed mock IExecuteFunctions context + data/binary fixtures
  unit/        executeNode(NodeClass, {...}) + output/error assertions   (depends on core)
  mock-http/   MSW builder + presets + WireMock-via-testcontainers helper
  e2e/         workflow() builder; runWorkflow (fast, in-process) + runWorkflowInFullInstance (Docker, opt-in)
  otel/        initTracing() + traced() wrapper + expectSpan() for tests
  metrics/     initMetrics() + instrument(nodeType); Prometheus exposition via OTel exporter
apps/
  example-node/  a real fixture node — package name "n8n-nodes-probe-example", NOT published,
                 used as the fixture across unit / mock-http / e2e / otel / metrics tests
docker/          docker-compose demo: n8n + Prometheus + Grafana + Jaeger
docs/            ARCHITECTURE.md (ADRs + API sketches + config templates), PLAN.md (ordered backlog)
.github/         CI workflow, issue/PR templates, branch-protection ruleset as code
```

Package dependency direction: `core` ← `unit`; `core` + `n8n-workflow`/`n8n-core`
← `e2e`. Keep it a DAG — no cycles. Each library is independently installable.

---

## Conventions

- **Commits: Conventional Commits** (`feat(core): …`, `fix(e2e): …`,
  `chore: …`, `docs: …`, `build: …`, `ci: …`, `style: …`). Update the
  `docs/PLAN.md` checkbox for a task in the same commit that lands it.
- **A behaviour change touches three things together**: the code, its tests,
  and the docs (`ARCHITECTURE.md` / package `README.md` / `PLAN.md`).
- **Changesets**: every user-facing change to a published package gets a
  changeset. `apps/example-node` is excluded from versioning.
- **Public API**: no `any` (`@typescript-eslint/no-explicit-any: error`),
  explicit return types on exported functions, `consistent-type-imports`.
- **Tests**: co-located `*.test.ts` for the fast tier; `*.full.test.ts` +
  `vitest.full.config.ts` for the opt-in Docker tier. Every public export has
  tests; aim for 100% of the public surface exercised, >90% line coverage on
  `core` and `unit`.
- **No open handles** at the end of a test suite; timeouts on every network
  wait; an unmatched MSW handler must fail loudly, never hang.
- README carries an explicit **non-affiliation disclaimer**. "n8n" is a
  trademark of n8n GmbH — nominative use only, never the logo or wordmark.

## Definition of Done (per task)

1. `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck
&& pnpm test` all green on a clean checkout.
2. New/changed public API has tests and a copy-pasteable example in the
   package `README.md`.
3. `docs/PLAN.md` checkbox ticked; `docs/ARCHITECTURE.md` / ADRs updated if a
   decision changed; a changeset added if a published package changed.
4. CI green on Node 22 and 24. The full E2E tier is **not** required per PR.

## Definition of Done (v1 / `0.1.0`)

- `pnpm install --frozen-lockfile` green in CI on Node 22 and 24.
- The toolkit is dogfooded on `apps/example-node` across all four pillars
  (unit, e2e fast + full, tracing/metrics).
- The package `exports`/`types`/`main` are verified by installing a
  `pnpm pack` tarball into a **fresh external project** generated by
  `npm create @n8n/node` — not only from inside this monorepo.
- `docker compose up` brings the demo stack live in under ~2 minutes with a
  pre-provisioned Grafana dashboard and traces landing in Jaeger.
- Docs site (or a thorough root README section) covers a 5-minute quickstart,
  one guide per pillar, the ADRs, and a comparison table.

---

## Current state

Branch `milestone/0-foundation`. Milestone 0 (repository foundation) is
essentially complete — workspace, shared TS config, ESLint/Prettier, Changesets,
all six package skeletons with typed stubs + tests, `apps/example-node`, CI, a
committed lockfile, the docker demo stack, and ADR-0001…0006. Next up is
Milestone 1 (`@n8n-probe/core` real implementation). See `docs/PLAN.md`.
