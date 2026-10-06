import { defineConfig } from 'tsup';

export default defineConfig({
  // `vitest` is a separate entry: it is imported from vitest.config.ts files,
  // which must not load the main entry's runtime `vitest` dependency.
  entry: ['src/index.ts', 'src/vitest.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Multi-entry: the base tsconfig's `composite: true` makes tsup's .d.ts pass
  // reject files outside the entry list (TS6307). Build non-composite.
  tsconfig: 'tsconfig.build.json',
});
