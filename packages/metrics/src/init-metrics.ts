import { metrics } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

/** Options for {@link initMetrics}. */
export interface InitMetricsOptions {
  /** Port the Prometheus exposition endpoint listens on. Default `9464`. */
  port?: number;
  /** Path the metrics are served from. Default `/metrics`. */
  endpoint?: string;
  /** Interface to bind. Default `0.0.0.0` (all IPv4 interfaces); pass `'::'` for dual-stack. */
  host?: string;
}

/**
 * Start a `MeterProvider` whose only reader is a `PrometheusExporter`, register
 * it as the global provider (so `instrument()` records into it), and serve the
 * exposition endpoint. Resolves once the server is listening; the returned
 * `shutdown()` stops it.
 */
export async function initMetrics(options: InitMetricsOptions = {}): Promise<() => Promise<void>> {
  const exporter = new PrometheusExporter({
    port: options.port ?? 9464,
    endpoint: options.endpoint ?? '/metrics',
    // The exporter itself defaults to localhost since 0.300, which a Prometheus
    // in another container (the docker demo) cannot scrape.
    host: options.host ?? '0.0.0.0',
    preventServerStart: true,
  });
  await exporter.startServer();

  const provider = new MeterProvider({ readers: [exporter] });
  metrics.setGlobalMeterProvider(provider);

  return async () => {
    await provider.shutdown();
    metrics.disable();
  };
}
