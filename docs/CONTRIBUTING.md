# Contributing to n8n-probe

Thanks for taking the time to contribute.

## Prerequisites

- Node.js `>= 22.22` (`.nvmrc` pins the major to `22`)
- pnpm `>= 11` — `corepack enable` then `corepack use pnpm@11` is the easiest
  way to get the pinned version

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

## Repository layout

```
packages/       published libraries (@n8n-probe/*)
apps/           non-published apps and fixtures
docs/           ARCHITECTURE.md (why) and PLAN.md (what / when)
docker/         local observability stack for manual verification
```

## Workflow

1. Branch from `main`: `git switch -c <type>/<short-description>`.
2. Make the change. Keep commits small and focused; one logical change per
   commit.
3. `pnpm lint && pnpm typecheck && pnpm test` must pass locally.
4. Add a changeset for any user-facing change: `pnpm changeset`.
5. If the change alters a design decision, update `docs/ARCHITECTURE.md` (and
   the relevant ADR) **in the same commit**.
6. Open a PR against `main`.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), imperative mood,
English:

```
<type>(<optional scope>): <summary>

<optional body explaining the why>
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`,
`chore`. Scope is usually the package name (`core`, `unit`, `e2e`, ...).

## Tests

- Fast tier runs on every `pnpm test` and in CI.
- Full-tier E2E (`pnpm test:e2e:full`) needs Docker and is opt-in — run it
  before touching `@n8n-probe/e2e`.
- New public API ships with tests covering success and failure paths.

## Code style

Prettier and ESLint are the source of truth; run `pnpm format` and
`pnpm lint:fix` before pushing. No `any` in library code.
