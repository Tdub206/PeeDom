import { useMutation } from '@tanstack/react-query';
import { updateDisplayName } from '@/api/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { DisplayNameUpdateResult } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

export function useProfileDisplayName() {
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();

  return useMutation<DisplayNameUpdateResult, Error & { code?: string }, string>({
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
      const errorMessage =
        error.code === 'invalid_display_name'
          ? error.message
          : error.code === 'rate_limited'
            ? 'You can change your display name once every 24 hours.'
            : getErrorMessage(error, 'Unable to update your display name right now.');

      showToast({
        title: 'Display name update failed',
        message: errorMessage,
        variant: 'error',
      });
    },
  });
}
