import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchBusinessBathroomSettings,
  fetchBusinessDashboard,
  fetchBusinessFeaturedPlacements,
  fetchBusinessHoursUpdateHistory,
  fetchBusinessPromotions,
  upsertBusinessBathroomSettings,
  upsertBusinessPromotion,
  updateBusinessBathroomHours,
} from '@/api/business';
import { useAuth } from '@/contexts/AuthContext';
import type {
  BusinessBathroomSettings,
  BusinessDashboardData,
  BusinessFeaturedPlacement,
  BusinessHoursUpdateAudit,
  BusinessHoursUpdateResult,
  BusinessPromotion,
  UpdateBusinessBathroomSettingsInput,
  UpdateBusinessHoursInput,
  UpsertBusinessPromotionInput,
} from '@/types';

export const businessQueryKeys = {
  all: ['business'] as const,
  dashboard: (userId: string) => [...businessQueryKeys.all, 'dashboard', userId] as const,
  featuredPlacements: (userId: string) => [...businessQueryKeys.all, 'featured-placements', userId] as const,
  hoursHistory: (bathroomId: string) => [...businessQueryKeys.all, 'hours-history', bathroomId] as const,
  settings: (bathroomId: string) => [...businessQueryKeys.all, 'settings', bathroomId] as const,
  promotions: (bathroomId: string) => [...businessQueryKeys.all, 'promotions', bathroomId] as const,
};

export function useBusinessDashboard(options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery<BusinessDashboardData, Error>({
    queryKey: businessQueryKeys.dashboard(user?.id ?? 'guest'),
    enabled: Boolean(user?.id) && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('You need to sign in to access the business dashboard.');
      }

      const result = await fetchBusinessDashboard(user.id);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to load your business analytics right now.');
      }

      return result.data;
    },
  });
}

export function useBusinessFeaturedPlacements(options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery<BusinessFeaturedPlacement[], Error>({
    queryKey: businessQueryKeys.featuredPlacements(user?.id ?? 'guest'),
    enabled: Boolean(user?.id) && (options?.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const result = await fetchBusinessFeaturedPlacements(user.id);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}

export function useBusinessHoursHistory(bathroomId: string | null) {
  return useQuery<BusinessHoursUpdateAudit[], Error>({
    queryKey: businessQueryKeys.hoursHistory(bathroomId ?? 'none'),
    enabled: Boolean(bathroomId),
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!bathroomId) {
        return [];
      }

      const result = await fetchBusinessHoursUpdateHistory(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}

export function useBusinessBathroomSettings(bathroomId: string | null) {
  return useQuery<BusinessBathroomSettings | null, Error>({
    queryKey: businessQueryKeys.settings(bathroomId ?? 'none'),
    enabled: Boolean(bathroomId),
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!bathroomId) {
        return null;
      }

      const result = await fetchBusinessBathroomSettings(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}

export function useBusinessPromotions(bathroomId: string | null) {
  return useQuery<BusinessPromotion[], Error>({
    queryKey: businessQueryKeys.promotions(bathroomId ?? 'none'),
    enabled: Boolean(bathroomId),
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!bathroomId) {
        return [];
      }

      const result = await fetchBusinessPromotions(bathroomId);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}

export function useUpdateBusinessBathroomHours() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<BusinessHoursUpdateResult, Error, UpdateBusinessHoursInput>({
    mutationFn: async (input) => {
      const result = await updateBusinessBathroomHours(input);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to update those business hours right now.');
      }

      return result.data;
    },
    onSuccess: async (result) => {
      if (user?.id) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: businessQueryKeys.dashboard(user.id),
          }),
          queryClient.invalidateQueries({
            queryKey: businessQueryKeys.featuredPlacements(user.id),
          }),
        ]);
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: businessQueryKeys.hoursHistory(result.bathroom_id),
        }),
        queryClient.invalidateQueries({
          queryKey: ['bathrooms'],
        }),
      ]);
    },
  });
}

export function useUpdateBusinessBathroomSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<BusinessBathroomSettings, Error, UpdateBusinessBathroomSettingsInput>({
    mutationFn: async (input) => {
      const result = await upsertBusinessBathroomSettings(input);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to save these StallPass settings right now.');
      }

      return result.data;
    },
    onSuccess: async (result) => {
      if (user?.id) {
        await queryClient.invalidateQueries({
          queryKey: businessQueryKeys.dashboard(user.id),
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: businessQueryKeys.settings(result.bathroom_id),
        }),
        queryClient.invalidateQueries({
          queryKey: ['bathrooms'],
        }),
      ]);
    },
  });
}

export function useUpsertBusinessPromotion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<BusinessPromotion, Error, UpsertBusinessPromotionInput>({
    mutationFn: async (input) => {
      const result = await upsertBusinessPromotion(input);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to save this StallPass offer right now.');
      }

      return result.data;
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: businessQueryKeys.promotions(result.bathroom_id),
        }),
        queryClient.invalidateQueries({
          queryKey: businessQueryKeys.settings(result.bathroom_id),
        }),
        queryClient.invalidateQueries({
          queryKey: ['bathrooms'],
        }),
      ]);

      if (user?.id) {
        await queryClient.invalidateQueries({
          queryKey: businessQueryKeys.dashboard(user.id),
        });
      }
    },
  });
}
