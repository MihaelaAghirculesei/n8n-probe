---
'@n8n-probe/e2e': minor
---

Implement the full tier: `startN8nInstance({ nodePackages })` boots the official
`n8nio/n8n` image (pinned default `DEFAULT_N8N_IMAGE`), installs your built node
packages as community packages and runs workflow definitions through n8n's CLI;
`runWorkflowInFullInstance` does boot + run + stop in one call. Both resolve
with an `IRun` that `expectWorkflowSuccess` / `getNodeOutput` accept. Node types
must be package-qualified (`n8n-nodes-my-package.myNode`) for this tier.
