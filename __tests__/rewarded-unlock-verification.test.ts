import { describe, expect, it, jest } from '@jest/globals';
import { waitForRewardedUnlockVerification } from '@/lib/rewarded-unlock-verification';

describe('rewarded unlock verification polling', () => {
  it('keeps polling until the server-side reward verification row is visible', async () => {
    let currentTimeMs = 0;
    const now = () => currentTimeMs;
    const sleep = jest.fn(async (durationMs: number) => {
      currentTimeMs += durationMs;
    });
    const checkVerification = jest
      .fn<() => Promise<{ data: boolean; error: null }>>()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    const result = await waitForRewardedUnlockVerification(checkVerification, {
      intervalMs: 250,
      now,
      sleep,
      timeoutMs: 1_000,
    });

    expect(result).toEqual({
      verified: true,
      timedOut: false,
      attempts: 3,
      error: null,
    });
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('returns the last polling error when verification does not arrive before timeout', async () => {
    let currentTimeMs = 0;
    const now = () => currentTimeMs;
    const sleep = jest.fn(async (durationMs: number) => {
      currentTimeMs += durationMs;
    });
    const pollingError = Object.assign(new Error('Network unavailable'), {
      code: 'NETWORK_OFFLINE',
    });
    const checkVerification = jest.fn<() => Promise<{ data: boolean; error: typeof pollingError }>>().mockResolvedValue({
      data: false,
      error: pollingError,
    });

    const result = await waitForRewardedUnlockVerification(checkVerification, {
      intervalMs: 250,
      now,
      sleep,
      timeoutMs: 500,
    });

    expect(result.verified).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.error).toBe(pollingError);
    expect(result.attempts).toBeGreaterThan(1);
  });
});
