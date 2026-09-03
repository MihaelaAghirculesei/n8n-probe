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

/**
 * A programmatic node that calls an external HTTP API through
 * `this.helpers.httpRequest`, retries a couple of transient failures, wraps a
 * final failure in a `NodeApiError`, and honours `continueOnFail()`.
 *
 * It is the shared fixture for `@n8n-probe/mock-http` (and later `e2e`) tests, so
 * the toolkit examples exercise a node that really does I/O.
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

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
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
