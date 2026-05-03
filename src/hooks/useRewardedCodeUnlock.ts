import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { fetchBathroomCodeRevealAccess, grantBathroomCodeRevealAccess } from '@/api/access-codes';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getAdMobAvailability, showRewardedCodeRevealAd } from '@/lib/admob';
import {
  canSpendPointsOnFeature,
  CODE_REVEAL_UNLOCK_POINTS_COST,
  hasServerStarterFeatureAccess,
} from '@/lib/feature-access';
import { hasActivePremium } from '@/lib/gamification';
import { pushSafely } from '@/lib/navigation';
import { createUnlockIdempotencyKey } from '@/lib/unlock-idempotency';
import { getErrorMessage } from '@/utils/errorMap';

interface UseRewardedCodeUnlockOptions {
  bathroomId: string | null;
  userId?: string | null;
}

type UnlockMode = 'ad' | 'points' | null;

export function useRewardedCodeUnlock({
  bathroomId,
  userId,
}: UseRewardedCodeUnlockOptions) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { profile, refreshProfile, requireAuth } = useAuth();
  const { showToast } = useToast();
  const [hasUnlock, setHasUnlock] = useState(false);
  const [isCheckingUnlock, setIsCheckingUnlock] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockIssue, setUnlockIssue] = useState<string | null>(null);
  const [unlockMode, setUnlockMode] = useState<UnlockMode>(null);
  const [hasAttemptedPaidUnlock, setHasAttemptedPaidUnlock] = useState(false);
  const unlockInFlightRef = useRef(false);
  const adMobAvailability = useMemo(() => getAdMobAvailability(), []);
  const isPremiumUser = hasActivePremium(profile);
  const isFreeUnlockAvailable = useMemo(
    () => !isPremiumUser && hasServerStarterFeatureAccess(profile, 'code_reveal'),
    [isPremiumUser, profile]
  );
  const canUnlockWithPoints = useMemo(
    () =>
      !isPremiumUser &&
      !isFreeUnlockAvailable &&
      canSpendPointsOnFeature(profile, 'code_reveal'),
    [isFreeUnlockAvailable, isPremiumUser, profile]
  );

  useEffect(() => {
    setHasAttemptedPaidUnlock(false);
    setUnlockIssue(null);
    setUnlockMode(null);
  }, [bathroomId]);

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
              ? getErrorMessage(unlocked.error, 'Unable to restore your code access right now.')
              : null
          );
        }
      } catch (error) {
        if (isMounted) {
          setHasUnlock(false);
          setUnlockIssue(getErrorMessage(error, 'Unable to restore your code access right now.'));
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

  const syncAccountUnlockState = useCallback(async () => {
    await refreshProfile();
    await queryClient.invalidateQueries({ queryKey: ['gamification'] });
  }, [queryClient, refreshProfile]);

  const requireUnlockAuth = useCallback(() => {
    if (!bathroomId) {
      return null;
    }

    const authenticatedUser = requireAuth({
      type: 'reveal_code',
      route: `/bathroom/${bathroomId}`,
      params: {
        bathroom_id: bathroomId,
      },
    });

    if (!authenticatedUser) {
      const message = 'Sign in to unlock verified bathroom codes and keep your free reveal tied to your account.';
      setUnlockIssue(message);
      pushSafely(router, routes.auth.login, routes.auth.login);
      return null;
    }

    return authenticatedUser;
  }, [bathroomId, requireAuth, router]);

  const unlockWithAd = useCallback(async (): Promise<boolean> => {
    if (!bathroomId) {
      return false;
    }

    if (unlockInFlightRef.current) {
      return false;
    }

    const authenticatedUser = requireUnlockAuth();

    if (!authenticatedUser) {
      return false;
    }

    unlockInFlightRef.current = true;
    setIsUnlocking(true);
    setUnlockMode('ad');

    try {
      if (isFreeUnlockAvailable) {
        const grantResult = await grantBathroomCodeRevealAccess(bathroomId, 'starter_free', {
          idempotencyKey: createUnlockIdempotencyKey(`code_reveal:${bathroomId}:starter_free`),
        });

        if (grantResult.error || !grantResult.data) {
          const message = getErrorMessage(
            grantResult.error,
            'Your free reveal is available, but the code could not be unlocked.'
          );
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
        await syncAccountUnlockState();
        showToast({
          title: 'First reveal unlocked',
          message:
            'Your account used its free code reveal. Future reveals can use 100 points, a rewarded video, or premium.',
          variant: 'success',
        });
        return true;
      }

      setHasAttemptedPaidUnlock(true);

      const result = await showRewardedCodeRevealAd({
        bathroomId,
        userId: authenticatedUser.id ?? userId ?? null,
      });

      if (result.outcome === 'earned') {
        const rewardVerificationToken = result.rewardVerificationToken?.trim() ?? '';

        if (!rewardVerificationToken) {
          const message =
            'The ad reward completed, but StallPass could not verify it safely. Use points or try again after rewarded unlock verification is restored.';
          setUnlockIssue(message);
          showToast({
            title: 'Verification unavailable',
            message,
            variant: 'warning',
          });
          return false;
        }

        const grantResult = await grantBathroomCodeRevealAccess(bathroomId, 'rewarded_ad', {
          idempotencyKey: createUnlockIdempotencyKey(`code_reveal:${bathroomId}:rewarded_ad`),
          rewardVerificationToken,
        });

        if (grantResult.error || !grantResult.data) {
          const message = getErrorMessage(
            grantResult.error,
            'The reward completed, but the code could not be unlocked.'
          );
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
          message: 'Your rewarded unlock completed. The current bathroom code is now visible for your account.',
          variant: 'success',
        });
        return true;
      }

      const message = result.message ?? 'The reward did not complete, so the code remained locked.';
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
      unlockInFlightRef.current = false;
      setIsUnlocking(false);
      setUnlockMode(null);
    }
  }, [
    bathroomId,
    isFreeUnlockAvailable,
    requireUnlockAuth,
    showToast,
    syncAccountUnlockState,
    userId,
  ]);

  const unlockWithPoints = useCallback(async (): Promise<boolean> => {
    if (!bathroomId) {
      return false;
    }

    if (unlockInFlightRef.current) {
      return false;
    }

    const authenticatedUser = requireUnlockAuth();

    if (!authenticatedUser) {
      return false;
    }

    setHasAttemptedPaidUnlock(true);

    if (!canUnlockWithPoints) {
      const message = getErrorMessage(
        Object.assign(new Error('INSUFFICIENT_UNLOCK_POINTS'), {
          code: 'INSUFFICIENT_UNLOCK_POINTS',
        }),
        'You need more contribution points for this one-time unlock.'
      );
      setUnlockIssue(message);
      showToast({
        title: 'Not enough points',
        message,
        variant: 'warning',
      });
      return false;
    }

    unlockInFlightRef.current = true;
    setIsUnlocking(true);
    setUnlockMode('points');

    try {
      const grantResult = await grantBathroomCodeRevealAccess(bathroomId, 'points_redeemed', {
        idempotencyKey: createUnlockIdempotencyKey(`code_reveal:${bathroomId}:points_redeemed`),
      });

      if (grantResult.error || !grantResult.data) {
        const message = getErrorMessage(grantResult.error, 'Unable to spend points on this code unlock right now.');
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
      await syncAccountUnlockState();
      showToast({
        title: 'Code unlocked',
        message: `Spent ${grantResult.data.points_spent} points. ${grantResult.data.remaining_points} points remain on your account.`,
        variant: 'success',
      });
      return true;
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to spend points on this code unlock right now.');
      setUnlockIssue(message);
      showToast({
        title: 'Unlock failed',
        message,
        variant: 'error',
      });
      return false;
    } finally {
      unlockInFlightRef.current = false;
      setIsUnlocking(false);
      setUnlockMode(null);
    }
  }, [bathroomId, canUnlockWithPoints, requireUnlockAuth, showToast, syncAccountUnlockState]);

  return {
    hasUnlock,
    isFreeUnlockAvailable,
    canUnlockWithPoints,
    pointsUnlockCost: CODE_REVEAL_UNLOCK_POINTS_COST,
    isCheckingUnlock,
    isUnlocking,
    isUnlockingWithAd: isUnlocking && unlockMode === 'ad',
    isUnlockingWithPoints: isUnlocking && unlockMode === 'points',
    isAdUnlockAvailable: adMobAvailability.isAvailable,
    adUnlockUnavailableReason: adMobAvailability.errorMessage,
    unlockIssue,
    showPremiumPrompt: !isPremiumUser && !hasUnlock && hasAttemptedPaidUnlock,
    unlockWithAd,
    unlockWithPoints,
  };
}
