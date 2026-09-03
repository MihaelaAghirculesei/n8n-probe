import { delay, http, HttpResponse } from 'msw';
import type { RequestHandler } from 'msw';

import { toResponse } from './msw.js';

/** Ready-made MSW handlers for the failure modes node authors most often get wrong. */
export const presets = {
  /**
   * Always responds `429 Too Many Requests` with a `Retry-After: 1` header, for
   * any method on `path`.
   */
  rateLimited(path: string): RequestHandler {
    return http.all(path, () =>
      HttpResponse.json(
        { message: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': '1' } },
      ),
    );
  },

  /**
   * Never settles within a normal request timeout, so the caller's own
   * `timeout` must fire. Use a bounded `timeout` on the request under test.
   */
  timeout(path: string): RequestHandler {
    return http.all(path, async () => {
      await delay('infinite');
      return HttpResponse.json({});
    });
  },

  /**
   * Responds `503` for the first `failuresBeforeSuccess` calls to `path`, then
   * `200` with `body` for every call after that. Counts across methods.
   */
  flakyThenSuccess(
    path: string,
    failuresBeforeSuccess: number,
    body: unknown = { ok: true },
  ): RequestHandler {
    let calls = 0;
    return http.all(path, () => {
      calls += 1;
      if (calls <= failuresBeforeSuccess) {
        return HttpResponse.json({ message: 'Service Unavailable' }, { status: 503 });
      }
      return toResponse(200, body);
    });
  },
};
