---
'@n8n-probe/core': patch
'@n8n-probe/unit': patch
'@n8n-probe/mock-http': patch
---

Accept Vitest 5 as a peer (`^4.0.0 || ^5.0.0`). A fresh `vitest` install now resolves 5.x, which reported an unmet peer and made npm 10 crash during install.
