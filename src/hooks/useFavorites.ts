import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addFavorite, fetchFavoriteBathrooms, removeFavorite } from '@/api/favorites';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/constants/routes';
import { offlineQueue } from '@/lib/offline-queue';
import { pushSafely } from '@/lib/navigation';
import { useMapStore } from '@/store/useMapStore';
import {
  BathroomListItem,
  FavoriteItem,
  FavoritesList,
  MutationOutcome,
} from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import { isTransientNetworkError } from '@/utils/network';
import { useToast } from '@/hooks/useToast';

function getEmptyFavorites(userId: string): FavoritesList {
  return {
    user_id: userId,
    items: [],
    sync: {
      cached_at: new Date().toISOString(),
      stale: false,
    },
  };
}

function toFavoriteItem(item: BathroomListItem | FavoriteItem, favoritedAt: string): FavoriteItem {
  return 'bathroom_id' in item
    ? {
        ...item,
        favorited_at: favoritedAt,
      }
    : {
        ...item,
        bathroom_id: item.id,
        favorited_at: favoritedAt,
      };
}

function applyOptimisticFavoriteChange(
  currentFavorites: FavoritesList,
  bathroomId: string,
  shouldFavorite: boolean,
  optimisticItem?: BathroomListItem | FavoriteItem | null
): FavoritesList {
  const nextItems = shouldFavorite
    ? optimisticItem && !currentFavorites.items.some((favoriteItem) => favoriteItem.bathroom_id === bathroomId)
      ? [toFavoriteItem(optimisticItem, new Date().toISOString()), ...currentFavorites.items]
      : currentFavorites.items
    : currentFavorites.items.filter((favoriteItem) => favoriteItem.bathroom_id !== bathroomId);

  return {
    ...currentFavorites,
    items: nextItems,
    sync: {
      ...currentFavorites.sync,
      cached_at: new Date().toISOString(),
      stale: false,
    },
  };
}

export function useFavorites(replayCandidates: BathroomListItem[] = []) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const userLocation = useMapStore((state) => state.userLocation);
  const replayedIntentIdsRef = useRef<Record<string, boolean>>({});
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<Record<string, boolean>>({});
  const {
    clearReturnIntent,
    isAuthenticated,
    peekReturnIntent,
    requireAuth,
    user,
  } = useAuth();

  const favoriteQueryKey = useMemo(() => ['favorites', user?.id ?? 'guest'], [user?.id]);

  const favoritesQuery = useQuery<FavoritesList, Error>({
    queryKey: favoriteQueryKey,
    queryFn: async () => {
      if (!user) {
        return getEmptyFavorites('guest');
      }

      const favoritesResult = await fetchFavoriteBathrooms({
        userId: user.id,
        origin: userLocation,
      });

      if (favoritesResult.error) {
        throw favoritesResult.error;
      }

      const cachedAt = new Date().toISOString();

      return {
        user_id: user.id,
        items: favoritesResult.data.map((favoriteItem) => ({
          ...favoriteItem,
          sync: {
            ...favoriteItem.sync,
            cached_at: cachedAt,
          },
        })),
        sync: {
          cached_at: cachedAt,
          stale: false,
        },
      };
    },
    enabled: true,
  });

  const favoriteIdSet = useMemo(
    () => new Set((favoritesQuery.data?.items ?? []).map((favoriteItem) => favoriteItem.bathroom_id)),
    [favoritesQuery.data?.items]
  );

  const setFavoritePendingState = useCallback((bathroomId: string, isPending: boolean) => {
    setPendingFavoriteIds((currentPendingIds) => {
      if (!isPending) {
        const nextPendingIds = { ...currentPendingIds };
        delete nextPendingIds[bathroomId];
        return nextPendingIds;
      }

      return {
        ...currentPendingIds,
        [bathroomId]: true,
      };
    });
  }, []);

  const commitFavoriteChange = useCallback(
    async (
      bathroomId: string,
      optimisticItem?: BathroomListItem | FavoriteItem | null
    ): Promise<MutationOutcome> => {
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

      const shouldFavorite = !favoriteIdSet.has(bathroomId);
      const previousFavorites =
        queryClient.getQueryData<FavoritesList>(favoriteQueryKey) ?? getEmptyFavorites(authenticatedUser.id);

      setFavoritePendingState(bathroomId, true);
      queryClient.setQueryData<FavoritesList>(
        favoriteQueryKey,
        applyOptimisticFavoriteChange(previousFavorites, bathroomId, shouldFavorite, optimisticItem)
      );

      try {
        const mutationResult = shouldFavorite
          ? await addFavorite(authenticatedUser.id, bathroomId)
          : await removeFavorite(authenticatedUser.id, bathroomId);

        if (mutationResult.error) {
          throw mutationResult.error;
        }

        await queryClient.invalidateQueries({
          queryKey: favoriteQueryKey,
        });

        showToast({
          title: shouldFavorite ? 'Favorite saved' : 'Favorite removed',
          message: shouldFavorite
            ? 'This bathroom is now saved to your account.'
            : 'This bathroom has been removed from your favorites.',
          variant: 'success',
        });

        return 'completed';
      } catch (error) {
        if (isTransientNetworkError(error)) {
          try {
            await offlineQueue.enqueue(
              shouldFavorite ? 'favorite_add' : 'favorite_remove',
              {
                bathroom_id: bathroomId,
              },
              authenticatedUser.id
            );

            showToast({
              title: 'Saved for sync',
              message: 'Your favorite change will sync automatically once you are back online.',
              variant: 'warning',
            });

            return 'queued_retry';
          } catch (queueError) {
            queryClient.setQueryData(favoriteQueryKey, previousFavorites);
            showToast({
              title: 'Favorite update failed',
              message: getErrorMessage(queueError, 'We could not queue this favorite change.'),
              variant: 'error',
            });
            throw queueError;
          }
        }

        queryClient.setQueryData(favoriteQueryKey, previousFavorites);
        showToast({
          title: 'Favorite update failed',
          message: getErrorMessage(error, 'We could not update this favorite.'),
          variant: 'error',
        });
        throw error;
      } finally {
        setFavoritePendingState(bathroomId, false);
      }
    },
    [favoriteIdSet, favoriteQueryKey, pathname, queryClient, requireAuth, router, setFavoritePendingState, showToast]
  );

  const toggleFavorite = useCallback(
    async (item: BathroomListItem | FavoriteItem): Promise<MutationOutcome> => {
      return commitFavoriteChange(item.id, item);
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

    const optimisticItem =
      replayCandidates.find((candidate) => candidate.id === bathroomId) ??
      favoritesQuery.data?.items.find((favoriteItem) => favoriteItem.id === bathroomId) ??
      null;

    void (async () => {
      try {
        const outcome = await commitFavoriteChange(bathroomId, optimisticItem);

        if (outcome !== 'auth_required') {
          clearReturnIntent();
        }
      } catch (error) {
        clearReturnIntent();
      } finally {
        delete replayedIntentIdsRef.current[intent.intent_id];
      }
    })();
  }, [
    clearReturnIntent,
    commitFavoriteChange,
    favoritesQuery.data?.items,
    isAuthenticated,
    pathname,
    peekReturnIntent,
    replayCandidates,
  ]);

  return {
    favorites: favoritesQuery.data?.items ?? [],
    isFavorite: (bathroomId: string) => favoriteIdSet.has(bathroomId),
    isFavoritePending: (bathroomId: string) => Boolean(pendingFavoriteIds[bathroomId]),
    isLoading: favoritesQuery.isLoading,
    isFetching: favoritesQuery.isFetching,
    error: favoritesQuery.error,
    refetch: favoritesQuery.refetch,
    toggleFavorite,
  };
}
