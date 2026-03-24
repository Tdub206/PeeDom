import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { deactivateAccount as deactivateAccountRequest, deleteAccount as deleteAccountRequest } from '@/api/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { performUserSignOut } from '@/lib/account-session';
import { offlineQueue } from '@/lib/offline-queue';
import { realtimeManager } from '@/lib/realtime-manager';
import { getErrorMessage } from '@/utils/errorMap';

interface UseAccountSignOutOptions {
  showSuccessToast?: boolean;
}

export function useAccountSignOut(options?: UseAccountSignOutOptions) {
  const queryClient = useQueryClient();
  const { signOut: completeAuthSignOut } = useAuth();
  const { showToast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = useCallback(async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await performUserSignOut({
        cancelQueries: () => queryClient.cancelQueries(),
        clearOfflineQueue: () => offlineQueue.clear(),
        clearRealtimeChannels: () => realtimeManager.clearChannels(),
        clearQueryCache: () => {
          queryClient.clear();
        },
        signOut: completeAuthSignOut,
        onError: (step, error) => {
          console.error(`Sign-out step failed: ${step}`, error);
        },
      });

      if (options?.showSuccessToast !== false) {
        showToast({
          title: 'Signed out',
          message: 'You are back in guest mode.',
          variant: 'info',
        });
      }
    } catch (error) {
      console.error('Unable to complete sign-out:', error);
      showToast({
        title: 'Unable to sign out',
        message: getErrorMessage(error, 'Try again in a moment.'),
        variant: 'error',
      });
    } finally {
      setIsSigningOut(false);
    }
  }, [completeAuthSignOut, isSigningOut, options?.showSuccessToast, queryClient, showToast]);

  return {
    isSigningOut,
    signOut,
  };
}

export function useDeactivateAccount() {
  const { showToast } = useToast();
  const { isSigningOut, signOut } = useAccountSignOut({
    showSuccessToast: false,
  });
  const [isDeactivating, setIsDeactivating] = useState(false);

  const deactivateAccount = useCallback(async () => {
    if (isDeactivating || isSigningOut) {
      return false;
    }

    setIsDeactivating(true);

    try {
      const result = await deactivateAccountRequest();

      if (result.error) {
        throw result.error;
      }

      if (!result.data?.success) {
        throw new Error('Unable to deactivate your account right now.');
      }

      await signOut();
      showToast({
        title: 'Account deactivated',
        message: 'Your account has been deactivated and this device has been signed out.',
        variant: 'info',
      });
      return true;
    } catch (error) {
      showToast({
        title: 'Unable to deactivate account',
        message: getErrorMessage(error, 'Try again in a moment.'),
        variant: 'error',
      });
      return false;
    } finally {
      setIsDeactivating(false);
    }
  }, [isDeactivating, isSigningOut, showToast, signOut]);

  return {
    deactivateAccount,
    isDeactivating: isDeactivating || isSigningOut,
  };
}

export function useDeleteAccount() {
  const { showToast } = useToast();
  const { isSigningOut, signOut } = useAccountSignOut({
    showSuccessToast: false,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccount = useCallback(async () => {
    if (isDeleting || isSigningOut) {
      return false;
    }

    setIsDeleting(true);

    try {
      const result = await deleteAccountRequest();

      if (result.error) {
        throw result.error;
      }

      if (!result.data?.success) {
        throw new Error('Unable to delete your account right now.');
      }

      await signOut();
      showToast({
        title: 'Account deleted',
        message: 'Your account and personal data have been permanently removed.',
        variant: 'info',
      });
      return true;
    } catch (error) {
      showToast({
        title: 'Unable to delete account',
        message: getErrorMessage(error, 'Try again in a moment.'),
        variant: 'error',
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, isSigningOut, showToast, signOut]);

  return {
    deleteAccount,
    isDeleting: isDeleting || isSigningOut,
  };
}
