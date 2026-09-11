import { defineConfig } from 'tsup';

// The docker-compose demo (docker/docker-compose.yml) mounts only dist/ into
// n8n's custom-nodes folder, no node_modules alongside it. Bundle this
// fixture's own dependencies so HttpExample.node.ts's require() of
// @n8n-probe/otel / @n8n-probe/metrics resolves for real there instead of
// falling back to the no-op guard (ADR-0010/ADR-0011 in docs/ARCHITECTURE.md).
// n8n-workflow stays external — n8n supplies it, and bundling it would break
// the CJS/ESM class identity ADR-0007 relies on.
const noExternal = ['@n8n-probe/otel', '@n8n-probe/metrics', /^@opentelemetry\//];

// tsup runs multiple config entries concurrently, not sequentially — putting
// `clean: true` on only one of them is a race that can delete output the
// other just wrote (or is about to). Cleaning is done once, up front, by the
// `build`/`dev` scripts in package.json instead; neither config below cleans.
export default defineConfig([
  // index.ts and the node files import each other; building them as one
  // multi-entry esbuild pass makes esbuild try to share a chunk between them,
  // which esbuild's CJS output can't resolve at require() time. Two fully
  // independent builds (each duplicating the small amount of shared code)
  // sidesteps that instead.
  {
    // Object form (output path -> source path) instead of a glob: a glob
    // entry's output path is stripped down to the entries' common ancestor
    // ("nodes/"), which would put these at dist/Example/... instead of the
    // dist/nodes/Example/... path package.json's `n8n.nodes` points at.
    entry: {
      'nodes/Example/Example.node': 'nodes/Example/Example.node.ts',
      'nodes/HttpExample/HttpExample.node': 'nodes/HttpExample/HttpExample.node.ts',
    },
    format: ['cjs'],
    dts: true,
    sourcemap: true,
    noExternal,
    tsconfig: 'tsconfig.build.json',
  },
  {
    entry: ['index.ts'],
    format: ['cjs'],
    dts: true,
    sourcemap: true,
    noExternal,
    tsconfig: 'tsconfig.build.json',
  },
]);
