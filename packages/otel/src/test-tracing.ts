import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import type { ReadableSpan } from '@opentelemetry/sdk-trace';

import { registerGlobally, unregisterGlobally } from './register.js';

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
 * Register an in-memory `TracerProvider` as the global tracer so `traced()`
 * records into it. Call `shutdown()` in a matching teardown; a suite that sets
 * up more than one should `reset()` between cases.
 */
export function createTestTracing(): TestTracing {
  const exporter = new InMemorySpanExporter();
  const provider = new TracerProvider({
    spanProcessors: [new SimpleSpanProcessor({ exporter })],
  });
  registerGlobally(provider);

  return {
    getSpans: () => exporter.getFinishedSpans(),
    reset: () => {
      exporter.reset();
    },
    shutdown: async () => {
      await provider.shutdown();
      unregisterGlobally();
    },
  };
}
