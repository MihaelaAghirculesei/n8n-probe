import { createRequire } from 'node:module';

import { defineConfig } from 'vitest/config';

// The fixture node (`n8n-nodes-probe-example`) is built to CommonJS and does
// `require('n8n-workflow')`, while these ESM tests would otherwise import the
// package's ESM build. That yields two copies of classes like
// `NodeOperationError`, so `instanceof` across the boundary fails. Pin the whole
// module graph to the single CJS build the fixture already uses.
const n8nWorkflowCjs = createRequire(import.meta.url).resolve('n8n-workflow');

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
  resolve: {
    alias: [{ find: /^n8n-workflow$/, replacement: n8nWorkflowCjs }],
  },
});
