---
'@n8n-probe/e2e': patch
---

Fix `runWorkflow` with n8n-core 2.41+: nodes reading credentials failed with
`credentialsHelper.isCredentialUsableByNode is not a function`. The in-process
credentials helper now implements it (every credential type is usable in tests).
