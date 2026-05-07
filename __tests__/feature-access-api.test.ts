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

  it('passes emergency unlock idempotency and reward verification through RPC args', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          user_id: 'user-1',
          unlock_method: 'rewarded_ad',
          points_spent: 0,
          remaining_points: 220,
          used_free_unlock: false,
          unlocked_at: '2026-04-18T12:00:00.000Z',
        },
      ],
      error: null,
    });

    const { consumeEmergencyLookupAccess } = await import('@/api/feature-access');
    const result = await consumeEmergencyLookupAccess('rewarded_ad', {
      idempotencyKey: 'emergency-key-1',
      rewardVerificationToken: 'reward-token-1',
    });

    expect(result.error).toBeNull();
    expect(result.data?.unlock_method).toBe('rewarded_ad');
    expect(rpc).toHaveBeenCalledWith('consume_emergency_lookup_access', {
      p_unlock_method: 'rewarded_ad',
      p_idempotency_key: 'emergency-key-1',
      p_reward_verification_token: 'reward-token-1',
    });
  });
});
