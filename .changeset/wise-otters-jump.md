---
'@n8n-probe/core': patch
'@n8n-probe/unit': patch
'@n8n-probe/mock-http': patch
'@n8n-probe/e2e': patch
'@n8n-probe/otel': patch
'@n8n-probe/metrics': patch
---

Add `homepage` to each package manifest, pointing at its directory on
GitHub. Closes the last gap in Milestone 9's "every package ships
`repository`/`homepage` metadata" checklist item. No API change.
