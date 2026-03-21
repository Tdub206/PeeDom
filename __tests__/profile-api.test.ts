import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
  }),
}));

describe('profile API', () => {
  beforeEach(() => {
    rpc.mockReset();
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
});
