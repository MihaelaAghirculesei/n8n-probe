import { defineConfig } from 'tsup';

const shared = {
  dts: true,
  sourcemap: true,
  // Two configs build concurrently, so neither may clean `dist` — the build
  // script does it once up front.
  clean: false,
  // The base tsconfig's `composite: true` makes tsup's .d.ts pass reject files
  // outside the entry list (TS6307). Build non-composite.
  tsconfig: 'tsconfig.build.json',
} as const;

export default defineConfig([
  // ESM only: the main entry loads `vitest`, which cannot be `require()`d, so a
  // CommonJS build could never load (ADR-0014).
  { ...shared, entry: ['src/index.ts'], format: ['esm'] },
  // `vitest` is a separate entry: it is imported from vitest.config.ts files,
  // which must not load the main entry's runtime `vitest` dependency. It stays
  // dual-format, because a config file in a CommonJS project may `require()` it.
  { ...shared, entry: ['src/vitest.ts'], format: ['esm', 'cjs'] },
]);
