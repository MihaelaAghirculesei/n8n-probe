import { describe, expect, it } from 'vitest';

import {
  NotImplementedError,
  binaryFixture,
  createMockExecuteFunctions,
  itemsFrom,
} from './index.js';

describe('@n8n-probe/core public surface', () => {
  it('exposes the documented functions', () => {
    expect(typeof createMockExecuteFunctions).toBe('function');
    expect(typeof itemsFrom).toBe('function');
    expect(typeof binaryFixture).toBe('function');
  });

  it('throws NotImplementedError until the milestone lands', () => {
    expect(() => itemsFrom([])).toThrow(NotImplementedError);
  });
});
