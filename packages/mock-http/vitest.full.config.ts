import { defineConfig } from 'vitest/config';

// Opt-in Docker tier: only `*.full.test.ts`, run via `pnpm test:e2e:full`.
// Needs a running Docker daemon; never part of `pnpm test`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.full.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
