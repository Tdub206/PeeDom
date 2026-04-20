import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
  }),
}));

describe('feature access API', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('consumes emergency lookup access with the requested unlock method', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          user_id: 'user-1',
          unlock_method: 'points_redeemed',
          points_spent: 100,
          remaining_points: 220,
          used_free_unlock: false,
          unlocked_at: '2026-04-18T12:00:00.000Z',
        },
      ],
      error: null,
    });

    const { consumeEmergencyLookupAccess } = await import('@/api/feature-access');
    const result = await consumeEmergencyLookupAccess('points_redeemed');

    expect(result.error).toBeNull();
    expect(result.data?.points_spent).toBe(100);
    expect(rpc).toHaveBeenCalledWith('consume_emergency_lookup_access', {
      p_unlock_method: 'points_redeemed',
    });
  });
});
