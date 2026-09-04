import { trace } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  NodeTracerProvider,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import type { ReadableSpan } from '@opentelemetry/sdk-trace-node';

/** Handle to an in-memory tracer set up for a test. */
export interface TestTracing {
  /** Spans finished so far, oldest first. */
  getSpans(): ReadableSpan[];
  /** Drop all recorded spans. */
  reset(): void;
  /** Flush, stop the provider and detach it from the global API. */
  shutdown(): Promise<void>;
}

/**
 * Register an in-memory `NodeTracerProvider` as the global tracer so `traced()`
 * records into it. Call `shutdown()` in a matching teardown; a suite that sets
 * up more than one should `reset()` between cases.
 */
export function createTestTracing(): TestTracing {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  provider.register();

  return {
    getSpans: () => exporter.getFinishedSpans(),
    reset: () => {
      exporter.reset();
    },
    shutdown: async () => {
      await provider.shutdown();
      trace.disable();
    },
  };
}
