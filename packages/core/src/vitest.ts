import { createRequire } from 'node:module';
import { join } from 'node:path';

/** Options for {@link n8nProbeVitestConfig}. */
export interface N8nProbeVitestConfigOptions {
  /**
   * Directory `n8n-workflow` is resolved from — the project whose nodes are
   * under test. Defaults to `process.cwd()`, where Vitest runs.
   */
  root?: string;
}

/** The slice of a Vitest config {@link n8nProbeVitestConfig} contributes. */
export interface N8nProbeVitestConfig {
  resolve: { alias: { find: RegExp; replacement: string }[] };
  test: { server: { deps: { inline: RegExp[] } } };
}

/**
 * Vitest settings every project testing n8n nodes with `@n8n-probe/*` needs;
 * merge them into `vitest.config.ts`:
 *
 * ```ts
 * import { n8nProbeVitestConfig } from '@n8n-probe/core/vitest';
 * import { defineConfig, mergeConfig } from 'vitest/config';
 *
 * export default mergeConfig(n8nProbeVitestConfig(), defineConfig({ test: {} }));
 * ```
 *
 * Why: `n8n-workflow`'s ESM build cannot be loaded by Node directly (its
 * imports omit file extensions), and n8n nodes — built to CommonJS — load its
 * CJS build anyway. Pinning every `n8n-workflow` import to that CJS build
 * fixes the first and keeps a single copy of classes such as
 * `NodeOperationError`, so `instanceof` holds between a node and its test.
 * `@n8n-probe/*` is inlined so the pin also applies inside the toolkit.
 *
 * Kept free of runtime imports from `vitest` (a config file cannot load it),
 * which is why it lives at its own entry point.
 */
export function n8nProbeVitestConfig(
  options: N8nProbeVitestConfigOptions = {},
): N8nProbeVitestConfig {
  const root = options.root ?? process.cwd();
  const n8nWorkflowCjs = createRequire(join(root, 'package.json')).resolve('n8n-workflow');
  return {
    resolve: { alias: [{ find: /^n8n-workflow$/, replacement: n8nWorkflowCjs }] },
    test: { server: { deps: { inline: [/@n8n-probe\//] } } },
  };
}
