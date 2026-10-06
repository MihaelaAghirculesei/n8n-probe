---
'@n8n-probe/e2e': patch
---

Stop installing `testcontainers` (and the unused `@n8n-probe/core`) for every
consumer. `testcontainers` is now an optional peer dependency, needed only for
the Docker-backed full tier — add it with `pnpm add -D testcontainers` if you use
that tier.
