---
'@n8n-probe/core': minor
---

**Breaking:** `getNodeParameter` on the mock context now throws when the value
holds an n8n expression (a string starting with `=`, at any depth) instead of
returning the raw string, which let a node under test run on input no real
execution would give it. Pass the resolved value in `params`, or run the node
through `@n8n-probe/e2e`'s `runWorkflow`, which evaluates expressions with n8n's
own engine.
