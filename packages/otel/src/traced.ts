import { SpanStatusCode, trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';
import type { IExecuteFunctions } from 'n8n-workflow';

/** The span name every wrapped `execute()` produces. */
export const NODE_EXECUTE_SPAN = 'n8n.node.execute';

const TRACER_NAME = '@n8n-probe/otel';

/** The shape of an n8n node's `execute` (bound to an `IExecuteFunctions`). */
export type NodeExecuteFn = (this: IExecuteFunctions, ...args: never[]) => Promise<unknown>;

/** Best-effort read of a value; swallow anything a partial mock context throws. */
function safe<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

/**
 * Wrap a node `execute` function so each call runs inside an
 * `n8n.node.execute` span carrying node metadata (`n8n.node.type` / `.name` /
 * `.type_version`, `n8n.item.count`, and the workflow / execution id when
 * available). Exceptions are recorded and the span status set to error; the
 * original value / rejection is passed through unchanged.
 */
export function traced<Fn extends NodeExecuteFn>(nodeExecuteFn: Fn): Fn {
  function wrapped(this: IExecuteFunctions, ...args: Parameters<Fn>): Promise<unknown> {
    const tracer = trace.getTracer(TRACER_NAME);
    return tracer.startActiveSpan(NODE_EXECUTE_SPAN, (span: Span) => {
      const node = safe(() => this.getNode());
      if (node) {
        span.setAttribute('n8n.node.type', node.type);
        span.setAttribute('n8n.node.name', node.name);
        span.setAttribute('n8n.node.type_version', node.typeVersion);
      }
      const items = safe(() => this.getInputData());
      if (Array.isArray(items)) span.setAttribute('n8n.item.count', items.length);
      const workflowId = safe(() => this.getWorkflow().id);
      if (workflowId !== undefined) span.setAttribute('n8n.workflow.id', String(workflowId));
      const executionId = safe(() => this.getExecutionId());
      if (executionId) span.setAttribute('n8n.execution.id', executionId);

      return Promise.resolve()
        .then(() => nodeExecuteFn.apply(this, args))
        .catch((error: unknown) => {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        })
        .finally(() => span.end());
    });
  }

  return wrapped as Fn;
}
