import { NotImplementedError } from '@n8n-probe/core';
import { describe, expect, it } from 'vitest';

import { executeNode, expectNodeError, expectNodeOutput } from './index.js';

describe('@n8n-probe/unit public surface', () => {
  it('exposes the documented functions', () => {
    expect(typeof executeNode).toBe('function');
    expect(typeof expectNodeOutput).toBe('function');
    expect(typeof expectNodeError).toBe('function');
  });

  it('throws NotImplementedError until the milestone lands', () => {
    expect(() => expectNodeOutput([], [])).toThrow(NotImplementedError);
  });
});
