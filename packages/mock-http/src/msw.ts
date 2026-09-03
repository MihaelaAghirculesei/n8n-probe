import { http, HttpResponse } from 'msw';
import type { RequestHandler } from 'msw';
import { setupServer } from 'msw/node';
import type { SetupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

/** Fluent responder returned by the verb methods of {@link MockApiBuilder}. */
export interface MockApiResponder {
  /**
   * Respond to the pending route with `status` and an optional `body`
   * (`string` -> text, `ArrayBuffer`/typed array -> binary, anything else ->
   * JSON, `undefined` -> empty body). Returns the builder so calls can chain.
   */
  reply(status: number, body?: unknown): MockApiBuilder;
}

/** Fluent builder that produces MSW request handlers. */
export interface MockApiBuilder {
  get(path: string): MockApiResponder;
  post(path: string): MockApiResponder;
  put(path: string): MockApiResponder;
  delete(path: string): MockApiResponder;
  /** The handlers defined so far, in declaration order. */
  handlers(): RequestHandler[];
}

/** Turn a `reply(status, body)` pair into an MSW `Response`. */
export function toResponse(status: number, body: unknown): Response {
  if (body === undefined) return new HttpResponse(null, { status });
  if (typeof body === 'string') return HttpResponse.text(body, { status });
  if (body instanceof ArrayBuffer) return HttpResponse.arrayBuffer(body, { status });
  if (ArrayBuffer.isView(body)) {
    return HttpResponse.arrayBuffer(body.buffer as ArrayBuffer, { status });
  }
  return HttpResponse.json(body as Record<string, unknown>, { status });
}

/**
 * Start a fluent handler definition:
 * `mockApi().get('https://api.example.com/x').reply(200, { ok: true }).handlers()`.
 */
export function mockApi(): MockApiBuilder {
  const defined: RequestHandler[] = [];

  const responder = (
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
  ): MockApiResponder => ({
    reply(status, body) {
      defined.push(http[method](path, () => toResponse(status, body)));
      return builder;
    },
  });

  const builder: MockApiBuilder = {
    get: (path) => responder('get', path),
    post: (path) => responder('post', path),
    put: (path) => responder('put', path),
    delete: (path) => responder('delete', path),
    handlers: () => [...defined],
  };

  return builder;
}

/**
 * Register a shared MSW server for the current test file and wire its lifecycle
 * to `beforeAll` / `afterEach` / `afterAll`. An unmatched request fails the test
 * loudly (`onUnhandledRequest: 'error'`) instead of hanging or hitting the
 * network. Returns the server so a test can add per-case handlers with
 * `server.use(...)`.
 */
export function setupMswForTest(handlers: RequestHandler[] = []): SetupServer {
  const server = setupServer(...handlers);
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => {
    server.close();
  });
  return server;
}
