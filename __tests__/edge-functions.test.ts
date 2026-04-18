import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const fetchMock = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
const originalFetch = global.fetch;

jest.mock('@/lib/supabase-config', () => ({
  supabaseRuntimeConfig: {
    supabaseUrl: 'https://stallpass.example.supabase.co',
    supabaseAnonKey: 'anon-key',
    missingKeys: [],
    isConfigured: true,
    errorMessage: null,
  },
}));

describe('edge function helper', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('invokes edge functions with normalized auth headers and parses JSON responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );

    const { invokeEdgeFunction } = await import('@/lib/edge-functions');
    const result = await invokeEdgeFunction<{ success: boolean }>({
      functionName: 'delete-account',
      accessToken: 'access-token',
      method: 'POST',
    });

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://stallpass.example.supabase.co/functions/v1/delete-account',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer access-token',
          apikey: 'anon-key',
        }),
      })
    );
  });

  it('returns readable errors when the response body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('upstream unavailable', {
        status: 503,
      })
    );

    const { invokeEdgeFunction } = await import('@/lib/edge-functions');
    const result = await invokeEdgeFunction<{ success: boolean }>({
      functionName: 'delete-account',
      accessToken: 'access-token',
      method: 'POST',
    });

    expect(result.data).toBeNull();
    expect(result.status).toBe(503);
    expect(result.error?.message).toBe('upstream unavailable');
    expect(result.error?.code).toBe('EDGE_FUNCTION_HTTP_ERROR');
  });

  it('normalizes aborted requests as timeout errors', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortError);

    const { invokeEdgeFunction } = await import('@/lib/edge-functions');
    const result = await invokeEdgeFunction<{ success: boolean }>({
      functionName: 'delete-account',
      accessToken: 'access-token',
      method: 'POST',
    });

    expect(result.data).toBeNull();
    expect(result.status).toBeNull();
    expect(result.error?.code).toBe('EDGE_FUNCTION_TIMEOUT');
    expect(result.error?.message).toBe('The delete-account request timed out.');
  });
});
