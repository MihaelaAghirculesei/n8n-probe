---
'@n8n-probe/core': patch
'@n8n-probe/unit': patch
'@n8n-probe/mock-http': patch
'@n8n-probe/e2e': patch
'@n8n-probe/otel': patch
'@n8n-probe/metrics': patch
---

Fix `repository.url` in each package manifest: it pointed at
`github.com/n8n-probe/n8n-probe`, a path that was never claimed, instead of
where the repository actually lives
(`github.com/MihaelaAghirculesei/n8n-probe`). Broken "Repository" link on
npm, and would have failed/mislabeled npm provenance attestation at the
first publish. No API change.
