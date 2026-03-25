import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { favoritesKeys } from '@/lib/favorites-query-keys';
import { realtimeManager } from '@/lib/realtime-manager';
import { Sentry } from '@/lib/sentry';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import type { FavoriteChangePayload } from '@/types/realtime';

export function useRealtimeFavorites(userId: string | null): void {
  const queryClient = useQueryClient();
  const addFavoritedId = useFavoritesStore((state) => state.addFavoritedId);
  const clearOptimisticToggle = useFavoritesStore((state) => state.clearOptimisticToggle);
  const removeFavoritedId = useFavoritesStore((state) => state.removeFavoritedId);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channelName = `favorites:user:${userId}`;

    realtimeManager.subscribe(channelName, (channel) =>
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'favorites',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            try {
              const typedPayload = payload as unknown as FavoriteChangePayload;
              const bathroomId = typedPayload.new?.bathroom_id;

              if (!bathroomId) {
                return;
              }

              addFavoritedId(userId, bathroomId);
              clearOptimisticToggle(bathroomId);
              void queryClient.invalidateQueries({
                queryKey: favoritesKeys.all,
                refetchType: 'active',
              });
            } catch (error) {
              Sentry.captureException(error);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'favorites',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            try {
              const typedPayload = payload as unknown as FavoriteChangePayload;
              const bathroomId = typedPayload.old?.bathroom_id ?? null;

              if (bathroomId) {
                removeFavoritedId(userId, bathroomId);
                clearOptimisticToggle(bathroomId);
              }

              void queryClient.invalidateQueries({
                queryKey: favoritesKeys.all,
                refetchType: 'active',
              });
            } catch (error) {
              Sentry.captureException(error);
            }
          }
        )
    );

    return () => {
      void realtimeManager.unregister(channelName);
    };
  }, [addFavoritedId, clearOptimisticToggle, queryClient, removeFavoritedId, userId]);
}
