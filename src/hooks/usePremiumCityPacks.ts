import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPremiumCityPackBathrooms, fetchPremiumCityPackCatalog } from '@/api/premium';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { premiumCityPackStorage } from '@/lib/premium-city-packs';
import type { PremiumCityPackManifest } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

export const premiumCityPackQueryKeys = {
  catalog: ['premium', 'city-packs', 'catalog'] as const,
  downloaded: ['premium', 'city-packs', 'downloaded'] as const,
};

export function usePremiumCityPacks() {
  const queryClient = useQueryClient();
  const { isAuthenticated, profile } = useAuth();
  const { showToast } = useToast();
  const [pendingDownloadSlug, setPendingDownloadSlug] = useState<string | null>(null);
  const [pendingRemovalSlug, setPendingRemovalSlug] = useState<string | null>(null);
  const isPremiumUser = hasActivePremium(profile);

  const catalogQuery = useQuery({
    queryKey: premiumCityPackQueryKeys.catalog,
    enabled: isAuthenticated,
    queryFn: async () => {
      const result = await fetchPremiumCityPackCatalog();

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const downloadedPacksQuery = useQuery({
    queryKey: premiumCityPackQueryKeys.downloaded,
    enabled: isAuthenticated,
    queryFn: async () => premiumCityPackStorage.listDownloadedPacks(),
  });

  const downloadMutation = useMutation({
    mutationFn: async (pack: PremiumCityPackManifest) => {
      if (!isPremiumUser) {
        throw new Error('Premium is required to download city packs for offline use.');
      }

      setPendingDownloadSlug(pack.slug);
      const result = await fetchPremiumCityPackBathrooms(pack);

      if (result.error) {
        throw result.error;
      }

      await premiumCityPackStorage.savePack(pack, result.data);
      return pack;
    },
    onSuccess: async (pack) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: premiumCityPackQueryKeys.downloaded }),
        queryClient.invalidateQueries({ queryKey: ['bathrooms'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ]);

      showToast({
        title: 'City pack downloaded',
        message: `${pack.city}, ${pack.state} is now available for offline browsing and search.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Download failed',
        message: getErrorMessage(error, 'Unable to cache that city pack right now.'),
        variant: 'error',
      });
    },
    onSettled: () => {
      setPendingDownloadSlug(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (slug: string) => {
      setPendingRemovalSlug(slug);
      await premiumCityPackStorage.removePack(slug);
      return slug;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: premiumCityPackQueryKeys.downloaded }),
        queryClient.invalidateQueries({ queryKey: ['bathrooms'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ]);

      showToast({
        title: 'City pack removed',
        message: 'That offline city pack was removed from this device.',
        variant: 'info',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Removal failed',
        message: getErrorMessage(error, 'Unable to remove that city pack right now.'),
        variant: 'error',
      });
    },
    onSettled: () => {
      setPendingRemovalSlug(null);
    },
  });

  const downloadPack = useCallback(async (pack: PremiumCityPackManifest) => {
    await downloadMutation.mutateAsync(pack);
  }, [downloadMutation]);

  const removePack = useCallback(async (slug: string) => {
    await removeMutation.mutateAsync(slug);
  }, [removeMutation]);

  const downloadedPackLookup = new Set((downloadedPacksQuery.data ?? []).map((pack) => pack.slug));

  return {
    availablePacks: catalogQuery.data ?? [],
    downloadedPacks: downloadedPacksQuery.data ?? [],
    isCatalogLoading: catalogQuery.isLoading,
    isDownloadedPacksLoading: downloadedPacksQuery.isLoading,
    isDownloadingPack: (slug: string) => pendingDownloadSlug === slug && downloadMutation.isPending,
    isPackDownloaded: (slug: string) => downloadedPackLookup.has(slug),
    isRemovingPack: (slug: string) => pendingRemovalSlug === slug && removeMutation.isPending,
    isPremiumUser,
    packCatalogError: catalogQuery.error ? getErrorMessage(catalogQuery.error, 'Unable to load city packs.') : null,
    downloadPack,
    removePack,
  };
}
