import { useMutation } from '@tanstack/react-query';
import { updateDisplayName } from '@/api/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { DisplayNameUpdateResult } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

export function useProfileDisplayName() {
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation<DisplayNameUpdateResult, Error, string>({
    mutationFn: async (displayName: string) => {
      const result = await updateDisplayName(displayName);

      if (result.error) {
        throw result.error;
      }

      return result.data ?? {
        success: false,
        error: 'unknown_error',
      };
    },
    onSuccess: async (result) => {
      if (result.success) {
        await refreshProfile();
      }
    },
    onError: (error) => {
      showToast({
        title: 'Display name update failed',
        message: getErrorMessage(error, 'Unable to update your display name right now.'),
        variant: 'error',
      });
    },
  });
}
