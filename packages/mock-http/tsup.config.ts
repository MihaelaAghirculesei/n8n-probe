import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // ESM only: it loads `vitest`, which cannot be `require()`d (ADR-0014).
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Base tsconfig sets `composite: true` for project references; tsup's .d.ts
  // pass builds a program rooted at the entry only, and a composite program
  // rejects imported-but-unlisted files (TS6307). Build against a non-composite
  // variant.
  tsconfig: 'tsconfig.build.json',
});
