import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSavedNeedProfile,
  deleteSavedNeedProfile,
  fetchSavedNeedProfiles,
  setDefaultSavedNeedProfile,
  updateSavedNeedProfile,
} from '@/api/restroom-intelligence';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  applyNeedProfilePresetToFilters,
  buildCustomNeedProfileName,
  extractNeedProfileFilters,
  getNeedProfilePresetDefinitions,
  hydrateNeedProfileFilters,
} from '@/lib/restroom-intelligence/need-profiles';
import { defaultFilters, useFilterStore } from '@/store/useFilterStore';
import type { NeedProfilePresetKey, SavedNeedProfile } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

const NEED_PROFILE_QUERY_KEY = (userId: string | null | undefined) =>
  ['need-profiles', userId ?? 'guest'] as const;

export function useNeedProfiles() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const filters = useFilterStore((state) => state.filters);
  const setFilters = useFilterStore((state) => state.setFilters);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const hydratedDefaultUserIdRef = useRef<string | null>(null);

  const profilesQuery = useQuery({
    queryKey: NEED_PROFILE_QUERY_KEY(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) {
        return [] as SavedNeedProfile[];
      }

      const result = await fetchSavedNeedProfiles(user.id);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
    staleTime: 60_000,
  });

  const defaultProfile = useMemo(
    () => profilesQuery.data?.find((profile) => profile.is_default) ?? null,
    [profilesQuery.data]
  );

  useEffect(() => {
    if (!user?.id) {
      hydratedDefaultUserIdRef.current = null;
      return;
    }

    if (
      !defaultProfile ||
      activeProfileId ||
      hydratedDefaultUserIdRef.current === user.id
    ) {
      return;
    }

    const hydratedFilters = hydrateNeedProfileFilters(defaultProfile.filters, defaultFilters);
    setFilters(hydratedFilters);
    setActiveProfileId(defaultProfile.id);
    hydratedDefaultUserIdRef.current = user.id;
  }, [activeProfileId, defaultProfile, setFilters, user?.id]);

  const refreshProfiles = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: NEED_PROFILE_QUERY_KEY(user.id),
    });
  }, [queryClient, user?.id]);

  const createMutation = useMutation({
    mutationFn: async (input: {
      name: string;
      presetKey: NeedProfilePresetKey;
      isDefault: boolean;
    }) => {
      if (!user?.id) {
        throw new Error('Sign in to save a need profile.');
      }

      const result = await createSavedNeedProfile({
        userId: user.id,
        name: input.name,
        presetKey: input.presetKey,
        filters: extractNeedProfileFilters(filters),
        isDefault: input.isDefault,
      });

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to save this need profile right now.');
      }

      return result.data;
    },
    onSuccess: async (profile) => {
      setActiveProfileId(profile.id);
      await refreshProfiles();
      showToast({
        title: 'Profile saved',
        message: `${profile.name} is ready to use.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Profile not saved',
        message: getErrorMessage(error, 'Unable to save this need profile right now.'),
        variant: 'error',
      });
    },
  });

  const overwriteMutation = useMutation({
    mutationFn: async (profile: SavedNeedProfile) => {
      if (!user?.id) {
        throw new Error('Sign in to update a need profile.');
      }

      const result = await updateSavedNeedProfile({
        profileId: profile.id,
        userId: user.id,
        filters: extractNeedProfileFilters(filters),
      });

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to update this need profile right now.');
      }

      return result.data;
    },
    onSuccess: async (profile) => {
      setActiveProfileId(profile.id);
      await refreshProfiles();
      showToast({
        title: 'Profile updated',
        message: `${profile.name} now matches your current filters.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Profile not updated',
        message: getErrorMessage(error, 'Unable to update this need profile right now.'),
        variant: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (profile: SavedNeedProfile) => {
      if (!user?.id) {
        throw new Error('Sign in to delete a need profile.');
      }

      const result = await deleteSavedNeedProfile({
        profileId: profile.id,
        userId: user.id,
      });

      if (result.error) {
        throw result.error;
      }

      return profile;
    },
    onSuccess: async (profile) => {
      if (activeProfileId === profile.id) {
        setActiveProfileId(null);
      }

      await refreshProfiles();
      showToast({
        title: 'Profile removed',
        message: `${profile.name} was removed.`,
        variant: 'info',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Profile not removed',
        message: getErrorMessage(error, 'Unable to remove this need profile right now.'),
        variant: 'error',
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (profile: SavedNeedProfile) => {
      if (!user?.id) {
        throw new Error('Sign in to set a default need profile.');
      }

      const result = await setDefaultSavedNeedProfile({
        profileId: profile.id,
        userId: user.id,
      });

      if (result.error) {
        throw result.error;
      }

      return profile;
    },
    onSuccess: async (profile) => {
      await refreshProfiles();
      showToast({
        title: 'Default profile set',
        message: `${profile.name} will auto-apply next time.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Default not updated',
        message: getErrorMessage(error, 'Unable to set that default profile right now.'),
        variant: 'error',
      });
    },
  });

  const applyPreset = useCallback(
    (presetKey: NeedProfilePresetKey) => {
      const nextFilters = applyNeedProfilePresetToFilters(defaultFilters, presetKey);
      setFilters(nextFilters);
      setActiveProfileId(null);
      hydratedDefaultUserIdRef.current = user?.id ?? null;
    },
    [setFilters, user?.id]
  );

  const applyProfile = useCallback(
    (profile: SavedNeedProfile) => {
      setFilters(hydrateNeedProfileFilters(profile.filters, defaultFilters));
      setActiveProfileId(profile.id);
      hydratedDefaultUserIdRef.current = user?.id ?? null;
    },
    [setFilters, user?.id]
  );

  const clearAppliedProfile = useCallback(() => {
    setActiveProfileId(null);
    hydratedDefaultUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const saveCurrentAsProfile = useCallback(
    async (presetKey: NeedProfilePresetKey = 'custom') => {
      await createMutation.mutateAsync({
        name: buildCustomNeedProfileName(),
        presetKey,
        isDefault: false,
      });
    },
    [createMutation]
  );

  return {
    profiles: profilesQuery.data ?? [],
    isLoadingProfiles: profilesQuery.isLoading,
    profilesError: profilesQuery.error
      ? getErrorMessage(profilesQuery.error, 'Unable to load need profiles right now.')
      : null,
    activeProfileId,
    defaultProfile,
    presets: getNeedProfilePresetDefinitions(),
    isSavingProfile: createMutation.isPending,
    isUpdatingProfile: overwriteMutation.isPending,
    isDeletingProfile: deleteMutation.isPending,
    isSettingDefaultProfile: setDefaultMutation.isPending,
    applyPreset,
    applyProfile,
    clearAppliedProfile,
    saveCurrentAsProfile,
    overwriteProfile: overwriteMutation.mutateAsync,
    deleteProfile: deleteMutation.mutateAsync,
    setDefaultProfile: setDefaultMutation.mutateAsync,
  };
}
