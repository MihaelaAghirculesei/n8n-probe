import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import type { SpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

/** Where spans are sent. */
export type SpanExporterKind = 'console' | 'otlp-http';

/** Options for {@link initTracing}. */
export interface InitTracingOptions {
  /** `service.name` on the resource. */
  serviceName: string;
  /** `'console'` prints spans; `'otlp-http'` POSTs them to an OTLP collector. */
  exporter: SpanExporterKind;
  /** OTLP traces endpoint (only for `'otlp-http'`); defaults to the SDK default. */
  otlpEndpoint?: string;
}

/**
 * Compose a `NodeTracerProvider` from the stable OpenTelemetry 2.x packages (no
 * `@opentelemetry/sdk-node`, per ADR-0003) and register it globally, so
 * `traced()` and any OTel-instrumented library share one tracer. Returns an
 * async `shutdown()` that flushes and stops the provider.
 */
export function initTracing(options: InitTracingOptions): () => Promise<void> {
  const useOtlp = options.exporter === 'otlp-http';
  const exporter = useOtlp
    ? new OTLPTraceExporter(options.otlpEndpoint ? { url: options.otlpEndpoint } : {})
    : new ConsoleSpanExporter();

  // OTLP ships over the network -> batch; console is local -> flush each span.
  const processor: SpanProcessor = useOtlp
    ? new BatchSpanProcessor(exporter)
    : new SimpleSpanProcessor(exporter);

  const provider = new NodeTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: options.serviceName }),
    spanProcessors: [processor],
  });
  provider.register();

  return () => provider.shutdown();
}
