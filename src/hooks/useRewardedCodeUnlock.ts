import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import { showRewardedCodeRevealAd } from '@/lib/admob';
import { adMobRuntimeConfig } from '@/lib/admob-config';
import { clearExpiredCodeUnlocks, grantCodeUnlock, hasActiveCodeUnlock } from '@/lib/code-unlocks';
import { getErrorMessage } from '@/utils/errorMap';

interface UseRewardedCodeUnlockOptions {
  bathroomId: string | null;
  codeExpiresAt?: string | null;
  userId?: string | null;
}

export function useRewardedCodeUnlock({
  bathroomId,
  codeExpiresAt,
  userId,
}: UseRewardedCodeUnlockOptions) {
  const { showToast } = useToast();
  const [hasUnlock, setHasUnlock] = useState(false);
  const [isCheckingUnlock, setIsCheckingUnlock] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockIssue, setUnlockIssue] = useState<string | null>(null);

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

      setIsCheckingUnlock(true);

      try {
        await clearExpiredCodeUnlocks();
        const unlocked = await hasActiveCodeUnlock(bathroomId);

        if (isMounted) {
          setHasUnlock(unlocked);
          setUnlockIssue(null);
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
  }, [bathroomId]);

  const unlockWithAd = useCallback(async (): Promise<boolean> => {
    if (!bathroomId) {
      return false;
    }

    setIsUnlocking(true);

    try {
      const result = await showRewardedCodeRevealAd({
        bathroomId,
        userId,
      });

      if (result.outcome === 'earned') {
        await grantCodeUnlock(bathroomId, codeExpiresAt);
        setHasUnlock(true);
        setUnlockIssue(null);
        showToast({
          title: 'Code unlocked',
          message: 'Your rewarded ad completed. The bathroom code is now visible on this device.',
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
  }, [bathroomId, codeExpiresAt, showToast, userId]);

  return {
    hasUnlock,
    isCheckingUnlock,
    isUnlocking,
    isAdUnlockAvailable: adMobRuntimeConfig.isEnabled,
    adUnlockUnavailableReason: adMobRuntimeConfig.errorMessage,
    unlockIssue,
    unlockWithAd,
  };
}
