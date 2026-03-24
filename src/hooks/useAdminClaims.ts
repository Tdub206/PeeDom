import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPendingClaims,
  fetchPendingFeaturedRequests,
  moderateClaim,
  moderateFeaturedRequest,
  type AdminClaimListItem,
  type FeaturedRequestListItem,
} from '@/api/admin';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

export const adminQueryKeys = {
  all: ['admin'] as const,
  claims: () => [...adminQueryKeys.all, 'claims'] as const,
  featuredRequests: () => [...adminQueryKeys.all, 'featured-requests'] as const,
};

export function useAdminClaims() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return useQuery<AdminClaimListItem[], Error>({
    queryKey: adminQueryKeys.claims(),
    enabled: isAdmin,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const result = await fetchPendingClaims();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useAdminFeaturedRequests() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return useQuery<FeaturedRequestListItem[], Error>({
    queryKey: adminQueryKeys.featuredRequests(),
    enabled: isAdmin,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const result = await fetchPendingFeaturedRequests();
      if (result.error) throw result.error;
      return result.data;
    },
  });
}

export function useModerateClaim() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<
    { success: boolean },
    Error,
    { claimId: string; action: 'approve' | 'reject'; reason?: string }
  >({
    mutationFn: async ({ claimId, action, reason }) => {
      const result = await moderateClaim(claimId, action, reason);
      if (result.error) throw result.error;
      return { success: result.success };
    },
    onSuccess: (_, variables) => {
      showToast({
        title: variables.action === 'approve' ? 'Claim Approved' : 'Claim Rejected',
        message:
          variables.action === 'approve'
            ? 'Business claim has been approved. Verification badge applied.'
            : 'Business claim has been rejected.',
        variant: variables.action === 'approve' ? 'success' : 'info',
      });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.claims() });
      void queryClient.invalidateQueries({ queryKey: ['business'] });
    },
    onError: (error) => {
      showToast({
        title: 'Moderation Failed',
        message: error.message || 'Failed to moderate claim',
        variant: 'error',
      });
    },
  });
}

export function useModerateFeaturedRequest() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<
    { success: boolean },
    Error,
    { requestId: string; action: 'approve' | 'reject'; adminNotes?: string }
  >({
    mutationFn: async ({ requestId, action, adminNotes }) => {
      const result = await moderateFeaturedRequest(requestId, action, adminNotes);
      if (result.error) throw result.error;
      return { success: result.success };
    },
    onSuccess: (_, variables) => {
      showToast({
        title: variables.action === 'approve' ? 'Placement Approved' : 'Request Rejected',
        message:
          variables.action === 'approve'
            ? 'Featured placement has been activated.'
            : 'Featured request has been rejected.',
        variant: variables.action === 'approve' ? 'success' : 'info',
      });
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.featuredRequests() });
      void queryClient.invalidateQueries({ queryKey: ['business'] });
    },
    onError: (error) => {
      showToast({
        title: 'Moderation Failed',
        message: error.message || 'Failed to moderate request',
        variant: 'error',
      });
    },
  });
}
