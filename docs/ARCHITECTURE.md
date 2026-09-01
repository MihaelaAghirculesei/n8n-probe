# ARCHITECTURE.md — ADRs, package APIs, config templates

This document records the design decisions behind `n8n-probe`. It is the
authority on *why* things are shaped the way they are; `docs/PLAN.md` tracks
*what* is built and in which order.

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
- **pnpm `11.25.0`**, Node engine `>=22.22`, `@types/node ^22` (tracks the
  minimum supported Node, not `latest`).
- **`prom-client` is not a dependency** — see ADR-0003.

**Consequences.** Every version in the config templates below reflects the
2026-09-01 verification, not the original draft. Re-verify with
`npm view <pkg> version` before a fresh install; a few months of drift is
expected in this ecosystem. Silently shipping stale numbers is not acceptable.

---

## Package public APIs (sketch — refine signatures during implementation)

### `@n8n-probe/core`

```ts
export function createMockExecuteFunctions(
  overrides?: Partial<IExecuteFunctions>,
): IExecuteFunctions;

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

### `@n8n-probe/unit`

```ts
export async function executeNode<T extends new () => INodeType>(
  NodeClass: T,
  options: {
    input?: INodeExecutionData[];
    params?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  },
): Promise<INodeExecutionData[][]>;

export function expectNodeOutput(result: INodeExecutionData[][], expected: unknown[]): void;

export async function expectNodeError(
  promise: Promise<unknown>,
  matcher: { message?: string | RegExp; instanceOf?: new (...args: never[]) => Error },
): Promise<void>;
```

### `@n8n-probe/mock-http`

```ts
export function mockApi(): MockApiBuilder; // .get(path).reply(status, body) fluent chain
export function setupMswForTest(handlers?: RequestHandler[]): void; // wires beforeAll/afterEach/afterAll

export const presets: {
  rateLimited(path: string): RequestHandler;
  timeout(path: string): RequestHandler;
  flakyThenSuccess(path: string, failuresBeforeSuccess: number): RequestHandler;
};

export function startWireMock(options?: {
  mappingsDir?: string;
}): Promise<{ baseUrl: string; stop(): Promise<void> }>;
```

### `@n8n-probe/e2e`

```ts
export function workflow(): WorkflowBuilder; // .addNode({...}).connect(a, b).build()

export async function runWorkflow(
  workflowBase: IWorkflowBase,
  options?: { credentials?: Record<string, unknown>; mode?: WorkflowExecuteMode },
): Promise<IRun>;

export async function runWorkflowInFullInstance(
  workflowBase: IWorkflowBase,
  options?: { image?: string },
): Promise<IRun>;

export function expectWorkflowSuccess(run: IRun): void;
export function getNodeOutput(run: IRun, nodeName: string): INodeExecutionData[];
```

### `@n8n-probe/otel`

```ts
export function initTracing(options: {
  serviceName: string;
  exporter: 'console' | 'otlp-http';
  otlpEndpoint?: string;
}): () => Promise<void>; // returns shutdown()

export function traced<Fn extends (...args: never[]) => Promise<unknown>>(nodeExecuteFn: Fn): Fn;

export function expectSpan(
  spans: ReadableSpan[],
  matcher: { name: string; attributes?: Record<string, unknown> },
): void;
```

### `@n8n-probe/metrics`

```ts
export function initMetrics(options: {
  port?: number; // default 9464
  endpoint?: string; // default '/metrics'
}): () => Promise<void>; // returns shutdown()

export function instrument(nodeType: string): {
  recordExecution(status: 'success' | 'error', durationSeconds: number): void;
};
```

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

  release:
    needs: build
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: write
      id-token: write # required for npm OIDC trusted publishing
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
