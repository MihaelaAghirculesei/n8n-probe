import { createMockExecuteFunctions } from '@n8n-probe/core';
import type { CreateMockExecuteFunctionsOptions } from '@n8n-probe/core';
import type { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow';
import { expect } from 'vitest';

/** Options accepted by {@link executeNode}. */
export interface ExecuteNodeOptions {
  /** Items the node reads through `getInputData()`. Defaults to `[]`. */
  input?: INodeExecutionData[];
  /** Parameter values, layered over the node's own `parameters` (see `@n8n-probe/core`). */
  params?: Record<string, unknown>;
  /** Decrypted credential objects keyed by type, returned by `getCredentials(type)`. */
  credentials?: Record<string, unknown>;
  /** Overrides for the node `getNode()` returns — `name`, `typeVersion`, `parameters`, … */
  node?: CreateMockExecuteFunctionsOptions['node'];
  /** Value returned by `this.continueOnFail()` inside the node. Defaults to `false`. */
  continueOnFail?: boolean;
}

/** Matcher accepted by {@link expectNodeError}. */
export interface NodeErrorMatcher {
  /** Substring (for a string) or pattern (for a RegExp) the rejection message must satisfy. */
  message?: string | RegExp;
  /** Constructor the rejection must be an `instanceof`. */
  instanceOf?: new (...args: never[]) => Error;
}

/**
 * Thrown by {@link executeNode} when the node cannot be run through the unit
 * harness: it has no `execute()` method, it is a declarative/routing node
 * (best-effort only in v1 — see ADR-0005), or it returned an `EngineRequest`
 * asking the engine to run other nodes.
 */
export class NodeNotExecutableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NodeNotExecutableError';
  }
}

function nodeLabel(NodeClass: { name: string }, description?: INodeTypeDescription): string {
  return description?.name ?? NodeClass.name;
}

/** A description carries routing config, so the node resolves parameters to HTTP requests. */
function isDeclarative(description: INodeTypeDescription | undefined): boolean {
  if (!description) return false;
  if (description.requestDefaults != null || description.requestOperations != null) return true;
  const properties = Array.isArray(description.properties) ? description.properties : [];
  return properties.some((property) => property?.routing != null);
}

function latestTypeVersion(version: INodeTypeDescription['version']): number {
  if (Array.isArray(version)) return version[version.length - 1] ?? 1;
  return version;
}

/**
 * Instantiate `NodeClass`, run its `execute()` against a mock context built from
 * `options`, and return the raw output branches (`result[branchIndex][itemIndex]`).
 *
 * The node's `typeVersion` defaults to the highest version its `description`
 * declares; pass `node: { typeVersion }` to pin a different one.
 */
export async function executeNode<T extends new () => INodeType>(
  NodeClass: T,
  options: ExecuteNodeOptions = {},
): Promise<INodeExecutionData[][]> {
  const node = new NodeClass();
  const {
    input = [],
    params = {},
    credentials = {},
    node: nodeOverride,
    continueOnFail = false,
  } = options;
  const label = nodeLabel(NodeClass, node.description);

  if (typeof node.execute !== 'function') {
    if (node.customOperations != null || isDeclarative(node.description)) {
      throw new NodeNotExecutableError(
        `"${label}" is a declarative/routing node. @n8n-probe/unit v1 supports ` +
          'programmatic-style nodes (an explicit execute() method) only — see ADR-0005.',
      );
    }
    throw new NodeNotExecutableError(
      `"${label}" has no execute() method. @n8n-probe/unit v1 runs programmatic-style ` +
        'nodes only; trigger, poll and webhook nodes are out of scope.',
    );
  }

  const ctx = createMockExecuteFunctions({
    node: { typeVersion: latestTypeVersion(node.description.version), ...nodeOverride },
    input,
    params,
    credentials,
    continueOnFail,
  });

  const output = await node.execute.call(ctx);

  if (output == null) return [];
  if (!Array.isArray(output)) {
    throw new NodeNotExecutableError(
      `"${label}" returned an EngineRequest (a request for the engine to run other nodes). ` +
        '@n8n-probe/unit cannot fulfil that; use @n8n-probe/e2e for multi-node execution.',
    );
  }
  return output;
}

/**
 * Assert that one output branch's `json` payloads deep-equal `expected`.
 * Defaults to the first branch; pass `branch` to check another.
 */
export function expectNodeOutput(
  result: INodeExecutionData[][],
  expected: unknown[],
  branch = 0,
): void {
  const items = result[branch] ?? [];
  expect(items.map((item) => item.json)).toEqual(expected);
}

/**
 * Assert that `promise` rejects, and that the rejection matches `matcher` by
 * message (substring or RegExp) and/or by `instanceOf`. Resolving, or matching
 * neither, throws.
 */
export async function expectNodeError(
  promise: Promise<unknown>,
  matcher: NodeErrorMatcher = {},
): Promise<void> {
  let error: unknown;
  let threw = false;
  try {
    await promise;
  } catch (caught) {
    threw = true;
    error = caught;
  }

  if (!threw) {
    throw new Error('Expected the node run to reject, but it resolved successfully.');
  }

  if (matcher.instanceOf && !(error instanceof matcher.instanceOf)) {
    const got = error instanceof Error ? error.constructor.name : typeof error;
    throw new Error(
      `Expected the rejection to be an instance of ${matcher.instanceOf.name}, but got ${got}: ${String(error)}`,
    );
  }

  if (matcher.message !== undefined) {
    const actual = error instanceof Error ? error.message : String(error);
    const ok =
      matcher.message instanceof RegExp
        ? matcher.message.test(actual)
        : actual.includes(matcher.message);
    if (!ok) {
      const wanted =
        matcher.message instanceof RegExp
          ? `match ${String(matcher.message)}`
          : `contain "${matcher.message}"`;
      throw new Error(`Expected the rejection message to ${wanted}, but got "${actual}".`);
    }
  }
}
