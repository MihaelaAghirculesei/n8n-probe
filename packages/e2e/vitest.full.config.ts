import { defineConfig } from 'vitest/config';

// Full tier: boots a real n8n container. Slow, needs Docker, opt-in only.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.full.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
