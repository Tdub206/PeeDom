import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { addFavorite, removeFavorite } from '@/api/favorites';
import { useAuth } from '@/contexts/AuthContext';
import { offlineQueue } from '@/lib/offline-queue';
import { FavoriteMutationPayload } from '@/types';
import { useToast } from '@/hooks/useToast';

function isFavoriteMutationPayload(
  payload: Record<string, unknown>
): payload is Record<string, unknown> & FavoriteMutationPayload {
  return typeof payload.bathroom_id === 'string' && payload.bathroom_id.length > 0;
}

export function useOfflineSync() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isConnectedRef = useRef<boolean | null>(null);

  const processQueue = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    const networkState = await NetInfo.fetch();

    if (!networkState.isConnected) {
      return;
    }

    const result = await offlineQueue.process(async (mutation) => {
      if (mutation.user_id !== user.id || !isFavoriteMutationPayload(mutation.payload)) {
        return false;
      }

      switch (mutation.type) {
        case 'favorite_add': {
          const addResult = await addFavorite(user.id, mutation.payload.bathroom_id);
          return !addResult.error;
        }
        case 'favorite_remove': {
          const removeResult = await removeFavorite(user.id, mutation.payload.bathroom_id);
          return !removeResult.error;
        }
        default:
          return true;
      }
    });

    if (result.processed_count > 0) {
      await queryClient.invalidateQueries({
        queryKey: ['favorites', user.id],
      });

      showToast({
        title: 'Favorites synced',
        message: 'Queued favorite changes are now synced with your account.',
        variant: 'success',
      });
    }

    if (result.dropped_count > 0) {
      showToast({
        title: 'Some changes were dropped',
        message: 'A few queued favorite changes could not be synced. Please retry them manually.',
        variant: 'warning',
      });
    }
  }, [queryClient, showToast, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void offlineQueue.initialize(user.id);
  }, [user?.id]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state.isConnected);

      if (isConnectedRef.current === false && isConnected) {
        void processQueue();
      }

      isConnectedRef.current = isConnected;
    });

    return unsubscribe;
  }, [processQueue]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void processQueue();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [processQueue]);
}
