import type { traced as tracedFn, initTracing as initTracingFn } from '@n8n-probe/otel';
import type { instrument as instrumentFn, initMetrics as initMetricsFn } from '@n8n-probe/metrics';
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

type Traced = typeof tracedFn;
type Instrument = typeof instrumentFn;
type OtelModule = { traced: Traced; initTracing: typeof initTracingFn };
type MetricsModule = { instrument: Instrument; initMetrics: typeof initMetricsFn };

// @n8n-probe/otel and @n8n-probe/metrics are real `dependencies`
// (package.json) and resolve normally under an ordinary npm/pnpm install —
// including this fixture's own build (apps/example-node/tsup.config.ts bundles
// both, and their @opentelemetry/* transitive deps, straight into dist/, so
// the docker-compose demo's bind-mounted `dist/`-only mount resolves them too;
// see ADR-0010/ADR-0011 in docs/ARCHITECTURE.md). Still loaded lazily and
// defensively here — never a top-level `import` — as a fallback for any
// future dependency this node picks up that ISN'T bundled the same way: a
// `require()` that throws during n8n's node-type scan would otherwise abort
// the *entire* n8n process at startup, taking every other node down with it.
let otelModule: OtelModule | undefined;
let metricsModule: MetricsModule | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional load, see comment above
  otelModule = require('@n8n-probe/otel') as OtelModule;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional load, see comment above
  metricsModule = require('@n8n-probe/metrics') as MetricsModule;
} catch {
  otelModule = undefined;
  metricsModule = undefined;
}

const traced: Traced = otelModule?.traced ?? ((fn) => fn);
const instrument: Instrument = metricsModule?.instrument ?? (() => ({ recordExecution: () => undefined }));

// Demo-only, opt-in: registers the real tracer/meter providers once per n8n
// process (n8n requires this file exactly once, during its startup node-type
// scan), so `traced()`/`instrument()` above emit to Jaeger/Prometheus instead
// of the no-op default. Never activates outside the docker-compose demo
// (docker/docker-compose.yml sets this env var) — a real install of this
// example, and every test suite / apps/dogfood, does its own host-side
// initTracing/initMetrics instead. See the `instrument()` doc comment in
// @n8n-probe/metrics for why this must happen once at load time, not per call.
if (process.env.N8N_PROBE_DEMO_OBSERVABILITY === '1' && otelModule && metricsModule) {
  try {
    otelModule.initTracing({
      serviceName: 'n8n-probe-demo',
      exporter: 'otlp-http',
      otlpEndpoint: process.env.N8N_PROBE_OTLP_ENDPOINT ?? 'http://jaeger:4318/v1/traces',
    });
    metricsModule.initMetrics().catch((error: unknown) => {
      console.error('[n8n-probe demo] initMetrics failed to start:', error);
    });
  } catch (error) {
    console.error('[n8n-probe demo] observability init failed:', error);
  }
}

// The "single call site" M6 deferred: one wrapper around the real execute()
// that emits both the `n8n.node.execute` span (@n8n-probe/otel) and the
// `n8n_node_executions_total` / `..._duration_seconds` metric
// (@n8n-probe/metrics), keyed off this node's `description.name`. `instrument()`
// is called fresh on every execution — like `traced()` re-resolving its tracer
// on every call — because it binds to whichever provider is globally
// registered *at that moment*; called once at module load (before
// `initMetrics` has necessarily run) it would bind to the no-op meter forever
// (see the `instrument()` doc comment in `@n8n-probe/metrics`). Before
// `initTracing`/`initMetrics` run (or when they failed to load at all, per
// above), both calls are cheap no-ops.
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
