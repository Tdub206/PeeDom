import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { recordAdWatchedPoints } from '@/api/gamification';
import { getAdMobAvailability, showRewardedEarnPointsAd } from '@/lib/admob';
import { getErrorMessage } from '@/utils/errorMap';

export const AD_POINTS_REWARD = 10;

export interface UseEarnPointsAdResult {
  isAdAvailable: boolean;
  isEarning: boolean;
  lastError: string | null;
  watchAdForPoints: () => Promise<boolean>;
}

/**
 * Hook for the voluntary "watch an ad → earn points" flow.
 * The user initiates this themselves — it is never shown automatically.
 */
export function useEarnPointsAd(): UseEarnPointsAdResult {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isEarning, setIsEarning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const adMobAvailability = useMemo(() => getAdMobAvailability(), []);

  const watchAdForPoints = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setLastError('Sign in to earn points by watching ads.');
      showToast({
        title: 'Sign in required',
        message: 'Create a free account to earn points by watching ads.',
        variant: 'info',
      });
      return false;
    }

    setIsEarning(true);
    setLastError(null);

    try {
      const adResult = await showRewardedEarnPointsAd(user.id);

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

      const pointsResult = await recordAdWatchedPoints();

      if (pointsResult.error || !pointsResult.data) {
        const message = getErrorMessage(pointsResult.error, 'Ad completed but points could not be awarded right now.');
        setLastError(message);
        showToast({ title: 'Points unavailable', message, variant: 'error' });
        return false;
      }

      const { points_awarded, daily_limit_reached } = pointsResult.data;

      if (daily_limit_reached) {
        showToast({
          title: "You've hit today's limit",
          message: `+${points_awarded} points earned. Come back tomorrow to watch more ads.`,
          variant: 'success',
        });
      } else {
        showToast({
          title: `+${points_awarded} points earned!`,
          message: 'Watch more ads any time to keep building your balance.',
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
  }, [user, showToast]);

  return {
    isAdAvailable: adMobAvailability.isAvailable,
    isEarning,
    lastError,
    watchAdForPoints,
  };
}
