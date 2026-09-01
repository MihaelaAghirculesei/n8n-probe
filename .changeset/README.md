# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

- Run `pnpm changeset` to record a change and choose the semver bump for each
  affected package.
- `pnpm version-packages` consumes the pending changesets, bumps versions and
  writes `CHANGELOG.md` files.
- `pnpm release` builds every package and publishes the bumped ones.

While the toolkit is pre-1.0, use `patch` for fixes and `minor` for features
**and** for breaking changes (documented in the changeset body).
