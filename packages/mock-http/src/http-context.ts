import { createMockExecuteFunctions } from '@n8n-probe/core';
import type { CreateMockExecuteFunctionsOptions } from '@n8n-probe/core';
import axios from 'axios';
import type { AxiosRequestConfig, RawAxiosRequestHeaders } from 'axios';
import { NodeApiError } from 'n8n-workflow';
import type { IHttpRequestOptions, INode, JsonObject } from 'n8n-workflow';

/** Map `IHttpRequestOptions.encoding` onto an axios `responseType`. */
function responseType(
  encoding: IHttpRequestOptions['encoding'],
): AxiosRequestConfig['responseType'] {
  if (encoding === 'arraybuffer') return 'arraybuffer';
  if (encoding === 'text' || encoding === 'document') return 'text';
  return 'json';
}

/**
 * A faithful-enough stand-in for n8n's `helpers.httpRequest`: it performs a real
 * request with axios (as n8n does), so MSW / WireMock can intercept it, and maps
 * the common `IHttpRequestOptions` fields. A non-2xx response (unless
 * `ignoreHttpStatusErrors`) and transport failures are re-thrown as
 * `NodeApiError`, matching what a real node catches.
 *
 * Not covered: `httpRequestWithAuthentication`, proxy auth, form/multipart
 * bodies, `arrayFormat` query serialisation.
 */
export async function performHttpRequest(
  node: INode,
  options: IHttpRequestOptions,
): Promise<unknown> {
  const {
    url,
    baseURL,
    method = 'GET',
    headers,
    qs,
    body,
    timeout,
    returnFullResponse = false,
    encoding,
    ignoreHttpStatusErrors = false,
  } = options;

  try {
    const response = await axios.request<unknown>({
      url,
      baseURL,
      method,
      headers: headers as RawAxiosRequestHeaders | undefined,
      params: qs,
      data: body,
      timeout,
      responseType: responseType(encoding),
      validateStatus: ignoreHttpStatusErrors
        ? () => true
        : (status) => status >= 200 && status < 300,
    });

    if (returnFullResponse) {
      return { body: response.data, headers: response.headers, statusCode: response.status };
    }
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data: unknown = error.response?.data;
      throw new NodeApiError(
        node,
        data && typeof data === 'object' ? (data as JsonObject) : { message: error.message },
        {
          message: error.message,
          ...(status != null ? { httpCode: String(status) } : {}),
        },
      );
    }
    throw error;
  }
}

/**
 * Like `@n8n-probe/core`'s `createMockExecuteFunctions`, but with
 * `helpers.httpRequest` wired to a real client ({@link performHttpRequest}) so a
 * node's outbound calls can be intercepted by `setupMswForTest` / `startWireMock`.
 * Every other member stays a mutable deep mock.
 */
export function createMockHttpExecuteFunctions(
  options: CreateMockExecuteFunctionsOptions = {},
): ReturnType<typeof createMockExecuteFunctions> {
  const ctx = createMockExecuteFunctions(options);
  const node = ctx.getNode();
  ctx.helpers.httpRequest.mockImplementation((requestOptions: IHttpRequestOptions) =>
    performHttpRequest(node, requestOptions),
  );
  return ctx;
}
