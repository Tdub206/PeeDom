export type RewardedUnlockFeatureKey = 'code_reveal' | 'emergency_lookup';

export interface RewardedUnlockVerificationResponse {
  data: boolean;
  error: (Error & { code?: string }) | null;
}

export type RewardedUnlockVerificationCheck = () => Promise<RewardedUnlockVerificationResponse>;

export interface RewardedUnlockVerificationPollOptions {
  timeoutMs?: number;
  intervalMs?: number;
  now?: () => number;
  sleep?: (durationMs: number) => Promise<void>;
}

export interface RewardedUnlockVerificationPollResult {
  verified: boolean;
  timedOut: boolean;
  attempts: number;
  error: (Error & { code?: string }) | null;
}

export const REWARDED_UNLOCK_VERIFICATION_TIMEOUT_MS = 15_000;
export const REWARDED_UNLOCK_VERIFICATION_INTERVAL_MS = 1_500;

const defaultSleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

function toAppError(error: unknown): Error & { code?: string } {
  if (error instanceof Error) {
    return error as Error & { code?: string };
  }

  return new Error('Unable to check reward verification status.') as Error & { code?: string };
}

export async function waitForRewardedUnlockVerification(
  checkVerification: RewardedUnlockVerificationCheck,
  options: RewardedUnlockVerificationPollOptions = {}
): Promise<RewardedUnlockVerificationPollResult> {
  const timeoutMs = options.timeoutMs ?? REWARDED_UNLOCK_VERIFICATION_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? REWARDED_UNLOCK_VERIFICATION_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const startedAt = now();
  let attempts = 0;
  let lastError: (Error & { code?: string }) | null = null;

  while (now() - startedAt <= timeoutMs) {
    attempts += 1;

    try {
      const result = await checkVerification();

      if (result.data) {
        return {
          verified: true,
          timedOut: false,
          attempts,
          error: null,
        };
      }

      lastError = result.error;
    } catch (error) {
      lastError = toAppError(error);
    }

    const elapsedMs = now() - startedAt;

    if (elapsedMs >= timeoutMs) {
      break;
    }

    await sleep(Math.min(intervalMs, timeoutMs - elapsedMs));
  }

  return {
    verified: false,
    timedOut: true,
    attempts,
    error: lastError,
  };
}
