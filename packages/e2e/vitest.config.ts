import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.base.ts';

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
        exclude: ['src/**/*.test.ts'],
      },
    },
  }),
);
