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
pnpm add -D @n8n-probe/unit @n8n-probe/core
```

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
   image via `testcontainers` for true black-box verification. Opt-in; excluded
   from the default test run and the default CI job.

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
