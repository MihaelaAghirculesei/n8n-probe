import { createRequire } from 'node:module';

import { configDefaults, defineConfig } from 'vitest/config';

// The fixture node (`n8n-nodes-probe-example`) is built to CommonJS and does
// `require('n8n-workflow')`; these ESM tests would otherwise import the package's
// ESM build, giving two copies of classes like `NodeApiError` and breaking
// `instanceof` across the boundary. Pin the graph to the one CJS build.
const n8nWorkflowCjs = createRequire(import.meta.url).resolve('n8n-workflow');

export default defineConfig({
  test: {
    environment: 'node',
    exclude: [...configDefaults.exclude, '**/*.full.test.ts'],
    coverage: {
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/wiremock.ts'],
    },
  },
  resolve: {
    alias: [{ find: /^n8n-workflow$/, replacement: n8nWorkflowCjs }],
  },
});
