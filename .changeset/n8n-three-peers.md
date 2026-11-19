---
'@n8n-probe/core': patch
'@n8n-probe/unit': patch
'@n8n-probe/mock-http': patch
'@n8n-probe/e2e': patch
'@n8n-probe/otel': patch
---

Accept n8n 3 in the peer ranges: `n8n-workflow` (and `n8n-core` for `e2e`) is now `^2.16.0 || ^3.0.0`. The toolkit is already built and tested against n8n 3, so projects on n8n 3 no longer hit a peer-dependency conflict on install.
