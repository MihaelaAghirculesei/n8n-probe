---
'@n8n-probe/mock-http': minor
---

**Breaking:** move to MSW 3 and make `msw` a peer dependency (`^3.0.0`) instead of a bundled one. Tests build handlers with their own `msw` import, and `setupMswForTest` / `presets` take and return MSW types, so both sides must share one copy. Install it yourself: `pnpm add -D msw`, and follow the [MSW 3 migration guide](https://mswjs.io/docs/migrations/2.x-to-3.x) for your own handlers. `setupMswForTest` still fails a test on an unmatched request; MSW 3 renamed the option to `onUnhandledFrame: 'error'`.
