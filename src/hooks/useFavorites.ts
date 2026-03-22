import { useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchFavoriteBathroomsPage,
  fetchFavoriteIds,
  toggleFavorite as toggleFavoriteRpc,
} from '@/api/favorites';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeFavorites } from '@/hooks/useRealtimeFavorites';
import { favoritesKeys } from '@/lib/favorites-query-keys';
import { useToast } from '@/hooks/useToast';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import {
  BathroomListItem,
  FavoriteToggleAction,
  FavoriteItem,
  MutationOutcome,
  type Coordinates,
} from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';

interface FavoritesPage {
  items: FavoriteItem[];
  offset: number;
  hasMore: boolean;
}

const FAVORITES_PAGE_SIZE = 50;

function buildScopedBathroomIds(items: BathroomListItem[]): string[] {
  return [...new Set(items.map((item) => item.id).filter((id) => id.length > 0))];
}

export function useFavoriteDirectory(origin?: Coordinates | null) {
  const { isAuthenticated, user } = useAuth();
  const sortBy = useFavoritesStore((state) => state.sortBy);
  const replaceFavoritedIds = useFavoritesStore((state) => state.replaceFavoritedIds);
  const syncFavoritedIds = useFavoritesStore((state) => state.syncFavoritedIds);

  const directoryQuery = useInfiniteQuery<FavoritesPage, Error>({
    queryKey: favoritesKeys.directory(user?.id ?? 'guest', sortBy, origin),
    enabled: isAuthenticated && Boolean(user?.id),
    initialPageParam: 0,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const offset = typeof pageParam === 'number' ? pageParam : 0;
      const favoritesResult = await fetchFavoriteBathroomsPage({
        userId: user!.id,
        origin,
        sortBy,
        limit: FAVORITES_PAGE_SIZE,
        offset,
      });

      if (favoritesResult.error) {
        throw favoritesResult.error;
      }

      return {
        items: favoritesResult.data,
        offset,
        hasMore: favoritesResult.hasMore,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + FAVORITES_PAGE_SIZE : undefined,
  });

  useEffect(() => {
    if (!user?.id || !directoryQuery.data) {
      return;
    }

    const loadedItems = directoryQuery.data.pages.flatMap((page) => page.items);
    const loadedIds = loadedItems.map((item) => item.bathroom_id);

    if (!directoryQuery.hasNextPage) {
      replaceFavoritedIds(user.id, loadedIds);
      return;
    }

    syncFavoritedIds(user.id, loadedIds, loadedIds);
  }, [
    directoryQuery.data,
    directoryQuery.hasNextPage,
    replaceFavoritedIds,
    syncFavoritedIds,
    user?.id,
  ]);

  return {
    ...directoryQuery,
    items: directoryQuery.data?.pages.flatMap((page) => page.items) ?? [],
    sortBy,
  };
}

export function useFavorites(replayCandidates: BathroomListItem[] = []) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useToast();
  const replayedIntentIdsRef = useRef<Record<string, boolean>>({});
  const {
    clearReturnIntent,
    isAuthenticated,
    peekReturnIntent,
    requireAuth,
    user,
  } = useAuth();
  const ownerUserId = useFavoritesStore((state) => state.ownerUserId);
  const addFavoritedId = useFavoritesStore((state) => state.addFavoritedId);
  const clearFavoritedIds = useFavoritesStore((state) => state.clearFavoritedIds);
  const clearOptimisticToggle = useFavoritesStore((state) => state.clearOptimisticToggle);
  const isFavorited = useFavoritesStore((state) => state.isFavorited);
  const isFavoriteResolved = useFavoritesStore((state) => state.isFavoriteResolved);
  const isPending = useFavoritesStore((state) => state.isPending);
  const markOptimisticToggleQueued = useFavoritesStore((state) => state.markOptimisticToggleQueued);
  const removeFavoritedId = useFavoritesStore((state) => state.removeFavoritedId);
  const replaceFavoritedIds = useFavoritesStore((state) => state.replaceFavoritedIds);
  const setOptimisticToggle = useFavoritesStore((state) => state.setOptimisticToggle);
  const syncFavoritedIds = useFavoritesStore((state) => state.syncFavoritedIds);
  const scopedBathroomIds = useMemo(() => buildScopedBathroomIds(replayCandidates), [replayCandidates]);
  const scopedBathroomKey = useMemo(() => scopedBathroomIds.join(':'), [scopedBathroomIds]);

  useRealtimeFavorites(user?.id ?? null);

  useEffect(() => {
    if (!user?.id) {
      clearFavoritedIds();
      return;
    }

    if (ownerUserId && ownerUserId !== user.id) {
      replaceFavoritedIds(user.id, []);
    }
  }, [clearFavoritedIds, ownerUserId, replaceFavoritedIds, user?.id]);

  const favoriteIdsQuery = useQuery<string[], Error>({
    queryKey: favoritesKeys.ids(user?.id ?? 'guest', scopedBathroomKey),
    enabled: isAuthenticated && Boolean(user?.id) && scopedBathroomIds.length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const favoriteIdsResult = await fetchFavoriteIds({
        userId: user!.id,
        bathroomIds: scopedBathroomIds,
      });

      if (favoriteIdsResult.error) {
        throw favoriteIdsResult.error;
      }

      return favoriteIdsResult.data;
    },
  });

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    if (scopedBathroomIds.length === 0) {
      return;
    }

    if (!favoriteIdsQuery.data) {
      return;
    }

    syncFavoritedIds(user.id, scopedBathroomIds, favoriteIdsQuery.data);
  }, [favoriteIdsQuery.data, scopedBathroomIds, syncFavoritedIds, user?.id]);

  const commitFavoriteChange = useCallback(
    async (bathroomId: string): Promise<MutationOutcome> => {
      const authenticatedUser = requireAuth({
        type: 'favorite_toggle',
        route: pathname,
        params: {
          bathroom_id: bathroomId,
        },
      });

      if (!authenticatedUser) {
        pushSafely(router, routes.auth.login, routes.auth.login);
        return 'auth_required';
      }

      let intendedAction: FavoriteToggleAction | null = null;
      const initiatedAt = new Date().toISOString();

      if (!isFavoriteResolved(bathroomId)) {
        const favoriteIdsResult = await fetchFavoriteIds({
          userId: authenticatedUser.id,
          bathroomIds: [bathroomId],
        });

        if (favoriteIdsResult.error) {
          if (isTransientNetworkError(favoriteIdsResult.error)) {
            // We're offline and can't confirm server state for this bathroom.
            // Derive intent from local (persisted + optimistic) state, apply
            // optimistic UI now, then re-throw so the catch block queues the
            // mutation. The server's toggle_favorite RPC is atomic and will
            // correct any local-state skew when the queue replays.
            intendedAction = isFavorited(bathroomId) ? 'removed' : 'added';
            await queryClient.cancelQueries({ queryKey: favoritesKeys.all });
            setOptimisticToggle(bathroomId, intendedAction, { initiatedAt });
            throw favoriteIdsResult.error;
          }

          throw favoriteIdsResult.error;
        }

        syncFavoritedIds(authenticatedUser.id, [bathroomId], favoriteIdsResult.data);
      }

      intendedAction = isFavorited(bathroomId) ? 'removed' : 'added';

      await queryClient.cancelQueries({
        queryKey: favoritesKeys.all,
      });
      setOptimisticToggle(bathroomId, intendedAction, {
        initiatedAt,
      });

      try {
        const mutationResult = await toggleFavoriteRpc(authenticatedUser.id, bathroomId);

        if (mutationResult.error || !mutationResult.data) {
          throw mutationResult.error ?? new Error('We could not update this favorite.');
        }

        clearOptimisticToggle(bathroomId);

        if (mutationResult.data.action === 'added') {
          addFavoritedId(authenticatedUser.id, bathroomId);
        } else {
          removeFavoritedId(authenticatedUser.id, bathroomId);
        }

        await queryClient.invalidateQueries({
          queryKey: favoritesKeys.all,
          refetchType: 'active',
        });

        showToast({
          title: mutationResult.data.action === 'added' ? 'Favorite saved' : 'Favorite removed',
          message:
            mutationResult.data.action === 'added'
              ? 'This bathroom is now saved to your account.'
              : 'This bathroom has been removed from your favorites.',
          variant: 'success',
        });

        return 'completed';
      } catch (error) {
        if (isTransientNetworkError(error) && intendedAction) {
          try {
            await offlineQueue.enqueue(
              intendedAction === 'added' ? 'favorite_add' : 'favorite_remove',
              {
                bathroom_id: bathroomId,
                intended_action: intendedAction,
                initiated_at: initiatedAt,
              },
              authenticatedUser.id
            );

            markOptimisticToggleQueued(bathroomId);
            showToast({
              title: 'Saved for sync',
              message: 'Your favorite change will sync automatically once you are back online.',
              variant: 'warning',
            });

            return 'queued_retry';
          } catch (queueError) {
            clearOptimisticToggle(bathroomId);
            showToast({
              title: 'Favorite update failed',
              message: getErrorMessage(queueError, 'We could not queue this favorite change.'),
              variant: 'error',
            });
            throw queueError;
          }
        }

        clearOptimisticToggle(bathroomId);
        await queryClient.invalidateQueries({
          queryKey: favoritesKeys.all,
          refetchType: 'active',
        });
        showToast({
          title: 'Favorite update failed',
          message: getErrorMessage(error, 'We could not update this favorite.'),
          variant: 'error',
        });
        throw error;
      }
    },
    [
      addFavoritedId,
      clearOptimisticToggle,
      isFavorited,
      isFavoriteResolved,
      markOptimisticToggleQueued,
      pathname,
      queryClient,
      removeFavoritedId,
      requireAuth,
      router,
      setOptimisticToggle,
      showToast,
      syncFavoritedIds,
    ]
  );

  const toggleFavorite = useCallback(
    async (item: BathroomListItem): Promise<MutationOutcome> => {
      return commitFavoriteChange(item.id);
    },
    [commitFavoriteChange]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const intent = peekReturnIntent();

    if (!intent || intent.type !== 'favorite_toggle' || intent.route !== pathname) {
      return;
    }

    const bathroomId =
      typeof intent.params.bathroom_id === 'string' ? intent.params.bathroom_id : null;

    if (!bathroomId) {
      clearReturnIntent();
      return;
    }

    if (replayedIntentIdsRef.current[intent.intent_id]) {
      return;
    }

    replayedIntentIdsRef.current[intent.intent_id] = true;

    void (async () => {
      try {
        const outcome = await commitFavoriteChange(bathroomId);

        if (outcome !== 'auth_required') {
          clearReturnIntent();
        }
      } catch {
        clearReturnIntent();
      } finally {
        delete replayedIntentIdsRef.current[intent.intent_id];
      }
    })();
  }, [clearReturnIntent, commitFavoriteChange, isAuthenticated, pathname, peekReturnIntent]);

  return {
    isFavorite: useCallback((bathroomId: string) => isFavorited(bathroomId), [isFavorited]),
    isFavoritePending: useCallback((bathroomId: string) => isPending(bathroomId), [isPending]),
    isHydrating: favoriteIdsQuery.isFetching,
    toggleFavorite,
  };
}
