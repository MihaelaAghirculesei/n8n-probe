import { describe, expect, it } from 'vitest';

import { initMetrics, instrument } from './index';

describe('@n8n-probe/metrics public surface', () => {
  it('exposes the documented entry points', () => {
    expect(typeof initMetrics).toBe('function');
    expect(typeof instrument).toBe('function');
  });
});
