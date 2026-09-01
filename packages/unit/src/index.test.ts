import { NotImplementedError } from '@n8n-probe/core';
import { describe, expect, it } from 'vitest';

import { executeNode, expectNodeError, expectNodeOutput } from './index';

describe('@n8n-probe/unit public surface', () => {
  it('exposes the documented functions', () => {
    expect(typeof executeNode).toBe('function');
    expect(typeof expectNodeOutput).toBe('function');
    expect(typeof expectNodeError).toBe('function');
  });

  it('rejects with NotImplementedError until the milestone lands', async () => {
    await expect(executeNode(class {} as never, {})).rejects.toBeInstanceOf(NotImplementedError);
  });
});
