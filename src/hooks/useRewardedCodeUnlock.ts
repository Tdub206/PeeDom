import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { fetchBathroomCodeRevealAccess, grantBathroomCodeRevealAccess } from '@/api/access-codes';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getAdMobAvailability, showRewardedCodeRevealAd } from '@/lib/admob';
import { hasActivePremium } from '@/lib/gamification';
import { pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';

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
  const adMobAvailability = useMemo(() => getAdMobAvailability(), []);
  const isPremiumUser = hasActivePremium(profile);

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
          setUnlockIssue(unlocked.error ? getErrorMessage(unlocked.error, 'Unable to restore your rewarded unlock right now.') : null);
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

  const unlockWithAd = useCallback(async (): Promise<boolean> => {
    if (!bathroomId) {
      return false;
    }

    const authenticatedUser = requireAuth({
      type: 'reveal_code',
      route: `/bathroom/${bathroomId}`,
      params: {
        bathroom_id: bathroomId,
      },
    });

    if (!authenticatedUser) {
      setUnlockIssue('Sign in to reveal this bathroom code after a rewarded ad.');
      pushSafely(router, routes.auth.login, routes.auth.login);
      return false;
    }

    setIsUnlocking(true);

    try {
      const result = await showRewardedCodeRevealAd({
        bathroomId,
        userId,
      });

      if (result.outcome === 'earned') {
        const grantResult = await grantBathroomCodeRevealAccess(bathroomId);

        if (grantResult.error || !grantResult.data) {
          const message = getErrorMessage(grantResult.error, 'The reward completed, but the code could not be unlocked.');
          setUnlockIssue(message);
          showToast({
            title: 'Unlock failed',
            message,
            variant: 'error',
          });
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
      showToast({
        title: 'Ad unavailable',
        message,
        variant: 'error',
      });
      return false;
    } finally {
      setIsUnlocking(false);
    }
  }, [bathroomId, requireAuth, router, showToast, userId]);

  return {
    hasUnlock,
    isCheckingUnlock,
    isUnlocking,
    isAdUnlockAvailable: adMobAvailability.isAvailable,
    adUnlockUnavailableReason: adMobAvailability.errorMessage,
    unlockIssue,
    unlockWithAd,
  };
}
