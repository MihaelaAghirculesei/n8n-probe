// The packages that do not depend on Vitest must load from CommonJS, which is
// what n8n's own node starter compiles to. `core`, `unit` and `mock-http` load
// Vitest, which cannot be required (ADR-0014), so they are not checked here.
const assert = require('node:assert');

for (const name of ['e2e', 'otel', 'metrics']) {
  const mod = require(`@n8n-probe/${name}`);
  assert.ok(Object.keys(mod).length > 0, `@n8n-probe/${name} exports nothing`);
}
assert.strictEqual(typeof require('@n8n-probe/core/vitest').n8nProbeVitestConfig, 'function');

console.log('CommonJS entry points OK');
