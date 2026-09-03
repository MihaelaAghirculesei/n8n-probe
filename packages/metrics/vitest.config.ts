import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.base.ts';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
      coverage: {
        reporter: ['text', 'json-summary', 'html'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts'],
      },
    },
  }),
);
