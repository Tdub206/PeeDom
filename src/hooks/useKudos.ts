import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sendKudos, fetchKudosCount } from '@/api/kudos';
import { useToast } from '@/hooks/useToast';

export const kudosQueryKeys = {
  count: (bathroomId: string) => ['kudos', 'count', bathroomId] as const,
};

export function useKudosCount(bathroomId: string | null) {
  return useQuery<number, Error>({
    queryKey: kudosQueryKeys.count(bathroomId ?? 'none'),
    enabled: Boolean(bathroomId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!bathroomId) return 0;
      const result = await fetchKudosCount(bathroomId);
      if (result.error) throw result.error;
      return result.count;
    },
  });
}

export function useSendKudos(bathroomId: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation<{ success: boolean }, Error, string | undefined>({
    mutationFn: async (message) => {
      if (!bathroomId) throw new Error('No bathroom selected');
      const result = await sendKudos(bathroomId, message);
      if (result.error) throw result.error;
      return { success: result.success };
    },
    onSuccess: () => {
      showToast({
        title: 'Thanks sent!',
        message: 'The business has been notified of your appreciation.',
        variant: 'success',
      });
      if (bathroomId) {
        void queryClient.invalidateQueries({
          queryKey: kudosQueryKeys.count(bathroomId),
        });
      }
    },
    onError: (error) => {
      showToast({
        title: 'Could not send thanks',
        message: error.message || 'Please try again later.',
        variant: 'error',
      });
    },
  });
}
