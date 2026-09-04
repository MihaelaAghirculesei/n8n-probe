import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Multi-file src: the base tsconfig's `composite: true` makes tsup's .d.ts
  // pass reject imported-but-unlisted files (TS6307). Build non-composite.
  tsconfig: 'tsconfig.build.json',
});
