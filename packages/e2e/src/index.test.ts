import { describe, expect, it } from 'vitest';

import {
  expectWorkflowSuccess,
  getNodeOutput,
  runWorkflow,
  runWorkflowInFullInstance,
  workflow,
} from './index.js';

describe('@n8n-probe/e2e public surface', () => {
  it('exposes the documented entry points', () => {
    expect(typeof workflow).toBe('function');
    expect(typeof runWorkflow).toBe('function');
    expect(typeof runWorkflowInFullInstance).toBe('function');
    expect(typeof expectWorkflowSuccess).toBe('function');
    expect(typeof getNodeOutput).toBe('function');
  });
});
