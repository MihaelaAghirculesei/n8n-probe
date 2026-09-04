import { instrument } from '@n8n-probe/metrics';
import { traced } from '@n8n-probe/otel';
import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeApiError,
} from 'n8n-workflow';

/** HTTP status codes worth retrying with a plain backoff. */
const RETRIABLE_STATUS = new Set([429, 503]);

// The "single call site" M6 deferred: one wrapper around the real execute()
// that emits both the `n8n.node.execute` span (@n8n-probe/otel) and the
// `n8n_node_executions_total` / `..._duration_seconds` metric
// (@n8n-probe/metrics), keyed off this node's `description.name`. `instrument()`
// is called fresh on every execution — like `traced()` re-resolving its tracer
// on every call — because it binds to whichever provider is globally
// registered *at that moment*; called once at module load (before
// `initMetrics` has necessarily run) it would bind to the no-op meter forever
// (see the `instrument()` doc comment in `@n8n-probe/metrics`). Before
// `initTracing`/`initMetrics` run, both calls are cheap no-ops.
const tracedExecute = traced(async function (
  this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
  const recorder = instrument('httpExample');
  const start = performance.now();
  try {
    const result = await performHttpExample.call(this);
    recorder.recordExecution('success', (performance.now() - start) / 1000);
    return result;
  } catch (error) {
    recorder.recordExecution('error', (performance.now() - start) / 1000);
    throw error;
  }
});

/**
 * A programmatic node that calls an external HTTP API through
 * `this.helpers.httpRequest`, retries a couple of transient failures, wraps a
 * final failure in a `NodeApiError`, and honours `continueOnFail()`.
 *
 * It is the shared fixture for `@n8n-probe/mock-http` and `@n8n-probe/e2e`
 * tests, and — via `tracedExecute` above — for `@n8n-probe/otel` and
 * `@n8n-probe/metrics` too, so the toolkit examples exercise a node that
 * really does I/O and is fully instrumented.
 */
export class HttpExample implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'HTTP Example',
    name: 'httpExample',
    icon: 'fa:cloud-download-alt',
    group: ['transform'],
    version: 1,
    description: 'Fetch JSON from a URL, with a small retry on transient errors',
    defaults: { name: 'HTTP Example' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'The URL to fetch (expects a JSON response)',
      },
      {
        displayName: 'Timeout (ms)',
        name: 'timeout',
        type: 'number',
        default: 10000,
        description: 'Abort the request after this many milliseconds',
      },
      {
        displayName: 'Max Retries',
        name: 'maxRetries',
        type: 'number',
        default: 2,
        description: 'How many times to retry a 429 or 503 response',
      },
    ],
  };

  execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return tracedExecute.call(this);
  }
}

async function performHttpExample(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
  const items = this.getInputData();
  const returnData: INodeExecutionData[] = [];

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const url = this.getNodeParameter('url', itemIndex) as string;
    const timeout = this.getNodeParameter('timeout', itemIndex, 10000) as number;
    const maxRetries = this.getNodeParameter('maxRetries', itemIndex, 2) as number;

    try {
      const body = await requestWithRetry(this, { url, timeout }, maxRetries);
      const rows = Array.isArray(body) ? (body as unknown[]) : [body];
      for (const row of rows) {
        returnData.push({
          json: (typeof row === 'object' && row !== null ? row : { data: row }) as IDataObject,
          pairedItem: { item: itemIndex },
        });
      }
    } catch (error) {
      if (this.continueOnFail()) {
        returnData.push({
          json: items[itemIndex]?.json ?? {},
          error: error as NodeApiError,
          pairedItem: { item: itemIndex },
        });
        continue;
      }
      throw error;
    }
  }

  return [returnData];
}

async function requestWithRetry(
  ctx: IExecuteFunctions,
  options: { url: string; timeout: number },
  maxRetries: number,
): Promise<unknown> {
  let attempt = 0;
  for (;;) {
    try {
      return await ctx.helpers.httpRequest({
        url: options.url,
        method: 'GET',
        json: true,
        timeout: options.timeout,
      });
    } catch (error) {
      const status = Number((error as { httpCode?: string }).httpCode);
      if (attempt < maxRetries && RETRIABLE_STATUS.has(status)) {
        attempt++;
        continue;
      }
      throw error;
    }
  }
}
