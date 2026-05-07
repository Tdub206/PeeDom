import { useCallback, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { fetchRewardedUnlockVerificationStatus } from '@/api/access-codes';
import { recordAdWatchedPoints } from '@/api/gamification';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getAdMobAvailability, showRewardedEarnPointsAd } from '@/lib/admob';
import { createUnlockIdempotencyKey } from '@/lib/unlock-idempotency';
import { waitForRewardedUnlockVerification } from '@/lib/rewarded-unlock-verification';
import { STORE_REWARDED_AD_POINTS } from '@/lib/store/catalog';
import { getErrorMessage } from '@/utils/errorMap';

export const AD_POINTS_REWARD = STORE_REWARDED_AD_POINTS;

export interface UseEarnPointsAdResult {
  isAdAvailable: boolean;
  isEarning: boolean;
  lastError: string | null;
  watchAdForPoints: () => Promise<boolean>;
}

/**
 * Hook for the voluntary watch-ad-to-bank-points flow. Rewards are only granted
 * after AdMob server-side verification writes an unconsumed reward token.
 */
export function useEarnPointsAd(): UseEarnPointsAdResult {
  const queryClient = useQueryClient();
  const { refreshProfile, user } = useAuth();
  const { showToast } = useToast();
  const [isEarning, setIsEarning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const pendingRewardRef = useRef<{ token: string; idempotencyKey: string; verificationConfirmed: boolean } | null>(null);
  const adMobAvailability = useMemo(() => getAdMobAvailability(), []);

  const refreshCurrencyState = useCallback(async () => {
    await Promise.all([
      refreshProfile(),
      queryClient.invalidateQueries({ queryKey: ['gamification'] }),
    ]);
  }, [queryClient, refreshProfile]);

  const watchAdForPoints = useCallback(async (): Promise<boolean> => {
    if (!user) {
      const message = 'Create a free account to earn points by watching ads.';
      setLastError(message);
      showToast({
        title: 'Sign in required',
        message,
        variant: 'info',
      });
      return false;
    }

    setIsEarning(true);
    setLastError(null);

    try {
      const adResult = pendingRewardRef.current
        ? {
            outcome: 'earned' as const,
            message: null,
            rewardVerificationToken: pendingRewardRef.current.token,
          }
        : await showRewardedEarnPointsAd(user.id);

      if (adResult.outcome !== 'earned') {
        const message = adResult.message ?? 'The ad did not complete. No points were awarded.';
        setLastError(message);
        showToast({
          title: adResult.outcome === 'unavailable' ? 'Ad unavailable' : 'Ad skipped',
          message,
          variant: adResult.outcome === 'unavailable' ? 'warning' : 'info',
        });
        return false;
      }

      const rewardVerificationToken = adResult.rewardVerificationToken?.trim() ?? '';

      if (!rewardVerificationToken) {
        const message =
          'The ad reward completed, but StallPass could not verify it safely. Try again after rewarded verification is restored.';
        setLastError(message);
        showToast({ title: 'Verification unavailable', message, variant: 'warning' });
        return false;
      }

      if (!pendingRewardRef.current || pendingRewardRef.current.token !== rewardVerificationToken) {
        pendingRewardRef.current = {
          token: rewardVerificationToken,
          idempotencyKey: createUnlockIdempotencyKey('earn_points:rewarded_ad'),
          verificationConfirmed: false,
        };
      }

      const pendingReward = pendingRewardRef.current;

      if (!pendingReward) {
        throw new Error('Reward verification state could not be restored.');
      }

      if (!pendingReward.verificationConfirmed) {
        const verificationResult = await waitForRewardedUnlockVerification(() =>
          fetchRewardedUnlockVerificationStatus({
            featureKey: 'earn_points',
            bathroomId: null,
            rewardVerificationToken,
          })
        );

        if (!verificationResult.verified) {
          const message = verificationResult.error
            ? getErrorMessage(
                verificationResult.error,
                'The reward completed, but StallPass is still waiting for AdMob server verification.'
              )
            : 'The reward completed, but StallPass is still waiting for AdMob server verification. Try again in a few seconds and this reward will be reused.';
          setLastError(message);
          showToast({ title: 'Verification pending', message, variant: 'warning' });
          return false;
        }

        pendingReward.verificationConfirmed = true;
      }

      const pointsResult = await recordAdWatchedPoints({
        rewardVerificationToken,
        idempotencyKey: pendingReward.idempotencyKey,
      });

      if (pointsResult.error || !pointsResult.data) {
        const message = getErrorMessage(pointsResult.error, 'Ad completed but points could not be awarded right now.');
        setLastError(message);
        showToast({ title: 'Points unavailable', message, variant: 'error' });
        return false;
      }

      pendingRewardRef.current = null;
      await refreshCurrencyState();

      const { daily_limit_reached, points_awarded } = pointsResult.data;

      if (points_awarded <= 0 && daily_limit_reached) {
        showToast({
          title: 'Daily earn limit reached',
          message: 'No points were awarded because your rewarded-ad earn limit is already used for today.',
          variant: 'info',
        });
        return true;
      }

      if (daily_limit_reached) {
        showToast({
          title: "You've hit today's limit",
          message: `+${points_awarded} points banked. Come back tomorrow to watch more ads.`,
          variant: 'success',
        });
      } else {
        showToast({
          title: `+${points_awarded} points banked`,
          message: 'Use points on code reveals or redeem a premium month from the Store.',
          variant: 'success',
        });
      }

      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Something went wrong. Please try again.');
      setLastError(message);
      showToast({ title: 'Ad failed', message, variant: 'error' });
      return false;
    } finally {
      setIsEarning(false);
    }
  }, [refreshCurrencyState, showToast, user]);

  return {
    isAdAvailable: adMobAvailability.isAvailable,
    isEarning,
    lastError: lastError ?? adMobAvailability.errorMessage,
    watchAdForPoints,
  };
}
