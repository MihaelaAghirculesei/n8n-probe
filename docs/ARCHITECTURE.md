# ARCHITECTURE.md — ADRs, package APIs, config templates

This document records the design decisions behind `n8n-probe`. It is the
authority on _why_ things are shaped the way they are; `docs/PLAN.md` tracks
_what_ is built and in which order.

If something here conflicts with what is learned during implementation (an API
that does not exist as sketched, a peer-dependency conflict, etc.), update this
file and the relevant ADR in the same commit — the plan and the code must not
diverge silently.

---

## ADRs

### ADR-0001: Monorepo tooling — pnpm workspaces + Turborepo (not Nx)

**Context.** Six library packages plus one example app with interdependencies
(`unit` depends on `core`, `e2e` depends on `core` and on
`n8n-workflow` / `n8n-core`, etc.). Incremental build/test caching is needed.

**Decision.** pnpm workspaces for dependency management, Turborepo for task
orchestration and caching. Not Nx: its generators/plugins ecosystem targets
larger, more heterogeneous monorepos than this project needs. Turborepo's task
config is enough to express `build → test → lint` ordering and cache hits
without extra conceptual overhead for outside contributors.

**Consequences.** Simple onboarding for the TS OSS ecosystem (pnpm + turbo is a
well-known pairing). Revisit if the project ever needs code generation or a
plugin system of its own.

### ADR-0002: Test runner — Vitest 4.x (not Jest)

**Context.** n8n's own `nodes-base` still uses Jest for historical reasons, but
n8n's newer internal tooling (`@n8n/node-cli`) has moved to Vitest, and Vitest
is the modern, ESM-native default for new TypeScript libraries.

**Decision.** Vitest `^4` (not any `5.x` pre-release — do not run a beta test
runner). `vitest-mock-extended` provides `jest-mock-extended`-equivalent deep,
type-safe mocking of `IExecuteFunctions`.

**Consequences.** Contributors coming from n8n's Jest-based node tests will find
the mocking API familiar (`vitest-mock-extended` mirrors `jest-mock-extended`
almost 1:1) but the runner differs — call this out in the Getting Started guide.

### ADR-0003: OpenTelemetry Metrics as the single source of truth, not a separate Prometheus client

**Context.** The literal reading of "tracing with OpenTelemetry and metrics
exported to Prometheus" is: add OTel for tracing and, separately, a Prometheus
client for metrics. That records every node execution twice, through two
instrumentation APIs, with two in-memory registries to keep in sync. Also,
`prom-client` — the obvious choice — is deprecated by its own author.

**Decision.** Record metrics once, through the OpenTelemetry Metrics API
(`@opentelemetry/sdk-metrics`), and expose them in Prometheus exposition format
via `@opentelemetry/exporter-prometheus`. No separate Prometheus client
dependency.

**Consequences.** One instrumentation call site (`instrument(nodeType)`)
produces both a span and the metric updates — nothing to diverge. If a consumer
needs a raw client registry for an existing dashboard, document how to bridge
from the OTel `MeterProvider`; do not make it the default.

### ADR-0004: Two-tier E2E strategy — fast in-process vs. opt-in full Docker instance

**Context.** "True" end-to-end testing of an n8n workflow means running it
inside a real n8n instance. Booting a full server (database, dependency graph,
startup time) for every test in every PR is slow and brittle.

**Decision.** Two tiers:

1. **Fast tier (default, part of `pnpm test`).** Build a minimal `IWorkflowBase`
   in memory and execute it directly via `Workflow` + `WorkflowExecute` from
   `n8n-workflow` / `n8n-core` — no server, no database. Exercises real
   execution semantics (data flow, `pairedItem`, error handling) at unit-test
   speed.
2. **Full tier (opt-in, `pnpm test:e2e:full`).** Boots the official `n8nio/n8n`
   Docker image via `testcontainers` for true black-box verification. Excluded
   from the default test run and the default CI job; runs on a schedule and/or
   a PR label.

**Consequences.** Local iteration stays fast; the full tier still runs
regularly, just not on every keystroke.

### ADR-0005: Declarative-style nodes — best-effort in v1, not full support

**Context.** n8n custom nodes come in two styles: programmatic (an explicit
`execute()` method — what this toolkit is built around) and declarative/routing
(parameters resolve to HTTP requests via a routing config, no `execute()` to
call directly). Fully supporting both in v1 roughly doubles the surface area of
`unit` and `e2e`.

**Decision.** v1 targets programmatic-style nodes as a first-class, fully
supported use case. Declarative-style nodes get best-effort support (the mock
context factory must not actively break on them) but are documented as not
fully covered; proper support is planned for v1.1.

**Consequences.** Clear launch scope, no "silently half-broken for half the use
cases" trap. Post-launch feedback validates whether declarative support is
actually the top follow-up before committing engineering time.

### ADR-0006: Toolchain version reconciliation (2026-09-01)

**Context.** The original plan draft pinned TypeScript `5.9.3`, ESLint `^9`,
pnpm `10.30.2` and a `turbo.json` using the `"pipeline"` key. Re-verifying
against the live npm registry on 2026-09-01 turned up drift and one hard
incompatibility.

**Decision.**

- **TypeScript is pinned to `~5.9.3`, not `latest` (`7.0.2`).** `typescript-eslint@8.69`
  (current stable) declares `peerDependencies.typescript: ">=4.8.4 <6.1.0"`.
  Adopting TypeScript 6 or 7 now would break type-aware linting. Revisit when
  `typescript-eslint` ships a release whose peer range includes 7.x.
- **ESLint `^10.9.1`.** `typescript-eslint@8.69` peer allows
  `^8.57 || ^9 || ^10`, so ESLint 10 is safe; the flat config is unchanged
  from the 9.x form.
- **`turbo.json` uses `"tasks"`, not `"pipeline"`.** The `pipeline` key was
  removed in Turborepo 2.0; `tasks` is the current name.
- **pnpm** pinned via `packageManager` to the version verified locally
  (`11.22.0`; `11.25.0` is the current npm `latest`). Node engine `>=22.22`,
  `@types/node ^22` (tracks the minimum supported Node, not `latest`).
- **`prom-client` is not a dependency** — see ADR-0003.

**Consequences.** Every version in the config templates below reflects the
2026-09-01 verification, not the original draft. Re-verify with
`npm view <pkg> version` before a fresh install; a few months of drift is
expected in this ecosystem. Silently shipping stale numbers is not acceptable.

### ADR-0007: Sharing the `apps/example-node` fixture across test packages

**Context.** `unit` (M2) and `mock-http` (M3) — and later `e2e`, `otel`,
`metrics` — drive the same real fixture nodes (`Example`, `HttpExample`) so the
examples exercise genuine node code. The fixture is a published-shape n8n
community node, which n8n loads via `require`, so it builds to **CommonJS**. The
test packages are ESM.

**Decision.**

- The fixture stays **CommonJS** (`apps/example-node`, `tsc` → `dist`, with a
  `types` field). Test packages depend on it as `n8n-nodes-probe-example`
  (`workspace:*`, dev). Turbo's `^build` ordering builds it first.
- An ESM test importing both the fixture and `n8n-workflow` would otherwise load
  the fixture's CJS `n8n-workflow` **and** the test's ESM `n8n-workflow` — two
  copies of `NodeOperationError` / `NodeApiError`, so `instanceof` fails across
  the boundary. **Every test package that imports the fixture pins
  `n8n-workflow` to one build** in its `vitest.config.ts`:
  `resolve.alias` → `createRequire(import.meta.url).resolve('n8n-workflow')`
  (the CJS build). Duplicated for now; issue #7 tracks extracting a base config.
- Alternatives rejected: importing the fixture's `.ts` source (breaks the
  package's `rootDir` and its published-shape realism); dual-building the fixture
  CJS + ESM (extra build config for a throwaway app, and the alias is still
  needed for any consumer that lands on the other format).

**`executeNode` surface (M2).** `ARCHITECTURE.md` first sketched
`executeNode(NodeClass, { input, params, credentials })`. The implementation also
takes `node` and `continueOnFail`: driving `typeVersion` branches and the
`continueOnFail` path through the public helper needs them, and the mock context
already supports them. Principle: the helper's options mirror the mock context's
options rather than exposing a deliberately narrower set.

**Consequences.** New test packages copy the alias block until issue #7 lands.
The fixture's public surface (its exported node classes) is part of the toolkit's
test contract; changing it is a breaking change for the test suites.

### ADR-0008: HTTP interception — `mock-http` supplies a real `helpers.httpRequest`

**Context.** MSW / WireMock only see a node's outbound call if
`helpers.httpRequest` actually performs a network request.
`@n8n-probe/core`'s `createMockExecuteFunctions` returns a deep mock whose
`helpers.httpRequest` is an auto-mock returning `undefined`.

**Decision.** `@n8n-probe/mock-http` owns the real HTTP path:
`performHttpRequest(node, options)` implements a faithful subset of n8n's
`helpers.httpRequest` on **axios** (the client n8n itself uses, and one MSW's
`http`/`https` interceptor catches), and `createMockHttpExecuteFunctions` returns
core's context with that wired in. `@n8n-probe/core` stays HTTP-client-free — no
`axios`/`undici` dependency, no `realHttp` flag. `n8n-core`'s full request stack
is reserved for `@n8n-probe/e2e` (M4).

**Consequences.** `@n8n-probe/unit`'s `executeNode` does not do real HTTP yet; a
node needing HTTP mocking is tested via `createMockHttpExecuteFunctions` +
`node.execute.call(ctx)`. Wiring an `httpRequest` option through `executeNode` is
a possible later convenience. `performHttpRequest` does not cover
`httpRequestWithAuthentication`, form/multipart bodies, proxy auth, or
`arrayFormat` query serialisation.

### ADR-0009: the cross-pillar dogfood suite is its own app, not inside `apps/example-node`

**Context.** Milestone 7 wires `HttpExample`'s `execute()` through one
`traced()` + `instrument()` wrapper (the "single call site" M6 deferred) and
adds a suite that drives `Example`/`HttpExample` through all five pillars
(`unit`, `mock-http`, `e2e`, `otel`, `metrics`) at once. The natural-looking
place for that suite is `apps/example-node` itself — it already owns the
fixture nodes. But `unit`, `mock-http` and `e2e` each already carry
`n8n-nodes-probe-example` as a `workspace:*` devDependency (ADR-0007); adding
those same three packages as devDependencies of `apps/example-node` closes a
cycle in the pnpm workspace graph (`unit → example-node → unit`, and likewise
for `mock-http`/`e2e`). Turborepo computes that graph once for every
`^`-prefixed task, so the cycle breaks `pnpm build` outright — not lint, not
test, `build` — with no way to scope around it per task.

**Decision.**

- `HttpExample.node.ts` gains real (non-dev) `dependencies` on
  `@n8n-probe/otel` and `@n8n-probe/metrics` — safe, since neither depends back
  on the fixture.
- The cross-pillar suite lives in a new private leaf app, `apps/dogfood`
  (`@n8n-probe/dogfood`, changesets-ignored like the fixture itself). It
  devDepends on all six packages (`core` transitively) plus
  `n8n-nodes-probe-example`; nothing depends on it, so it cannot re-introduce a
  cycle. It imports the fixture nodes as `n8n-nodes-probe-example` (the built
  CJS package), the same way every other test package does — same
  `n8n-workflow` CJS/ESM alias from ADR-0007 applies, via its own
  `vitest.config.ts` merging the shared base config.
- Alternatives rejected: a `devDependencies`-only cycle is still a cycle to
  Turborepo (tried first — `turbo run build` fails with "Cyclic dependency
  detected" naming all four packages); teaching Turborepo to ignore
  devDependencies for cycle purposes is not a supported per-task config.

**Consequences.** `apps/example-node` keeps exactly the shape ADR-0007
described (a CJS fixture, `dependencies` only on the two observability
packages it now really needs at runtime); `apps/dogfood` is the one place that
depends on the whole toolkit at once, and is where a future pillar's "does
this still work end-to-end on a real node" question gets answered.

### ADR-0010: `HttpExample` loads `@n8n-probe/otel`/`@n8n-probe/metrics` lazily, not via a top-level `import`

**Context.** After ADR-0009 made them real `dependencies`, restarting the
local docker-compose n8n (`docker/docker-compose.yml`) crashed it outright:
`Error: Cannot find module '@n8n-probe/metrics'`, `Exiting due to an error.`
That compose file bind-mounts only `apps/example-node/dist` into
`~/.n8n/custom/n8n-nodes-probe-example` — no `node_modules` alongside it —
which is fine for `n8n-workflow` (n8n supplies that itself) but not for a
workspace package the fixture now genuinely needs at runtime. Mounting the
whole repo instead of just `dist` was tried and does not fix it: on Windows,
`pnpm`'s workspace symlinks (`apps/example-node/node_modules/@n8n-probe/otel`)
are NTFS **junctions holding an absolute host path**
(`C:\Users\...\packages\otel`), which Docker Desktop's bind mount does not
resolve inside the container's filesystem namespace, no matter what else is
mounted — confirmed by reproducing the identical crash with a full-repo mount.
The real failure mode is worse than "this one node can't observe itself": a
`require()` that throws during n8n's node-type scan aborts the **entire**
n8n process at startup, taking every other node down with it.

**Decision.** `HttpExample.node.ts` never `import`s `@n8n-probe/otel` /
`@n8n-probe/metrics` at the top level. It `require()`s them once, inside a
`try`/`catch`, and falls back to an identity `traced` and a no-op `instrument`
if either throws. A real npm/pnpm install (tests, `apps/dogfood`, the host
driver, or any real deployment where these are actually installed
dependencies) resolves them normally and gets full tracing/metrics; the
docker-compose demo's node loads and runs `HttpExample` correctly, just
without instrumentation. `docker/docker-compose.yml`'s mount is back to
`dist`-only (the full-repo-mount attempt bought nothing and is slower).

**Alternatives rejected:** bundling `apps/example-node`'s build (tsup with
`noExternal` for the two packages and their `@opentelemetry/*` transitive
deps) would make the compiled node self-contained and fix this properly for
every environment, not just gracefully degrade — but it changes this
package's build tool (currently plain `tsc`, relied on by ADR-0007's
CJS/ESM-identity story) for a problem that is specific to one local demo
convenience mount on one OS. Revisit if Milestone 8's walkthrough wants the
docker-compose n8n instance to demonstrate live tracing/metrics from inside
its own UI, rather than via `apps/dogfood` and a host-side driver script (both
already prove the instrumentation works end-to-end without touching the
container).

**Consequences.** Any future dependency `HttpExample.node.ts` (or a sibling
fixture node) adds beyond `n8n-workflow` needs the same lazy-load treatment,
or the docker-compose mount needs fixing properly (real bundling, or an
`npm install` step against the mounted folder) — a plain top-level `import`
of a workspace package will reproduce this crash the moment someone next
`docker compose down && up`s with a stale `node_modules` assumption.

---

## Package public APIs (sketch — refine signatures during implementation)

### `@n8n-probe/core`

`createMockExecuteFunctions` takes an **options object** rather than a raw
`Partial<IExecuteFunctions>` (implemented in Milestone 1): the common test intent
is "these input items, these params, this node", and the returned value is a
`vitest-mock-extended` deep mock, so any member can still be refined per test
(`ctx.helpers.httpRequest.mockResolvedValue(...)`).

```ts
export interface CreateMockExecuteFunctionsOptions {
  node?: Partial<INode>; // merged over a generic default node
  input?: INodeExecutionData[]; // getInputData(); default []
  params?: Record<string, unknown>; // getNodeParameter(name, itemIndex, fallback?); flat or dotted keys
  credentials?: Record<string, unknown>; // getCredentials(type); throws for an unprovided type
  continueOnFail?: boolean; // default false
}

export function createMockExecuteFunctions(
  options?: CreateMockExecuteFunctionsOptions,
): DeepMockProxy<IExecuteFunctions>;

export function itemsFrom(json: unknown[]): INodeExecutionData[];
export function binaryFixture(input: {
  fileName: string;
  mimeType: string;
  data: Buffer;
}): IBinaryData;

export interface TestExecuteContext {
  readonly node: INode;
  readonly executeFunctions: IExecuteFunctions;
}
```

`getNodeParameter` resolves against the node's own `parameters` with the `params`
option layered on top (exact key first, then a dotted-path walk), returns the
fallback when absent, and throws when there is neither. `$parameter`-style
expression resolution is not implemented yet. `getCredentials(type)` returns the
matching entry from `credentials` and throws when the node asks for a type that
was not provided (matching a real run with unconfigured credentials).

### `@n8n-probe/unit`

```ts
export async function executeNode<T extends new () => INodeType>(
  NodeClass: T,
  options?: {
    input?: INodeExecutionData[];
    params?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
    node?: Partial<INode>; // getNode() overrides; typeVersion defaults to the description's highest
    continueOnFail?: boolean; // value of this.continueOnFail() inside the node
  },
): Promise<INodeExecutionData[][]>;

export function expectNodeOutput(
  result: INodeExecutionData[][],
  expected: unknown[],
  branch?: number, // default 0
): void;

export async function expectNodeError(
  promise: Promise<unknown>,
  matcher?: { message?: string | RegExp; instanceOf?: new (...args: never[]) => Error },
): Promise<void>;
```

`node`/`continueOnFail` were added during Milestone 2: exercising `typeVersion`
branches and the `continueOnFail` path through the public helper needs both, and
the mock context already supports them. A declarative/routing node, a node with
no `execute()`, or one returning an `EngineRequest` throws
`NodeNotExecutableError` (ADR-0005) rather than running half-way.

### `@n8n-probe/mock-http`

```ts
export function mockApi(): MockApiBuilder; // .get(path).reply(status, body?) fluent chain
export function setupMswForTest(handlers?: RequestHandler[]): SetupServer; // wires beforeAll/afterEach/afterAll, returns the server

export const presets: {
  rateLimited(path: string): RequestHandler; // 429 + Retry-After: 1
  timeout(path: string): RequestHandler; // never settles
  flakyThenSuccess(path: string, failuresBeforeSuccess: number, body?: unknown): RequestHandler;
};

// core's mock context with helpers.httpRequest wired to a real axios client
export function createMockHttpExecuteFunctions(
  options?: CreateMockExecuteFunctionsOptions,
): DeepMockProxy<IExecuteFunctions>;
// the axios-backed helpers.httpRequest stand-in on its own; non-2xx / transport
// failure -> NodeApiError. Subset of IHttpRequestOptions (no auth/form/proxy).
export function performHttpRequest(node: INode, options: IHttpRequestOptions): Promise<unknown>;

// opt-in Docker tier (testcontainers optional peer); pnpm test:e2e:full only
export function startWireMock(options?: {
  mappingsDir?: string;
  image?: string;
}): Promise<{ baseUrl: string; stop(): Promise<void> }>;
```

A node's outbound call only reaches MSW/WireMock if `helpers.httpRequest`
actually performs a request; `@n8n-probe/core`'s bare mock returns `undefined`.
`createMockHttpExecuteFunctions` is the resolution of that gap (issue #9) — the
`unit` package's `executeNode` does not wire real HTTP yet.

### `@n8n-probe/e2e`

```ts
export function workflow(name?: string): WorkflowBuilder; // .addNode({...}).connect(a, b).build()

// A structural subset of IWorkflowBase (no DB-entity fields) — what the
// in-process runner and a REST import both need.
export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: INode[];
  connections: IConnections;
  active: boolean;
  settings: IWorkflowSettings;
}

export async function runWorkflow(
  definition: WorkflowDefinition,
  options?: {
    nodeTypes?: ReadonlyArray<new () => INodeType>; // matched by description.name
    credentials?: Record<string, ICredentialDataDecryptedObject>; // getDecrypted-only
    mode?: WorkflowExecuteMode; // default 'manual'
  },
): Promise<IRun>;

// Deferred to a follow-up (issue filed). Stubbed; rejects.
export function runWorkflowInFullInstance(
  definition: WorkflowDefinition,
  options?: { image?: string },
): Promise<IRun>;

export function expectWorkflowSuccess(run: IRun): void; // names the failing node
export function getNodeOutput(run: IRun, nodeName: string, branch?: number): INodeExecutionData[];

export class ManualTrigger {} // built-in start node (data param -> first items)
export function nodeTypesFrom(classes: ReadonlyArray<new () => INodeType>): INodeTypes;
```

`runWorkflow` uses n8n's own per-node context (`n8n-core`), so `helpers.httpRequest`
is real and composes with `@n8n-probe/mock-http` (ADR-0008). Minimum viable
`IWorkflowExecuteAdditionalData`: `hooks` (an `ExecutionLifecycleHooks`), a
`getDecrypted`-only `credentialsHelper`, and non-empty base URLs (n8n does
`new URL()` on them). The entry node is the first node that is never a
connection target. `WorkflowExecute.run` takes an options object
(`{ workflow, startNode }`), not positional args.

### `@n8n-probe/otel`

```ts
export function initTracing(options: {
  serviceName: string;
  exporter: 'console' | 'otlp-http';
  otlpEndpoint?: string;
}): () => Promise<void>; // composes a NodeTracerProvider from stable 2.x parts,
// register()s it globally, returns shutdown()

export const NODE_EXECUTE_SPAN = 'n8n.node.execute';
// preserves `this`; adds n8n.node.type/.name/.type_version, n8n.item.count,
// n8n.workflow.id / n8n.execution.id when the context exposes them.
export function traced<Fn extends (this: IExecuteFunctions, ...args: never[]) => Promise<unknown>>(
  nodeExecuteFn: Fn,
): Fn;

export function expectSpan(
  spans: readonly ReadableSpan[],
  matcher: { name: string; attributes?: Record<string, unknown> },
): void;

// in-memory NodeTracerProvider registered globally; for tests
export function createTestTracing(): {
  getSpans(): ReadableSpan[];
  reset(): void;
  shutdown(): Promise<void>;
};
```

Built from `@opentelemetry/sdk-trace-node` 2.x + `@opentelemetry/resources` +
`@opentelemetry/exporter-trace-otlp-http`. **Not** `@opentelemetry/sdk-node`
(0.x, experimental) — the Milestone 0 scaffold's `package.json` listed it by
mistake; Milestone 5 replaced it. The OTLP HTTP exporter is `0.x` by upstream's
own versioning of every OTel-JS exporter, not the `sdk-node` situation ADR-0003
warns about.

### `@n8n-probe/metrics`

```ts
// async: resolves once the exposition server is listening
export function initMetrics(options?: {
  port?: number; // default 9464
  endpoint?: string; // default '/metrics'
  host?: string; // default: all interfaces
}): Promise<() => Promise<void>>; // resolves to shutdown()

export function instrument(nodeType: string): {
  recordExecution(status: 'success' | 'error', durationSeconds: number): void;
};

export const EXECUTIONS_COUNTER = 'n8n_node_executions'; // '..._total' in exposition
export const DURATION_HISTOGRAM = 'n8n_node_execution_duration_seconds';
```

`MeterProvider` + `PrometheusExporter` from `@opentelemetry/sdk-metrics` 2.x /
`@opentelemetry/exporter-prometheus` (0.x by upstream's exporter versioning).
No `prom-client`, no `@opentelemetry/sdk-node` (ADR-0003). `initMetrics` is async
because binding a port can fail; `initTracing` (no server) stays sync.

---

## Config file templates

These reflect what is committed at the repo root. Per-package files below are
templates to copy into each new package.

### `turbo.json` (committed)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "stream",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"], "outputs": ["coverage/**"] },
    "test:e2e:full": { "dependsOn": ["build"], "cache": false },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"], "outputs": ["*.tsbuildinfo"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

### `tsconfig.base.json` (committed)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true
  }
}
```

### Per-package `tsconfig.json` (template)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "**/*.test.ts"]
}
```

### Per-package `tsup.config.ts` (template)

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
});
```

### Per-package `vitest.config.ts` (template)

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: { reporter: ['text', 'json-summary', 'html'] },
  },
});
```

### `eslint.config.mjs` (committed, sketch)

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/*.config.{js,cjs,mjs,ts}'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
    },
  },
);
```

### `.github/workflows/ci.yml` (sketch)

> **Release is not in `ci.yml`.** `ci.yml` is validation only (build / lint /
> typecheck / test, plus the opt-in `e2e-full`). The `release` job below is what
> M9 adds as a **separate** `.github/workflows/release.yml` triggered on
> `push: [main]` only. Keeping it out of the validation workflow means a release
> failure (missing npm scope, Trusted Publisher not set up, the "Allow GitHub
> Actions to create and approve pull requests" repo setting still off) can never
> turn the main-branch CI red. Until M9 there is no release workflow at all;
> `changeset` files accumulate in `.changeset/` and `pnpm version-packages` is
> run locally when a bump is wanted.

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    strategy:
      matrix:
        node: [22, 24]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build

  e2e-full:
    if: github.event_name == 'schedule' || contains(github.event.pull_request.labels.*.name, 'e2e-full')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:e2e:full # Docker is available by default on GH-hosted runners

  # M9: lives in its own .github/workflows/release.yml, `on: push: [main]`.
  release:
    needs: build
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: write
      id-token: write # required for npm OIDC trusted publishing
      pull-requests: write # Changesets opens the "Version Packages" PR
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1
        with:
          publish: pnpm release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # no NPM_TOKEN — configure npm Trusted Publisher (OIDC) on npmjs.com
```

### `docker/docker-compose.yml` (skeleton)

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    ports: ['5678:5678']
    volumes:
      - ../apps/example-node/dist:/home/node/.n8n/custom/n8n-nodes-probe-example

  prometheus:
    image: prom/prometheus:latest
    ports: ['9090:9090']
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports: ['3000:3000']
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports: ['16686:16686', '4318:4318']
```

---

## Notes for whoever (human or otherwise) picks this up

- Name availability was checked on 2026-09-01: `npm view n8n-probe` and
  `npm view @n8n-probe/core` both 404, and `github.com/n8n-probe` is 404. The
  name is clear to claim.
- n8n's license (`n8n-io/n8n`) says only "Any use of the licensor's trademarks
  is subject to applicable law"; there is no published third-party brand
  policy. "n8n" is a trademark of n8n GmbH. Usage here is nominative only, and
  the README carries an explicit non-affiliation disclaimer. Do not use the
  n8n logo or wordmark styling.
- Re-verify pinned versions with `npm view <pkg> version` before installing.
- Keep this file and `docs/PLAN.md` in sync with the code in the same commit
  that changes behaviour.
