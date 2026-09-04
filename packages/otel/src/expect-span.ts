import type { ReadableSpan } from '@opentelemetry/sdk-trace-node';

/** Matcher accepted by {@link expectSpan}. */
export interface SpanMatcher {
  /** Exact span name. */
  name: string;
  /** Attribute values that must all be present and strictly equal. */
  attributes?: Record<string, unknown>;
}

/**
 * Assert that `spans` contains at least one span named `matcher.name` and — if
 * `matcher.attributes` is given — one such span whose attributes are a superset
 * of it. Never asserts timing.
 */
export function expectSpan(spans: readonly ReadableSpan[], matcher: SpanMatcher): void {
  const named = spans.filter((span) => span.name === matcher.name);
  if (named.length === 0) {
    const seen = spans.map((s) => s.name).join(', ') || '(no spans)';
    throw new Error(`expectSpan: no span named "${matcher.name}". Recorded: ${seen}.`);
  }

  if (!matcher.attributes) return;

  const wanted = Object.entries(matcher.attributes);
  const hit = named.find((span) => wanted.every(([key, value]) => span.attributes[key] === value));
  if (!hit) {
    const got = named.map((s) => JSON.stringify(s.attributes)).join(' | ');
    throw new Error(
      `expectSpan: a span named "${matcher.name}" exists but none matched attributes ` +
        `${JSON.stringify(matcher.attributes)}. Got: ${got}.`,
    );
  }
}
