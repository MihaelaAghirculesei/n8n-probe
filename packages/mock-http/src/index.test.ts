import { HttpExample } from 'n8n-nodes-probe-example';
import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it } from 'vitest';

import {
  createMockHttpExecuteFunctions,
  mockApi,
  performHttpRequest,
  presets,
  setupMswForTest,
  startWireMock,
} from './index.js';

const API = 'https://api.example.test';

describe('@n8n-probe/mock-http public surface', () => {
  it('exposes the documented entry points', () => {
    expect(typeof mockApi).toBe('function');
    expect(typeof setupMswForTest).toBe('function');
    expect(typeof createMockHttpExecuteFunctions).toBe('function');
    expect(typeof performHttpRequest).toBe('function');
    expect(typeof startWireMock).toBe('function');
    expect(typeof presets.rateLimited).toBe('function');
    expect(typeof presets.timeout).toBe('function');
    expect(typeof presets.flakyThenSuccess).toBe('function');
  });
});

describe('mockApi', () => {
  it('collects handlers in declaration order across every verb', () => {
    const handlers = mockApi()
      .get(`${API}/a`)
      .reply(200, { a: 1 })
      .post(`${API}/b`)
      .reply(201)
      .put(`${API}/c`)
      .reply(200, 'plain text')
      .delete(`${API}/d`)
      .reply(204)
      .handlers();

    expect(handlers.map((h) => h.info.header)).toEqual([
      `GET ${API}/a`,
      `POST ${API}/b`,
      `PUT ${API}/c`,
      `DELETE ${API}/d`,
    ]);
  });
});

describe('reply body kinds', () => {
  // an initial handler passed to setupMswForTest, plus per-test server.use()
  const server = setupMswForTest([...mockApi().get(`${API}/text`).reply(200, 'hello').handlers()]);

  it('serves the initial text handler', async () => {
    expect(await (await fetch(`${API}/text`)).text()).toBe('hello');
  });

  it('serves a JSON object and a bodyless status added with server.use', async () => {
    server.use(
      ...mockApi()
        .get(`${API}/json`)
        .reply(200, { n: 1 })
        .delete(`${API}/gone`)
        .reply(204)
        .handlers(),
    );

    expect(await (await fetch(`${API}/json`)).json()).toEqual({ n: 1 });
    expect((await fetch(`${API}/gone`, { method: 'DELETE' })).status).toBe(204);
  });
});

describe('driving a node through MSW', () => {
  const server = setupMswForTest();

  it('returns the JSON body on the happy path', async () => {
    server.use(
      ...mockApi()
        .get(`${API}/users`)
        .reply(200, [{ id: 1 }, { id: 2 }])
        .handlers(),
    );

    const ctx = createMockHttpExecuteFunctions({
      input: [{ json: {} }],
      params: { url: `${API}/users` },
    });
    const out = await new HttpExample().execute.call(ctx);

    expect(out[0]?.map((item) => item.json)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('retries a 503 and then succeeds (flakyThenSuccess)', async () => {
    server.use(presets.flakyThenSuccess(`${API}/flaky`, 2, { recovered: true }));

    const ctx = createMockHttpExecuteFunctions({
      input: [{ json: {} }],
      params: { url: `${API}/flaky`, maxRetries: 2 },
    });
    const out = await new HttpExample().execute.call(ctx);

    expect(out[0]?.[0]?.json).toEqual({ recovered: true });
  });

  it('gives up after maxRetries on a persistent 429 and throws NodeApiError', async () => {
    server.use(presets.rateLimited(`${API}/limited`));

    const ctx = createMockHttpExecuteFunctions({
      input: [{ json: {} }],
      params: { url: `${API}/limited`, maxRetries: 1 },
    });

    await expect(new HttpExample().execute.call(ctx)).rejects.toMatchObject({
      httpCode: '429',
    });
  });

  it("aborts on the caller's timeout (timeout preset)", async () => {
    server.use(presets.timeout(`${API}/slow`));

    const ctx = createMockHttpExecuteFunctions({
      input: [{ json: {} }],
      params: { url: `${API}/slow`, timeout: 50, maxRetries: 0 },
    });

    await expect(new HttpExample().execute.call(ctx)).rejects.toBeInstanceOf(NodeApiError);
  });

  it('routes the failure to the output when continueOnFail is on', async () => {
    server.use(presets.rateLimited(`${API}/limited`));

    const ctx = createMockHttpExecuteFunctions({
      input: [{ json: { keep: 'me' } }],
      params: { url: `${API}/limited`, maxRetries: 0 },
      continueOnFail: true,
    });
    const out = await new HttpExample().execute.call(ctx);

    expect(out[0]?.[0]?.json).toEqual({ keep: 'me' });
    expect(out[0]?.[0]?.error).toBeInstanceOf(NodeApiError);
  });

  it('fails loudly on an unmatched request', async () => {
    const ctx = createMockHttpExecuteFunctions({
      input: [{ json: {} }],
      params: { url: `${API}/never-mocked`, maxRetries: 0 },
    });

    await expect(new HttpExample().execute.call(ctx)).rejects.toThrow();
  });
});

describe('performHttpRequest', () => {
  const server = setupMswForTest();
  const node = createMockHttpExecuteFunctions().getNode();

  it('passes the query string and returns the parsed body', async () => {
    server.use(...mockApi().get(`${API}/search`).reply(200, { hits: 3 }).handlers());

    const body = await performHttpRequest(node, { url: `${API}/search`, qs: { q: 'ada' } });
    expect(body).toEqual({ hits: 3 });
  });

  it('returns status and headers with returnFullResponse', async () => {
    server.use(...mockApi().get(`${API}/thing`).reply(200, { ok: true }).handlers());

    const res = (await performHttpRequest(node, {
      url: `${API}/thing`,
      returnFullResponse: true,
    })) as { statusCode: number; body: unknown };

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('throws NodeApiError with httpCode on a non-2xx response', async () => {
    server.use(...mockApi().get(`${API}/missing`).reply(404, { message: 'nope' }).handlers());

    await expect(performHttpRequest(node, { url: `${API}/missing` })).rejects.toMatchObject({
      httpCode: '404',
    });
  });

  it('returns the body instead of throwing when ignoreHttpStatusErrors is set', async () => {
    server.use(...mockApi().get(`${API}/missing`).reply(404, { message: 'nope' }).handlers());

    const body = await performHttpRequest(node, {
      url: `${API}/missing`,
      ignoreHttpStatusErrors: true,
    });
    expect(body).toEqual({ message: 'nope' });
  });
});
