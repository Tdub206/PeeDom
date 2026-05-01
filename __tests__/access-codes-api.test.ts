import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const maybeSingle: jest.MockedFunction<() => Promise<{ data: unknown; error: unknown }>> = jest.fn();
const select: jest.MockedFunction<() => unknown> = jest.fn();
const eq: jest.MockedFunction<(column: string, value: unknown) => unknown> = jest.fn();
const from: jest.MockedFunction<(table: string) => unknown> = jest.fn();
const rpc: jest.MockedFunction<(fn: string, args?: unknown) => Promise<{ data: unknown; error: unknown }>> = jest.fn();

jest.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => ({
    from,
    rpc,
  }),
}));

describe('access codes API', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    select.mockReset();
    eq.mockReset();
    from.mockReset();
    rpc.mockReset();
  });

  it('submits a bathroom code through the hardened RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        code_id: 'code-123',
        created_at: '2026-03-20T12:00:00.000Z',
      },
      error: null,
    });

    const { createBathroomAccessCode } = await import('@/api/access-codes');
    const result = await createBathroomAccessCode('user-1', {
      bathroom_id: 'bathroom-1',
      code_value: '  1234#  ',
    });

    expect(result.error).toBeNull();
    expect(result.data?.code_id).toBe('code-123');
    expect(rpc).toHaveBeenCalledWith('submit_bathroom_access_code', {
      p_bathroom_id: 'bathroom-1',
      p_code_value: '1234#',
    });
  });

  it('maps code submission cooldown errors into stable app codes', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'CODE_SUBMISSION_COOLDOWN',
      },
    });

    const { createBathroomAccessCode } = await import('@/api/access-codes');
    const result = await createBathroomAccessCode('user-1', {
      bathroom_id: 'bathroom-1',
      code_value: '1234',
    });

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('CODE_SUBMISSION_COOLDOWN');
  });

  it('loads the current user vote from the owned vote row', async () => {
    eq.mockReturnThis();
    select.mockReturnThis();
    maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'vote-1',
        code_id: 'code-1',
        user_id: 'user-1',
        vote: 1,
        created_at: '2026-03-20T12:00:00.000Z',
        updated_at: '2026-03-20T12:00:00.000Z',
      },
      error: null,
    });

    from.mockReturnValueOnce({
      select,
      eq,
      maybeSingle,
    });

    const { fetchUserCodeVote } = await import('@/api/access-codes');
    const result = await fetchUserCodeVote('user-1', 'code-1');

    expect(result.error).toBeNull();
    expect(result.data?.vote).toBe(1);
  });

  it('records verification votes through the vote RPC', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        action: 'cast',
        code_id: 'code-1',
        vote: 1,
        voted_at: '2026-03-20T12:00:00.000Z',
      },
      error: null,
    });

    const { upsertCodeVote } = await import('@/api/access-codes');
    const result = await upsertCodeVote('user-1', 'code-1', 1);

    expect(result.error).toBeNull();
    expect(result.data?.action).toBe('cast');
    expect(rpc).toHaveBeenCalledWith('vote_on_code', {
      p_code_id: 'code-1',
      p_vote: 1,
    });
  });

  it('passes the requested unlock method into code reveal grants', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'grant-1',
          bathroom_id: 'bathroom-1',
          user_id: 'user-1',
          grant_source: 'points_redeemed',
          expires_at: '2026-03-20T12:00:00.000Z',
          created_at: '2026-03-20T12:00:00.000Z',
          updated_at: '2026-03-20T12:00:00.000Z',
          points_spent: 100,
          remaining_points: 240,
          used_free_unlock: false,
        },
      ],
      error: null,
    });

    const { grantBathroomCodeRevealAccess } = await import('@/api/access-codes');
    const result = await grantBathroomCodeRevealAccess('bathroom-1', 'points_redeemed');

    expect(result.error).toBeNull();
    expect(result.data?.grant_source).toBe('points_redeemed');
    expect(result.data?.points_spent).toBe(100);
    expect(rpc).toHaveBeenCalledWith('grant_bathroom_code_reveal_access', {
      p_bathroom_id: 'bathroom-1',
      p_unlock_method: 'points_redeemed',
    });
  });

  it('passes unlock idempotency and reward verification to code reveal grants', async () => {
    rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'grant-2',
          bathroom_id: 'bathroom-1',
          user_id: 'user-1',
          grant_source: 'rewarded_ad',
          expires_at: '2026-03-20T12:00:00.000Z',
          created_at: '2026-03-20T12:00:00.000Z',
          updated_at: '2026-03-20T12:00:00.000Z',
          points_spent: 0,
          remaining_points: 240,
          used_free_unlock: false,
        },
      ],
      error: null,
    });

    const { grantBathroomCodeRevealAccess } = await import('@/api/access-codes');
    const result = await grantBathroomCodeRevealAccess('bathroom-1', 'rewarded_ad', {
      idempotencyKey: 'unlock-key-1',
      rewardVerificationToken: 'reward-token-1',
    });

    expect(result.error).toBeNull();
    expect(result.data?.grant_source).toBe('rewarded_ad');
    expect(rpc).toHaveBeenCalledWith('grant_bathroom_code_reveal_access', {
      p_bathroom_id: 'bathroom-1',
      p_unlock_method: 'rewarded_ad',
      p_idempotency_key: 'unlock-key-1',
      p_reward_verification_token: 'reward-token-1',
    });
  });

  it('maps self-vote protection errors into stable app codes', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: {
        code: 'P0001',
        message: 'SELF_CODE_VOTE',
      },
    });

    const { upsertCodeVote } = await import('@/api/access-codes');
    const result = await upsertCodeVote('user-1', 'code-1', -1);

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('SELF_CODE_VOTE');
  });
});
