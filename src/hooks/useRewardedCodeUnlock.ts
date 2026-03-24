import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { fetchBathroomCodeRevealAccess, grantBathroomCodeRevealAccess } from '@/api/access-codes';
import { spendPointsForCodeReveal } from '@/api/gamification';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getAdMobAvailability, showRewardedCodeRevealAd } from '@/lib/admob';
import { consumeCodeRevealCredit, getFirstInstallCredits } from '@/lib/first-install-credits';
import { hasActivePremium } from '@/lib/gamification';
import { pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';

export const CODE_REVEAL_POINTS_COST = 10;

/** How the next unlock will be paid for. */
export type UnlockPath = 'premium' | 'free_credit' | 'points' | 'ad' | 'unavailable';

interface UseRewardedCodeUnlockOptions {
  bathroomId: string | null;
  userId?: string | null;
}

export function useRewardedCodeUnlock({
  bathroomId,
  userId,
}: UseRewardedCodeUnlockOptions) {
  const router = useRouter();
  const { profile, requireAuth } = useAuth();
  const { showToast } = useToast();
  const [hasUnlock, setHasUnlock] = useState(false);
  const [isCheckingUnlock, setIsCheckingUnlock] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockIssue, setUnlockIssue] = useState<string | null>(null);
  const [freeCreditsRemaining, setFreeCreditsRemaining] = useState(0);
  const adMobAvailability = useMemo(() => getAdMobAvailability(), []);
  const isPremiumUser = hasActivePremium(profile);
  const pointsBalance = profile?.points_balance ?? 0;
  const canSpendPoints = pointsBalance >= CODE_REVEAL_POINTS_COST;

  // Determine the cheapest available unlock path
  const unlockPath: UnlockPath = isPremiumUser || hasUnlock
    ? 'premium'
    : freeCreditsRemaining > 0
      ? 'free_credit'
      : canSpendPoints
        ? 'points'
        : adMobAvailability.isAvailable
          ? 'ad'
          : 'unavailable';

  // Sync free credit count on mount
  useEffect(() => {
    let isMounted = true;
    getFirstInstallCredits().then((credits) => {
      if (isMounted) setFreeCreditsRemaining(credits.code_reveals);
    }).catch(() => undefined);
    return () => { isMounted = false; };
  }, []);

  // Check existing server-side unlock
  useEffect(() => {
    let isMounted = true;

    const syncUnlockState = async () => {
      if (!bathroomId) {
        if (isMounted) {
          setHasUnlock(false);
          setUnlockIssue(null);
        }
        return;
      }

      if (isPremiumUser) {
        if (isMounted) {
          setHasUnlock(true);
          setUnlockIssue(null);
          setIsCheckingUnlock(false);
        }
        return;
      }

      if (!userId) {
        if (isMounted) {
          setHasUnlock(false);
          setUnlockIssue(null);
          setIsCheckingUnlock(false);
        }
        return;
      }

      setIsCheckingUnlock(true);

      try {
        const unlocked = await fetchBathroomCodeRevealAccess(bathroomId);

        if (isMounted) {
          setHasUnlock(unlocked.data);
          setUnlockIssue(
            unlocked.error
              ? getErrorMessage(unlocked.error, 'Unable to restore your rewarded unlock right now.')
              : null
          );
        }
      } catch (error) {
        if (isMounted) {
          setHasUnlock(false);
          setUnlockIssue(getErrorMessage(error, 'Unable to restore your rewarded unlock right now.'));
        }
      } finally {
        if (isMounted) {
          setIsCheckingUnlock(false);
        }
      }
    };

    void syncUnlockState();

    return () => {
      isMounted = false;
    };
  }, [bathroomId, isPremiumUser, userId]);

  /** Use a free onboarding credit (no auth required). */
  const unlockWithFreeCredit = useCallback(async (): Promise<boolean> => {
    if (!bathroomId) return false;

    const consumed = await consumeCodeRevealCredit();
    if (!consumed) {
      setUnlockIssue('No free credits remaining.');
      return false;
    }

    const remaining = await getFirstInstallCredits();
    setFreeCreditsRemaining(remaining.code_reveals);
    setHasUnlock(true);
    setUnlockIssue(null);

    const creditsLeft = remaining.code_reveals;
    showToast({
      title: 'Code revealed',
      message:
        creditsLeft > 0
          ? `${creditsLeft} free reveal${creditsLeft === 1 ? '' : 's'} remaining.`
          : 'Last free reveal used. Watch an ad or earn points to unlock more.',
      variant: 'success',
    });
    return true;
  }, [bathroomId, showToast]);

  /** Spend points to unlock (auth required). */
  const unlockWithPoints = useCallback(async (): Promise<boolean> => {
    if (!bathroomId) return false;

    const authenticatedUser = requireAuth({
      type: 'reveal_code',
      route: `/bathroom/${bathroomId}`,
      params: { bathroom_id: bathroomId },
    });

    if (!authenticatedUser) {
      setUnlockIssue('Sign in to spend points for code reveals.');
      pushSafely(router, routes.auth.login, routes.auth.login);
      return false;
    }

    setIsUnlocking(true);

    try {
      const result = await spendPointsForCodeReveal(bathroomId);

      if (result.error || !result.data) {
        const message = getErrorMessage(result.error, 'Unable to spend points right now.');
        setUnlockIssue(message);
        showToast({ title: 'Points spend failed', message, variant: 'error' });
        return false;
      }

      // Grant the server-side reveal access after spending points
      await grantBathroomCodeRevealAccess(bathroomId);

      setHasUnlock(true);
      setUnlockIssue(null);
      showToast({
        title: 'Code unlocked',
        message: `${CODE_REVEAL_POINTS_COST} points spent. Balance: ${result.data.new_balance} pts.`,
        variant: 'success',
      });
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to spend points right now.');
      setUnlockIssue(message);
      showToast({ title: 'Points spend failed', message, variant: 'error' });
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, [bathroomId, requireAuth, router, showToast]);

  /** Watch a rewarded ad to unlock (auth required). */
  const unlockWithAd = useCallback(async (): Promise<boolean> => {
    if (!bathroomId) return false;

    const authenticatedUser = requireAuth({
      type: 'reveal_code',
      route: `/bathroom/${bathroomId}`,
      params: { bathroom_id: bathroomId },
    });

    if (!authenticatedUser) {
      setUnlockIssue('Sign in to reveal this bathroom code after a rewarded ad.');
      pushSafely(router, routes.auth.login, routes.auth.login);
      return false;
    }

    setIsUnlocking(true);

    try {
      const result = await showRewardedCodeRevealAd({ bathroomId, userId });

      if (result.outcome === 'earned') {
        const grantResult = await grantBathroomCodeRevealAccess(bathroomId);

        if (grantResult.error || !grantResult.data) {
          const message = getErrorMessage(
            grantResult.error,
            'The reward completed, but the code could not be unlocked.'
          );
          setUnlockIssue(message);
          showToast({ title: 'Unlock failed', message, variant: 'error' });
          return false;
        }

        setHasUnlock(true);
        setUnlockIssue(null);
        showToast({
          title: 'Code unlocked',
          message: 'Your rewarded ad completed. The bathroom code is now visible for your account.',
          variant: 'success',
        });
        return true;
      }

      const message =
        result.message ?? 'The reward did not complete, so the code remained locked.';
      setUnlockIssue(message);
      showToast({
        title: result.outcome === 'unavailable' ? 'Ad unavailable' : 'Unlock cancelled',
        message,
        variant: result.outcome === 'unavailable' ? 'warning' : 'info',
      });
      return false;
    } catch (error) {
      const message = getErrorMessage(error, 'We could not load a rewarded ad right now.');
      setUnlockIssue(message);
      showToast({ title: 'Ad unavailable', message, variant: 'error' });
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, [bathroomId, requireAuth, router, showToast, userId]);

  /**
   * Convenience: automatically uses the best available path.
   * Priority: free credit → points → ad
   */
  const unlock = useCallback(async (): Promise<boolean> => {
    if (freeCreditsRemaining > 0) return unlockWithFreeCredit();
    if (canSpendPoints) return unlockWithPoints();
    return unlockWithAd();
  }, [freeCreditsRemaining, canSpendPoints, unlockWithFreeCredit, unlockWithPoints, unlockWithAd]);

  return {
    hasUnlock,
    isCheckingUnlock,
    isUnlocking,
    isAdUnlockAvailable: adMobAvailability.isAvailable,
    adUnlockUnavailableReason: adMobAvailability.errorMessage,
    unlockIssue,
    freeCreditsRemaining,
    pointsBalance,
    canSpendPoints,
    unlockPath,
    unlock,
    unlockWithFreeCredit,
    unlockWithPoints,
    unlockWithAd,
  };
}
