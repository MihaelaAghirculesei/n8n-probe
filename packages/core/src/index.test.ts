import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
  NotImplementedError,
  binaryFixture,
  createMockExecuteFunctions,
  itemsFrom,
} from './index.js';

describe('createMockExecuteFunctions', () => {
  it('wires sensible defaults', () => {
    const ctx = createMockExecuteFunctions();

    expect(ctx.getNode()).toMatchObject({
      name: 'Test Node',
      type: 'n8n-probe.test',
      typeVersion: 1,
    });
    expect(ctx.getInputData()).toEqual([]);
    expect(ctx.continueOnFail()).toBe(false);
  });

  it('returns the provided input items', () => {
    const input = itemsFrom([{ a: 1 }, { a: 2 }]);
    const ctx = createMockExecuteFunctions({ input });

    expect(ctx.getInputData()).toBe(input);
  });

  it('merges node overrides over the defaults', () => {
    const ctx = createMockExecuteFunctions({
      node: { name: 'Uppercase', typeVersion: 3, parameters: { field: 'name' } },
    });

    const node = ctx.getNode();
    expect(node.name).toBe('Uppercase');
    expect(node.typeVersion).toBe(3);
    expect(node.parameters).toEqual({ field: 'name' });
    expect(node.id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('reflects continueOnFail', () => {
    expect(createMockExecuteFunctions({ continueOnFail: true }).continueOnFail()).toBe(true);
  });

  describe('getNodeParameter', () => {
    it('resolves flat and dotted params', () => {
      const ctx = createMockExecuteFunctions({
        params: { field: 'name', options: { limit: 5 }, 'a.b': 'flat-wins' },
      });

      expect(ctx.getNodeParameter('field', 0)).toBe('name');
      expect(ctx.getNodeParameter('options.limit', 0)).toBe(5);
      expect(ctx.getNodeParameter('a.b', 0)).toBe('flat-wins');
    });

    it("reads the node's own parameters, with `params` winning on collision", () => {
      const ctx = createMockExecuteFunctions({
        node: { parameters: { field: 'fromNode', keep: 'kept' } },
        params: { field: 'fromParams' },
      });

      expect(ctx.getNodeParameter('field', 0)).toBe('fromParams');
      expect(ctx.getNodeParameter('keep', 0)).toBe('kept');
    });

    it('falls back when a param is missing', () => {
      const ctx = createMockExecuteFunctions();
      expect(ctx.getNodeParameter('missing', 0, 'default')).toBe('default');
    });

    it('throws when a param is missing and no fallback is given', () => {
      const ctx = createMockExecuteFunctions({ node: { name: 'MyNode' } });
      expect(() => ctx.getNodeParameter('missing', 0)).toThrow(
        /getNodeParameter\("missing"\).*"MyNode"/,
      );
    });
  });

  describe('getCredentials', () => {
    it('returns the credential object registered for a type', async () => {
      const ctx = createMockExecuteFunctions({
        credentials: { myApi: { apiKey: 'secret', baseUrl: 'https://example.test' } },
      });

      await expect(ctx.getCredentials('myApi')).resolves.toEqual({
        apiKey: 'secret',
        baseUrl: 'https://example.test',
      });
    });

    it('rejects when a node asks for a type it was not given', async () => {
      const ctx = createMockExecuteFunctions({ node: { name: 'MyNode' } });

      await expect(ctx.getCredentials('missingApi')).rejects.toThrow(
        /getCredentials\("missingApi"\).*"MyNode"/,
      );
    });
  });

  it('can act as `this` for a node execute()', async () => {
    function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
      const field = this.getNodeParameter('field', 0) as string;
      return Promise.resolve([
        this.getInputData().map((item, index) => ({
          json: { ...item.json, [field]: (item.json[field] as string).toUpperCase() },
          pairedItem: { item: index },
        })),
      ]);
    }

    const ctx = createMockExecuteFunctions({
      input: itemsFrom([{ name: 'ada' }, { name: 'grace' }]),
      params: { field: 'name' },
    });

    await expect(execute.call(ctx)).resolves.toEqual([
      [
        { json: { name: 'ADA' }, pairedItem: { item: 0 } },
        { json: { name: 'GRACE' }, pairedItem: { item: 1 } },
      ],
    ]);
  });

  it('exposes helpers.returnJsonArray backed by itemsFrom', () => {
    const ctx = createMockExecuteFunctions();
    expect(ctx.helpers.returnJsonArray([{ x: 1 }])).toEqual([
      { json: { x: 1 }, pairedItem: { item: 0 } },
    ]);
    expect(ctx.helpers.returnJsonArray({ x: 2 })).toEqual([
      { json: { x: 2 }, pairedItem: { item: 0 } },
    ]);
  });

  it('stays a mutable deep mock', () => {
    const ctx = createMockExecuteFunctions();
    ctx.getInputData.mockReturnValue(itemsFrom([{ overridden: true }]));
    expect(ctx.getInputData()).toEqual([{ json: { overridden: true }, pairedItem: { item: 0 } }]);
  });
});

describe('itemsFrom', () => {
  it('wraps objects and sets a pairedItem index', () => {
    expect(itemsFrom([{ a: 1 }, { b: 2 }])).toEqual([
      { json: { a: 1 }, pairedItem: { item: 0 } },
      { json: { b: 2 }, pairedItem: { item: 1 } },
    ]);
  });

  it('returns an empty array for no input', () => {
    expect(itemsFrom([])).toEqual([]);
  });

  it.each([
    ['a string', 'nope'],
    ['a number', 3],
    ['null', null],
    ['an array', [1, 2]],
  ])('rejects %s', (_label, value) => {
    expect(() => itemsFrom([value])).toThrow(TypeError);
  });
});

describe('binaryFixture', () => {
  it('base64-encodes the buffer and fills metadata', () => {
    const fixture = binaryFixture({
      fileName: 'report.CSV',
      mimeType: 'text/csv',
      data: Buffer.from('a,b,c'),
    });

    expect(fixture).toEqual({
      data: Buffer.from('a,b,c').toString('base64'),
      mimeType: 'text/csv',
      fileName: 'report.CSV',
      fileExtension: 'csv',
      fileSize: '5 B',
    });
  });

  it('omits fileExtension when the name has none', () => {
    const fixture = binaryFixture({
      fileName: 'raw',
      mimeType: 'application/octet-stream',
      data: Buffer.alloc(0),
    });
    expect(fixture).not.toHaveProperty('fileExtension');
    expect(fixture.fileSize).toBe('0 B');
  });

  it('formats larger sizes with a unit', () => {
    const fixture = binaryFixture({
      fileName: 'big.bin',
      mimeType: 'application/octet-stream',
      data: Buffer.alloc(2048),
    });
    expect(fixture.fileSize).toBe('2.0 kB');
  });
});

describe('NotImplementedError', () => {
  it('names the unimplemented API', () => {
    const error = new NotImplementedError('someApi');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotImplementedError');
    expect(error.message).toMatch(/someApi/);
  });
});
