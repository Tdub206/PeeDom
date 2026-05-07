import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    rpc,
  }),
}));

describe('gamification API', () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it('records rewarded store points with SSV token and idempotency key', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        points_awarded: 25,
        new_balance: 125,
        daily_ad_count: 2,
        daily_limit_reached: false,
        duplicate: false,
      },
      error: null,
    });

    const { recordAdWatchedPoints } = await import('@/api/gamification');
    const result = await recordAdWatchedPoints({
      rewardVerificationToken: ' ap_mabc1234_1234567890abcdef ',
      idempotencyKey: ' earn_points:key-1 ',
    });

    expect(result.error).toBeNull();
    expect(result.data?.points_awarded).toBe(25);
    expect(result.data?.new_balance).toBe(125);
    expect(rpc).toHaveBeenCalledWith('record_ad_watched_points', {
      p_reward_verification_token: 'ap_mabc1234_1234567890abcdef',
      p_idempotency_key: 'earn_points:key-1',
    });
  });

  it('maps missing reward verification into a stable app code', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'REWARD_VERIFICATION_REQUIRED',
      },
    });

    const { recordAdWatchedPoints } = await import('@/api/gamification');
    const result = await recordAdWatchedPoints({
      rewardVerificationToken: 'ap_mabc1234_1234567890abcdef',
      idempotencyKey: 'earn_points:key-1',
    });

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('REWARD_VERIFICATION_REQUIRED');
  });
});
