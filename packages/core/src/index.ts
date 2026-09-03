import { extname } from 'node:path';

import type {
  IBinaryData,
  IDataObject,
  IExecuteFunctions,
  INode,
  INodeExecutionData,
} from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy } from 'vitest-mock-extended';

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

/** Options for {@link createMockExecuteFunctions}. */
export interface CreateMockExecuteFunctionsOptions {
  /** Overrides merged over the default node returned by `getNode()`. */
  node?: Partial<INode>;
  /** Items returned by `getInputData()`. Defaults to `[]`. */
  input?: INodeExecutionData[];
  /**
   * Values resolved by `getNodeParameter(name, itemIndex, fallback?)`, layered
   * over the node's own `parameters` (so `params` wins on a key collision). Keys
   * may be flat (`'field'`) or dotted (`'options.limit'`); a flat key that
   * contains dots is matched before the path is walked. `$parameter`-style
   * expressions are not resolved yet.
   */
  params?: Record<string, unknown>;
  /**
   * Decrypted credential objects keyed by credential type name, returned by
   * `getCredentials(type)`. Asking for a type that is not present throws, the
   * same way a real node run fails when its credentials are not configured.
   */
  credentials?: Record<string, unknown>;
  /** Value returned by `continueOnFail()`. Defaults to `false`. */
  continueOnFail?: boolean;
}

const DEFAULT_NODE: INode = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Test Node',
  type: 'n8n-probe.test',
  typeVersion: 1,
  position: [0, 0],
  parameters: {},
};

/**
 * Build a deep, type-safe mock of n8n's `IExecuteFunctions` with the members a
 * node's `execute()` typically reads pre-wired: `getNode`, `getInputData`,
 * `getNodeParameter`, `continueOnFail`, `logger` and `helpers.*`.
 *
 * The return value is a `vitest-mock-extended` deep mock, so any member can be
 * further customised in a test (`ctx.getInputData.mockReturnValue(...)`).
 */
export function createMockExecuteFunctions(
  options: CreateMockExecuteFunctionsOptions = {},
): DeepMockProxy<IExecuteFunctions> {
  const {
    node: nodeOverride,
    input = [],
    params = {},
    credentials = {},
    continueOnFail = false,
  } = options;

  const node: INode = {
    ...DEFAULT_NODE,
    ...nodeOverride,
    parameters: { ...DEFAULT_NODE.parameters, ...nodeOverride?.parameters },
  };

  // `params` is an override layer over whatever the node itself declares, so a
  // node's `parameters` and an explicit `params` option both feed `getNodeParameter`.
  const paramSource: Record<string, unknown> = { ...node.parameters, ...params };

  const ctx = mockDeep<IExecuteFunctions>();

  ctx.getNode.mockReturnValue(node);
  ctx.getInputData.mockReturnValue(input);
  ctx.continueOnFail.mockReturnValue(continueOnFail);

  // n8n's `getNodeParameter` is a set of overloads no single implementation can
  // satisfy structurally; the mock only needs the runtime behaviour.
  const getNodeParameter = ((
    parameterName: string,
    _itemIndex?: number,
    fallbackValue?: unknown,
  ): unknown => {
    const resolved = readPath(paramSource, parameterName);
    if (resolved !== undefined) return resolved;
    if (fallbackValue !== undefined) return fallbackValue;
    throw new Error(
      `getNodeParameter("${parameterName}") has no value on mock node "${node.name}". ` +
        "Provide it via the node's `parameters`, the `params` option, or a fallback value.",
    );
  }) as unknown as IExecuteFunctions['getNodeParameter'];
  ctx.getNodeParameter.mockImplementation(getNodeParameter);

  // `getCredentials(type)` resolves the matching entry from the `credentials`
  // option and otherwise throws, mirroring a real run where a node asking for
  // credentials it was not given fails rather than receiving `undefined`.
  const getCredentials = ((type: string): Promise<unknown> => {
    if (Object.prototype.hasOwnProperty.call(credentials, type)) {
      return Promise.resolve(credentials[type]);
    }
    return Promise.reject(
      new Error(
        `getCredentials("${type}") has no value on mock node "${node.name}". ` +
          'Provide it via the `credentials` option.',
      ),
    );
  }) as unknown as IExecuteFunctions['getCredentials'];
  ctx.getCredentials.mockImplementation(getCredentials);

  ctx.helpers.returnJsonArray.mockImplementation((jsonData) =>
    itemsFrom(Array.isArray(jsonData) ? jsonData : [jsonData]),
  );

  return ctx;
}

/**
 * Wrap an array of plain objects as n8n execution items: each entry becomes
 * `{ json, pairedItem: { item: <index> } }`. Non-object entries are rejected so
 * a stray primitive fails loudly instead of producing an item with no `json`.
 */
export function itemsFrom(json: unknown[]): INodeExecutionData[] {
  return json.map((entry, index) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError(
        `itemsFrom expects an array of plain objects; received ${typeName(entry)} at index ${index}.`,
      );
    }
    return { json: entry as IDataObject, pairedItem: { item: index } };
  });
}

/**
 * Build an `IBinaryData` fixture from an in-memory buffer: base64-encodes the
 * data and fills in `mimeType`, `fileName`, `fileExtension` (from the file name)
 * and `fileSize`.
 */
export function binaryFixture(input: {
  fileName: string;
  mimeType: string;
  data: Buffer;
}): IBinaryData {
  const { fileName, mimeType, data } = input;
  const fileExtension = extname(fileName).replace(/^\./, '').toLowerCase();

  const fixture: IBinaryData = {
    data: data.toString('base64'),
    mimeType,
    fileName,
    fileSize: humanFileSize(data.byteLength),
  };
  if (fileExtension) fixture.fileExtension = fileExtension;
  return fixture;
}

/** Resolve `path` against `source`, preferring an exact key over a dotted walk. */
function readPath(source: Record<string, unknown>, path: string): unknown {
  if (Object.prototype.hasOwnProperty.call(source, path)) return source[path];

  let current: unknown = source;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    const record = current as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
    current = record[key];
  }
  return current;
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  return `a ${typeof value}`;
}

const FILE_SIZE_UNITS = ['B', 'kB', 'MB', 'GB', 'TB'] as const;

/** Approximate n8n's binary `fileSize` string (e.g. `1.5 kB`). */
function humanFileSize(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${FILE_SIZE_UNITS[unitIndex]}`;
}
