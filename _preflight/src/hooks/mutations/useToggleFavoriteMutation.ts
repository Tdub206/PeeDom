/**
 * useToggleFavoriteMutation
 *
 * Thin wrapper over useOfflineMutation for toggling bathroom favorites.
 * Returns a mutateAsync function that always resolves to MutationOutcome.
 *
 * Usage:
 *   const { toggleFavorite, isPending } = useToggleFavoriteMutation();
 *
 *   const outcome = await toggleFavorite({ bathroomId, currentlyFavorited: true });
 *   if (outcome === 'auth_required') router.push('/(auth)/login');
 *   if (outcome === 'queued_retry') showOfflineBanner();
 */

import { useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useOfflineMutation } from './useOfflineMutation';
import { MutationOutcome } from '@/types';
import { FavoriteAddPayload, FavoriteRemovePayload } from '@/lib/offline/mutation-registry';

interface ToggleFavoriteArgs {
  bathroomId: string;
  /** Current state — determines whether we add or remove */
  currentlyFavorited: boolean;
}

export function useToggleFavoriteMutation(options?: {
  onSuccess?: (outcome: MutationOutcome) => void;
  onAuthRequired?: () => void;
}) {
  const userId = useAuthStore((s) => s.user?.id);

  const addMutation = useOfflineMutation<FavoriteAddPayload>({
    mutationType: 'favorite_add',
    onSuccess: (outcome) => options?.onSuccess?.(outcome),
    onAuthRequired: options?.onAuthRequired,
  });

  const removeMutation = useOfflineMutation<FavoriteRemovePayload>({
    mutationType: 'favorite_remove',
    onSuccess: (outcome) => options?.onSuccess?.(outcome),
    onAuthRequired: options?.onAuthRequired,
  });

  const toggleFavorite = useCallback(
    async ({ bathroomId, currentlyFavorited }: ToggleFavoriteArgs): Promise<MutationOutcome> => {
      if (currentlyFavorited) {
        return removeMutation.mutateAsync({ bathroom_id: bathroomId });
      } else {
        return addMutation.mutateAsync({ bathroom_id: bathroomId });
      }
    },
    [addMutation, removeMutation]
  );

  return {
    toggleFavorite,
    isPending: addMutation.isPending || removeMutation.isPending,
    error: addMutation.error ?? removeMutation.error,
  };
}
