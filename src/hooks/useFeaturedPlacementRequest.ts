import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  requestFeaturedPlacement,
  cancelFeaturedRequest,
  type RequestFeaturedPlacementInput,
} from '@/api/featured-placements';
import { useToast } from '@/hooks/useToast';
import { adminQueryKeys } from '@/hooks/useAdminClaims';

export const featuredRequestQueryKeys = {
  all: ['featured-requests'] as const,
  mine: (userId: string) => [...featuredRequestQueryKeys.all, 'mine', userId] as const,
};

export function useSubmitFeaturedRequest() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<
    { requestId: string },
    Error,
    RequestFeaturedPlacementInput
  >({
    mutationFn: async (input) => {
      const result = await requestFeaturedPlacement(input);
      if (result.error || !result.requestId) {
        throw result.error ?? new Error('Failed to submit request');
      }
      return { requestId: result.requestId };
    },
    onSuccess: () => {
      showToast({
        title: 'Request Submitted',
        message: 'Your featured placement request has been submitted for admin review.',
        variant: 'success',
      });
      void queryClient.invalidateQueries({ queryKey: featuredRequestQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.featuredRequests() });
    },
    onError: (error) => {
      showToast({
        title: 'Request Failed',
        message: error.message || 'Failed to submit featured placement request.',
        variant: 'error',
      });
    },
  });
}

export function useCancelFeaturedRequest() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: async (requestId) => {
      const result = await cancelFeaturedRequest(requestId);
      if (result.error) throw result.error;
      return { success: result.success };
    },
    onSuccess: () => {
      showToast({
        title: 'Request Cancelled',
        message: 'Your featured placement request has been cancelled.',
        variant: 'info',
      });
      void queryClient.invalidateQueries({ queryKey: featuredRequestQueryKeys.all });
    },
    onError: (error) => {
      showToast({
        title: 'Cancel Failed',
        message: error.message || 'Failed to cancel request.',
        variant: 'error',
      });
    },
  });
}
