import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.base.ts';

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
      },
    },
  }),
);
