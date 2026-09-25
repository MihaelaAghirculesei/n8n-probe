# Contributing

Thanks for your interest in `n8n-probe`.

The full working agreement — mission, language rules, toolchain constraints,
CI rules, and how a change should be structured — lives in
[`AGENTS.md`](AGENTS.md). Read it before opening a PR; it applies to human
contributors and AI coding agents alike.

Quick start:

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

- Branch off the latest `main`.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
  messages.
- Keep code, tests, and docs in the same commit.
- Add a [changeset](https://github.com/changesets/changesets) (`pnpm changeset`)
  for any user-facing change to a published package.
- Open the PR against `main`; the `ci` check must be green before it can merge.

For anything security-related, see [`SECURITY.md`](SECURITY.md) instead of
opening a public issue.
