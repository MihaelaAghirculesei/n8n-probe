import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.base.mjs';

// Full tier: boots a real n8n container. Slow, needs Docker, opt-in only.
// Merges the base config because the suite also runs the in-process tier
// against the CJS fixture to compare the two.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.full.test.ts'],
      testTimeout: 120_000,
      hookTimeout: 300_000,
    },
  }),
);
