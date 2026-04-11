import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { Session } from '@supabase/supabase-js';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const getSession = jest.fn<() => Promise<{ data: { session: Session | null } }>>();
const invokeEdgeFunction = jest.fn<
  () => Promise<{ data: unknown; error: (Error & { code?: string }) | null; status: number | null }>
>();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
    auth: {
      getSession,
    },
  }),
}));

jest.mock('@/lib/edge-functions', () => ({
  invokeEdgeFunction,
}));

describe('profile API', () => {
  beforeEach(() => {
    rpc.mockReset();
    getSession.mockReset();
    invokeEdgeFunction.mockReset();
  });

  it('updates the display name through the update_display_name RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
      },
      error: null,
    });

    const { updateDisplayName } = await import('@/api/profile');
    const result = await updateDisplayName('Jane Doe');

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('update_display_name', {
      p_display_name: 'Jane Doe',
    });
    expect(result.data?.success).toBe(true);
  });

  it('trims display names before calling the RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
      },
      error: null,
    });

    const { updateDisplayName } = await import('@/api/profile');
    await updateDisplayName('  Jane Doe  ');

    expect(rpc).toHaveBeenCalledWith('update_display_name', {
      p_display_name: 'Jane Doe',
    });
  });

  it('rejects invalid display names before touching the network', async () => {
    const { updateDisplayName } = await import('@/api/profile');
    const result = await updateDisplayName(' ');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('invalid_display_name');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('preserves RPC error codes for display-name failures', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: '42501',
        message: 'permission denied',
      },
    });

    const { updateDisplayName } = await import('@/api/profile');
    const result = await updateDisplayName('Jane Doe');

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('42501');
  });

  it('deactivates the account through the deactivate_account RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        success: true,
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        deactivated_at: '2026-03-20T12:00:00.000Z',
      },
      error: null,
    });

    const { deactivateAccount } = await import('@/api/profile');
    const result = await deactivateAccount();

    expect(result.error).toBeNull();
    expect(rpc).toHaveBeenCalledWith('deactivate_account');
    expect(result.data?.success).toBe(true);
    expect(result.data?.user_id).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('returns an application error when deactivation fails', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: '42501',
        message: 'permission denied',
      },
    });

    const { deactivateAccount } = await import('@/api/profile');
    const result = await deactivateAccount();

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('42501');
  });

  it('deletes the account through the delete-account edge function', async () => {
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
        warning: null,
      },
      error: null,
      status: 200,
    });

    const { deleteAccount } = await import('@/api/profile');
    const result = await deleteAccount();

    expect(result.error).toBeNull();
    expect(result.data?.success).toBe(true);
    expect(invokeEdgeFunction).toHaveBeenCalledWith({
      functionName: 'delete-account',
      accessToken: 'access-token',
      method: 'POST',
    });
  });

  it('returns a not_authenticated error when account deletion has no session', async () => {
    getSession.mockResolvedValueOnce({
      data: {
        session: null,
      },
    });

    const { deleteAccount } = await import('@/api/profile');
    const result = await deleteAccount();

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('not_authenticated');
    expect(invokeEdgeFunction).not.toHaveBeenCalled();
  });
});
