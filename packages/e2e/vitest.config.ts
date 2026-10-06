import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.base.mjs';

// Fast tier: everything except the opt-in full-instance suite.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      exclude: ['src/**/*.full.test.ts', 'node_modules/**', 'dist/**'],
      coverage: {
        reporter: ['text', 'json-summary', 'html'],
        include: ['src/**/*.ts'],
        // full-instance.ts drives a Docker container; the full tier covers it.
        exclude: ['src/**/*.test.ts', 'src/full-instance.ts'],
      },
    },
  }),
);
