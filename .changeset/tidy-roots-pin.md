---
'@n8n-probe/core': minor
---

Add `@n8n-probe/core/vitest` with `n8nProbeVitestConfig()`, the Vitest settings
a project needs to use the toolkit: it pins `n8n-workflow` to the CommonJS build
n8n nodes load (its ESM build cannot be loaded by Node, and two copies break
`instanceof` between a node and its test) and inlines `@n8n-probe/*` so the pin
applies inside the toolkit. Merge it into `vitest.config.ts` — see the README.
