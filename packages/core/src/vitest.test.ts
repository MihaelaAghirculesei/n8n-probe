import { dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { n8nProbeVitestConfig } from './vitest.js';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

describe('n8nProbeVitestConfig', () => {
  it("pins bare n8n-workflow imports to the project's CommonJS build", () => {
    const [alias] = n8nProbeVitestConfig({ root: packageRoot }).resolve.alias;

    expect(alias?.find.test('n8n-workflow')).toBe(true);
    expect(alias?.find.test('n8n-workflow/dist/esm/index.js')).toBe(false);
    expect(alias?.replacement).toContain(`${sep}n8n-workflow${sep}`);
    expect(alias?.replacement).toMatch(/cjs[\\/]index\.js$/);
  });

  it('inlines the toolkit so the pin applies inside it', () => {
    const { inline } = n8nProbeVitestConfig({ root: packageRoot }).test.server.deps;

    expect(
      inline.some((pattern) => pattern.test('/node_modules/@n8n-probe/e2e/dist/index.js')),
    ).toBe(true);
  });

  it('resolves from the working directory by default', () => {
    expect(n8nProbeVitestConfig().resolve.alias[0]?.replacement).toMatch(/n8n-workflow/);
  });
});
