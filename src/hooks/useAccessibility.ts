import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserAccessibilityPreferences,
  saveUserAccessibilityPreferences,
  submitBathroomAccessibilityUpdate,
} from '@/api/accessibility';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import type {
  BathroomAccessibilityUpdateInput,
  BathroomAccessibilityUpdateResult,
  UpdateAccessibilityPreferencesInput,
  UserAccessibilityPreferences,
} from '@/types';
import { mapAccessibilityPreferencesToInput } from '@/utils/accessibility';

export const accessibilityQueryKeys = {
  all: ['accessibility'] as const,
  preferences: (userId: string) => ['accessibility', 'preferences', userId] as const,
};

export function useAccessibilityPreferences() {
  const { user } = useAuth();
  const hydrateFromServer = useAccessibilityStore((state) => state.hydrateFromServer);

  const query = useQuery<UserAccessibilityPreferences | null, Error>({
    queryKey: accessibilityQueryKeys.preferences(user?.id ?? ''),
    enabled: Boolean(user?.id),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const result = await fetchUserAccessibilityPreferences(user.id);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  useEffect(() => {
    if (user?.id && typeof query.data !== 'undefined') {
      hydrateFromServer(user.id, query.data ?? null);
    }
  }, [hydrateFromServer, query.data, user?.id]);

  return query;
}

export function useSaveAccessibilityPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const markSynced = useAccessibilityStore((state) => state.markSynced);

  return useMutation<UserAccessibilityPreferences | null, Error, UpdateAccessibilityPreferencesInput>({
    mutationFn: async (input) => {
      if (!user?.id) {
        throw new Error('You need to sign in before syncing accessibility preferences.');
      }

      const result = await saveUserAccessibilityPreferences(user.id, input);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    onSuccess: (data) => {
      if (!user?.id) {
        return;
      }

      queryClient.setQueryData(accessibilityQueryKeys.preferences(user.id), data);
      markSynced(user.id);
    },
  });
}

export function useSyncAccessibilityPreferences() {
  const { user } = useAuth();
  const savePreferencesMutation = useSaveAccessibilityPreferences();

  return async (): Promise<void> => {
    const accessibilityStore = useAccessibilityStore.getState();

    if (!user?.id || !accessibilityStore.hasPendingChanges) {
      return;
    }

    await savePreferencesMutation.mutateAsync(
      mapAccessibilityPreferencesToInput(
        accessibilityStore.preferences,
        accessibilityStore.isAccessibilityMode
      )
    );
  };
}

export function useSubmitBathroomAccessibilityUpdate() {
  const queryClient = useQueryClient();

  return useMutation<BathroomAccessibilityUpdateResult | null, Error, BathroomAccessibilityUpdateInput>({
    mutationFn: async (input) => {
      const result = await submitBathroomAccessibilityUpdate(input);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bathrooms'] });
      void queryClient.invalidateQueries({ queryKey: ['search'] });
    },
  });
}
