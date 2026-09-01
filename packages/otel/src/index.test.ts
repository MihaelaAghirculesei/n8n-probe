import { describe, expect, it } from 'vitest';

import { expectSpan, initTracing, traced } from './index';

describe('@n8n-probe/otel public surface', () => {
  it('exposes the documented entry points', () => {
    expect(typeof initTracing).toBe('function');
    expect(typeof traced).toBe('function');
    expect(typeof expectSpan).toBe('function');
  });
});
