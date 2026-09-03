import { afterAll, beforeAll, expect, it } from 'vitest';

import { createMockHttpExecuteFunctions, performHttpRequest, startWireMock } from './index.js';
import type { WireMockHandle } from './index.js';

// Opt-in Docker tier. Runs only under `pnpm test:e2e:full`; needs a Docker daemon.
let wiremock: WireMockHandle;

beforeAll(async () => {
  wiremock = await startWireMock();
}, 120_000);

afterAll(async () => {
  await wiremock.stop();
});

it('serves a stub registered through the admin API', async () => {
  const register = await fetch(`${wiremock.baseUrl}/__admin/mappings`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: { method: 'GET', url: '/widgets/1' },
      response: { status: 200, jsonBody: { id: 1, name: 'widget' } },
    }),
  });
  expect(register.status).toBe(201);

  const node = createMockHttpExecuteFunctions().getNode();
  const body = await performHttpRequest(node, { url: `${wiremock.baseUrl}/widgets/1` });

  expect(body).toEqual({ id: 1, name: 'widget' });
});
