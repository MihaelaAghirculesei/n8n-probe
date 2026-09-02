import { describe, expect, it } from 'vitest';

import { mockApi, presets, setupMswForTest, startWireMock } from './index.js';

describe('@n8n-probe/mock-http public surface', () => {
  it('exposes the documented entry points', () => {
    expect(typeof mockApi).toBe('function');
    expect(typeof setupMswForTest).toBe('function');
    expect(typeof startWireMock).toBe('function');
    expect(typeof presets.rateLimited).toBe('function');
    expect(typeof presets.timeout).toBe('function');
    expect(typeof presets.flakyThenSuccess).toBe('function');
  });
});
