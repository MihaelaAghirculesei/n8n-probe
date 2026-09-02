import { defineConfig } from 'vitest/config';

// Fast tier: everything except the opt-in full-instance suite.
export default defineConfig({
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
});
