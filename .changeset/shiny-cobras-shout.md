---
'@n8n-probe/mock-http': patch
---

Bump `axios` from `1.15.0` to `1.20.0` (already within the existing
`^1.15.0` range; the lockfile was just stale). Closes 28 published advisories
against `1.15.0` (11 high, 16 moderate, 1 low) — prototype pollution, SSRF via
`NO_PROXY`/proxy handling, ReDoS, and credential/header leaks. No API change.
