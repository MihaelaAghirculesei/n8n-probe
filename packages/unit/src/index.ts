import { NotImplementedError } from '@n8n-probe/core';
import type { INodeExecutionData, INodeType } from 'n8n-workflow';

/** Options accepted by {@link executeNode}. */
export interface ExecuteNodeOptions {
  input?: INodeExecutionData[];
  params?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

/** Matcher accepted by {@link expectNodeError}. */
export interface NodeErrorMatcher {
  message?: string | RegExp;
  instanceOf?: new (...args: never[]) => Error;
}

/**
 * Instantiate `NodeClass`, run its `execute()` against a mock context built
 * from `options`, and return the raw output branches.
 */
export function executeNode<T extends new () => INodeType>(
  _NodeClass: T,
  _options: ExecuteNodeOptions,
): Promise<INodeExecutionData[][]> {
  return Promise.reject(new NotImplementedError('executeNode'));
}

/** Assert that the first output branch's `json` payloads deep-equal `expected`. */
export function expectNodeOutput(_result: INodeExecutionData[][], _expected: unknown[]): void {
  throw new NotImplementedError('expectNodeOutput');
}

/** Assert that `promise` rejects, matching `matcher` by message and/or type. */
export function expectNodeError(
  _promise: Promise<unknown>,
  _matcher: NodeErrorMatcher,
): Promise<void> {
  return Promise.reject(new NotImplementedError('expectNodeError'));
}
