import { describe, expect, it } from 'vitest';

import { Example } from './Example.node';

describe('Example node', () => {
  it('has a valid node description', () => {
    const node = new Example();
    expect(node.description.name).toBe('example');
    expect(node.description.version).toBe(1);
    expect(node.description.properties.map((p) => p.name)).toContain('field');
  });

  it('exposes an execute method', () => {
    expect(typeof new Example().execute).toBe('function');
  });
});
