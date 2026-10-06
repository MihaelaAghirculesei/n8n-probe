# n8n-probe

[![CI](https://github.com/MihaelaAghirculesei/n8n-probe/actions/workflows/ci.yml/badge.svg)](https://github.com/MihaelaAghirculesei/n8n-probe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A testing and observability toolkit for [n8n](https://n8n.io) custom nodes and
workflows.

`n8n-probe` gives node authors the tooling that n8n's own repository keeps
internal: a typed mock execution context, ergonomic node unit-test helpers,
HTTP mocking presets, an in-process workflow runner for fast end-to-end tests
(with an opt-in real-instance tier), and drop-in OpenTelemetry tracing plus
Prometheus metrics for node executions.

> **Status:** early development. The public API is still moving; every package
> is `0.x` and follows [semver](https://semver.org) for breaking changes within
> the `0.x` range (minor bumps may break).

## Packages

| Package                                      | Version                                                                                                         | Purpose                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [`@n8n-probe/core`](packages/core)           | [![npm](https://img.shields.io/npm/v/@n8n-probe/core)](https://www.npmjs.com/package/@n8n-probe/core)           | Typed mock `IExecuteFunctions` context and data/binary fixtures                                |
| [`@n8n-probe/unit`](packages/unit)           | [![npm](https://img.shields.io/npm/v/@n8n-probe/unit)](https://www.npmjs.com/package/@n8n-probe/unit)           | Execute a single node class with inputs/params and assert on its output                        |
| [`@n8n-probe/mock-http`](packages/mock-http) | [![npm](https://img.shields.io/npm/v/@n8n-probe/mock-http)](https://www.npmjs.com/package/@n8n-probe/mock-http) | HTTP mocking helpers and presets (rate-limit, timeout, flaky) built on MSW                     |
| [`@n8n-probe/e2e`](packages/e2e)             | [![npm](https://img.shields.io/npm/v/@n8n-probe/e2e)](https://www.npmjs.com/package/@n8n-probe/e2e)             | Build and run whole workflows: fast in-process by default, real Docker instance opt-in         |
| [`@n8n-probe/otel`](packages/otel)           | [![npm](https://img.shields.io/npm/v/@n8n-probe/otel)](https://www.npmjs.com/package/@n8n-probe/otel)           | OpenTelemetry tracing for node executions and span assertions for tests                        |
| [`@n8n-probe/metrics`](packages/metrics)     | [![npm](https://img.shields.io/npm/v/@n8n-probe/metrics)](https://www.npmjs.com/package/@n8n-probe/metrics)     | Execution metrics recorded through the OpenTelemetry Metrics API, exposed in Prometheus format |

## Requirements

- Node.js `>= 22.22`
- pnpm `>= 11` (this is a pnpm workspace)

## Quick start

```bash
pnpm add -D @n8n-probe/unit @n8n-probe/core vitest n8n-workflow
```

Add the toolkit's Vitest settings once, in `vitest.config.ts`:

```ts
import { n8nProbeVitestConfig } from '@n8n-probe/core/vitest';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(n8nProbeVitestConfig(), defineConfig({ test: {} }));
```

It pins `n8n-workflow` to the CommonJS build your nodes already load — its ESM
build cannot be imported by Node directly, and two copies would break
`instanceof NodeOperationError` between a node and its test
([ADR-0014](docs/ARCHITECTURE.md)). Then:

```ts
import { executeNode, expectNodeOutput } from '@n8n-probe/unit';
import { MyNode } from '../nodes/MyNode/MyNode.node';

it('uppercases the name field', async () => {
  const result = await executeNode(MyNode, {
    input: [{ json: { name: 'ada' } }],
    params: { field: 'name' },
  });

  expectNodeOutput(result, [{ name: 'ADA' }]);
});
```

## End-to-end testing tiers

1. **Fast tier** (`pnpm test`) runs workflows in-process via `n8n-workflow` /
   `n8n-core` — real execution semantics, unit-test speed, no server or
   database.
2. **Full tier** (`pnpm test:e2e:full`) boots the official `n8nio/n8n` Docker
   image via `testcontainers`, installs your built node package into it, and
   runs the same workflow definition there. Opt-in; excluded from the default
   test run and the default CI job. See [`@n8n-probe/e2e`](packages/e2e#full-tier-a-real-n8n-instance-opt-in).

## Compatibility

What the toolkit is built and tested against. CI runs the fast tier on every
PR, the full tier nightly, and a nightly job that re-resolves the n8n packages
to their `latest` release to catch upstream breakage early.

| Dependency                       | Supported                         | Verified                  |
| -------------------------------- | --------------------------------- | ------------------------- |
| Node.js                          | `>= 22.22 < 25`                   | 22, 24                    |
| `n8n-workflow` (peer)            | `^2.16.0`                         | 2.16.0 + nightly `latest` |
| `n8n-core` (peer, `e2e`)         | `^2.16.0`                         | 2.16.1 + nightly `latest` |
| `n8nio/n8n` image (full tier)    | pinned default, override per run  | 2.41.7                    |
| Vitest (peer)                    | `^4.0.0`                          | 4.1                       |
| `testcontainers` (optional peer) | `^12.0.0` — only for Docker tiers | 12.1                      |

**Node styles:** programmatic nodes (an explicit `execute()`) are fully
supported. Declarative/routing nodes are not yet — `executeNode` rejects them
with a clear error ([ADR-0005](docs/ARCHITECTURE.md), [roadmap](docs/PLAN.md#roadmap-after-020)).
Jest is not supported; the mocks are built on Vitest, and the packages that
depend on it (`core`, `unit`, `mock-http`) are usable from Vitest test files
only — Vitest 4 cannot be `require()`d.

**npm 10:** installing `vitest@4` with npm 10.9 can crash with `Cannot read
properties of null (reading 'edgesOut')` (an npm resolver bug, reproduced
without any `@n8n-probe/*` package). npm 11 or pnpm install it fine.

## Development

```bash
pnpm install
pnpm build      # turbo run build
pnpm test       # turbo run test  (fast tier only)
pnpm lint
pnpm typecheck
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the design decisions and
[`docs/PLAN.md`](docs/PLAN.md) for the implementation roadmap. To see a real
trace and metric come out of a node running inside n8n's own UI, follow
[`docs/observability-walkthrough.md`](docs/observability-walkthrough.md).
Contributions are welcome — read [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)
first.

## License

[MIT](LICENSE)

## Disclaimer

`n8n-probe` is an independent open-source project and is **not affiliated with,
endorsed by, or sponsored by n8n GmbH**. "n8n" is a trademark of n8n GmbH; it is
used here only nominatively to describe what this toolkit is compatible with.
