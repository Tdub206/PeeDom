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
});
