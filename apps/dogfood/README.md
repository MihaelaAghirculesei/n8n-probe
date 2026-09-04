# @n8n-probe/dogfood

Private, unpublished. Not a library and not the fixture itself (that's
`apps/example-node`) — this is the suite that proves the five pillars
(`@n8n-probe/unit`, `@n8n-probe/mock-http`, `@n8n-probe/e2e`, `@n8n-probe/otel`,
`@n8n-probe/metrics`) actually work together against a real node, not stubs.

It lives in its own app, separate from `apps/example-node`, so that
`example-node` can stay a plain devDependency of `unit`/`mock-http`/`e2e` (its
usual direction) without those packages also becoming a dependency of
`example-node` — which would make the workspace dependency graph cyclic and
break `turbo run build`. `@n8n-probe/dogfood` depends on all six packages and
nothing depends back on it, so it stays a leaf.

```
pnpm --filter @n8n-probe/dogfood test
```
