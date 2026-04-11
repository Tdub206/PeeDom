import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Session } from '@supabase/supabase-js';

const getSession = jest.fn<() => Promise<{ data: { session: Session | null } }>>();
const invokeEdgeFunction = jest.fn<
  () => Promise<{ data: unknown; error: (Error & { code?: string }) | null; status: number | null }>
>();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession,
    },
  }),
}));

jest.mock('@/lib/edge-functions', () => ({
  invokeEdgeFunction,
}));

describe('auth API account deletion', () => {
  beforeEach(() => {
    getSession.mockReset();
    invokeEdgeFunction.mockReset();
  });

  it('fails fast when there is no active session', async () => {
    getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const { deleteCurrentAccount } = await import('@/api/auth');
    const result = await deleteCurrentAccount();

    expect(result.warning).toBeNull();
    expect(result.error?.message).toBe('You must be signed in to delete your account.');
    expect(invokeEdgeFunction).not.toHaveBeenCalled();
  });

  it('returns the deletion warning when the edge function succeeds with cleanup notes', async () => {
    getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token',
        } as unknown as Session,
      },
    });
    invokeEdgeFunction.mockResolvedValueOnce({
      data: {
        success: true,
        warning: 'The account was deleted, but some photos still need cleanup.',
      },
      error: null,
      status: 200,
    });

    const { deleteCurrentAccount } = await import('@/api/auth');
    const result = await deleteCurrentAccount();

    expect(result.error).toBeNull();
    expect(result.warning).toBe('The account was deleted, but some photos still need cleanup.');
    expect(invokeEdgeFunction).toHaveBeenCalledWith({
      functionName: 'delete-account',
      accessToken: 'access-token',
      method: 'POST',
    });
  });

  it('maps edge function failures into auth errors', async () => {
    getSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token',
        } as unknown as Session,
      },
    });
    invokeEdgeFunction.mockResolvedValueOnce({
      data: null,
      error: Object.assign(new Error('Unable to delete your account right now.'), {
        code: 'EDGE_FUNCTION_HTTP_ERROR',
      }),
      status: 500,
    });

    const { deleteCurrentAccount } = await import('@/api/auth');
    const result = await deleteCurrentAccount();

    expect(result.warning).toBeNull();
    expect(result.error?.message).toBe('Unable to delete your account right now.');
  });
});
