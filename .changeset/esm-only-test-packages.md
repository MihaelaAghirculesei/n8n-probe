---
'@n8n-probe/core': minor
'@n8n-probe/unit': minor
'@n8n-probe/mock-http': minor
---

**Breaking:** `core`, `unit` and `mock-http` no longer ship a CommonJS build. Those builds never loaded, because they `require()` Vitest and Vitest cannot be required. Vitest test files already used the ESM build, so they are unaffected. `@n8n-probe/core/vitest` keeps its CommonJS build for config files in CommonJS projects. TypeScript test files in a CommonJS project still type-check with `moduleResolution` `node` (n8n's node starter) or `nodenext`. With `node16`, switch to `nodenext` or use `.mts` test files.
