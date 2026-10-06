import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.base.mjs';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
      exclude: [...configDefaults.exclude, '**/*.full.test.ts'],
      coverage: {
        reporter: ['text', 'json-summary', 'html'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/wiremock.ts'],
        // Floors just under today's numbers: a drop fails the build, a gain is
        // locked in by raising them.
        thresholds: { lines: 90, statements: 85, functions: 95, branches: 80 },
      },
    },
  }),
);
