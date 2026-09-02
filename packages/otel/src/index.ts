import { NotImplementedError } from '@n8n-probe/core';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-base';

/** Where spans are sent. */
export type SpanExporterKind = 'console' | 'otlp-http';

/** Options for {@link initTracing}. */
export interface InitTracingOptions {
  serviceName: string;
  exporter: SpanExporterKind;
  otlpEndpoint?: string;
}

/** Matcher accepted by {@link expectSpan}. */
export interface SpanMatcher {
  name: string;
  attributes?: Record<string, unknown>;
}

/**
 * Start a `NodeSDK` with the requested exporter. Returns an async `shutdown()`
 * that flushes and stops it.
 */
export function initTracing(_options: InitTracingOptions): () => Promise<void> {
  throw new NotImplementedError('initTracing');
}

/**
 * Wrap a node `execute` function so each call produces an `n8n.node.execute`
 * span with node metadata, recording exceptions and error status on throw.
 */
export function traced<Fn extends (...args: never[]) => Promise<unknown>>(_nodeExecuteFn: Fn): Fn {
  throw new NotImplementedError('traced');
}

/** Assert that `spans` contains one matching `matcher` (name + attributes). */
export function expectSpan(_spans: ReadableSpan[], _matcher: SpanMatcher): void {
  throw new NotImplementedError('expectSpan');
}
