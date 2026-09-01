import type { IBinaryData, IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

/**
 * Thrown by toolkit APIs that are declared but not yet implemented.
 * Tracked in `docs/PLAN.md`.
 */
export class NotImplementedError extends Error {
  constructor(api: string) {
    super(`${api} is not implemented yet — see docs/PLAN.md`);
    this.name = 'NotImplementedError';
  }
}

/** A node instance paired with the mock context it should execute against. */
export interface TestExecuteContext {
  readonly node: INode;
  readonly executeFunctions: IExecuteFunctions;
}

/**
 * Build a deep, type-safe mock of n8n's `IExecuteFunctions`, with the fields
 * a node's `execute()` typically reads pre-populated. Pass `overrides` to pin
 * specific return values for a test.
 */
export function createMockExecuteFunctions(
  _overrides?: Partial<IExecuteFunctions>,
): IExecuteFunctions {
  throw new NotImplementedError('createMockExecuteFunctions');
}

/** Wrap an array of plain JSON values as n8n execution items. */
export function itemsFrom(_json: unknown[]): INodeExecutionData[] {
  throw new NotImplementedError('itemsFrom');
}

/** Create an `IBinaryData` fixture from an in-memory buffer. */
export function binaryFixture(_input: {
  fileName: string;
  mimeType: string;
  data: Buffer;
}): IBinaryData {
  throw new NotImplementedError('binaryFixture');
}
