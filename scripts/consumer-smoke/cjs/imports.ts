// Test files in a CommonJS project — what n8n's node starter generates — must
// type-check against the ESM-only packages: under `moduleResolution: node` (the
// starter's, tsconfig.starter.json) and `nodenext` (tsconfig.json). `node16`
// cannot, and is documented as unsupported for CommonJS test files (ADR-0014).
// `@n8n-probe/core/vitest` is left out: `node` resolution ignores `exports`
// subpaths, and Vite, not `tsc`, loads config files (see test/require.cjs).
import { createMockExecuteFunctions } from '@n8n-probe/core';
import { mockApi } from '@n8n-probe/mock-http';
import { executeNode } from '@n8n-probe/unit';

export const entries = [createMockExecuteFunctions, mockApi, executeNode];
