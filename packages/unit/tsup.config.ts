import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // ESM only: it loads `vitest`, which cannot be `require()`d (ADR-0014).
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
});
