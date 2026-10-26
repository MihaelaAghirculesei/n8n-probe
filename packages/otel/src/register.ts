import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import type { TracerProvider } from '@opentelemetry/sdk-trace';

/**
 * Register `provider` as the global tracer provider, together with the
 * AsyncLocalStorage context manager and W3C trace-context + baggage
 * propagators — what `NodeTracerProvider#register()` did before OpenTelemetry
 * 3.x removed `@opentelemetry/sdk-trace-node`.
 */
export function registerGlobally(provider: TracerProvider): void {
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    }),
  );
  trace.setGlobalTracerProvider(provider);
}

/** Undo {@link registerGlobally}, so a later registration takes effect. */
export function unregisterGlobally(): void {
  trace.disable();
  propagation.disable();
  context.disable();
}
