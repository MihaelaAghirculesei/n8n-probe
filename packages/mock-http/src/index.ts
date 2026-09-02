import { NotImplementedError } from '@n8n-probe/core';
import type { RequestHandler } from 'msw';

/** Fluent responder returned by the verb methods of {@link MockApiBuilder}. */
export interface MockApiResponder {
  reply(status: number, body?: unknown): MockApiBuilder;
}

/** Fluent builder that produces MSW request handlers. */
export interface MockApiBuilder {
  get(path: string): MockApiResponder;
  post(path: string): MockApiResponder;
  put(path: string): MockApiResponder;
  delete(path: string): MockApiResponder;
  handlers(): RequestHandler[];
}

/** Start a fluent handler definition: `mockApi().get('/x').reply(200, {...})`. */
export function mockApi(): MockApiBuilder {
  throw new NotImplementedError('mockApi');
}

/**
 * Register a shared MSW server for the current test file and wire its
 * lifecycle to `beforeAll` / `afterEach` / `afterAll`.
 */
export function setupMswForTest(_handlers?: RequestHandler[]): void {
  throw new NotImplementedError('setupMswForTest');
}

/** Ready-made handlers for common failure modes. */
export const presets = {
  /** Responds `429` with a `Retry-After` header. */
  rateLimited(_path: string): RequestHandler {
    throw new NotImplementedError('presets.rateLimited');
  },
  /** Never responds within the request timeout. */
  timeout(_path: string): RequestHandler {
    throw new NotImplementedError('presets.timeout');
  },
  /** Fails `failuresBeforeSuccess` times, then responds `200`. */
  flakyThenSuccess(_path: string, _failuresBeforeSuccess: number): RequestHandler {
    throw new NotImplementedError('presets.flakyThenSuccess');
  },
};

/** Handle to a running WireMock container. */
export interface WireMockHandle {
  baseUrl: string;
  stop(): Promise<void>;
}

/**
 * Boot a WireMock container via `testcontainers` for contract-style tests that
 * need a real HTTP server. Requires the optional `testcontainers` peer.
 */
export function startWireMock(_options?: { mappingsDir?: string }): Promise<WireMockHandle> {
  return Promise.reject(new NotImplementedError('startWireMock'));
}
