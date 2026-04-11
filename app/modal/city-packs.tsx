import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { usePremiumCityPacks } from '@/hooks/usePremiumCityPacks';
import type { PremiumCityPackManifest } from '@/types';

function PackCard({
  pack,
  isDownloaded,
  isDownloading,
  isRemoving,
  isPremiumUser,
  onDownload,
  onRemove,
}: {
  pack: PremiumCityPackManifest;
  isDownloaded: boolean;
  isDownloading: boolean;
  isRemoving: boolean;
  isPremiumUser: boolean;
  onDownload: () => void;
  onRemove: () => void;
}) {
  return (
    <View className="rounded-[24px] border border-surface-strong bg-surface-card px-5 py-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className="text-base font-black text-ink-900">
            {pack.city}
          </Text>
          <Text className="mt-0.5 text-sm text-ink-500">
            {pack.state}, {pack.country_code}
          </Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-center gap-1">
            <Ionicons name="location" size={14} color={colors.brand[600]} />
            <Text className="text-sm font-bold text-brand-600">
              {pack.bathroom_count}
            </Text>
          </View>
          <Text className="text-[10px] text-ink-400">bathrooms</Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-4">
        {isDownloaded ? (
          <>
            <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-success/10 px-3 py-2">
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text className="text-xs font-bold text-success">Downloaded</Text>
            </View>
            <Pressable
              className="flex-row items-center gap-1 rounded-xl bg-danger/10 px-3 py-2"
              onPress={onRemove}
              disabled={isRemoving}
            >
              {isRemoving ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
              )}
              <Text className="text-xs font-bold text-danger">Remove</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            className="flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5"
            onPress={onDownload}
            disabled={isDownloading || !isPremiumUser}
            style={{ opacity: isPremiumUser ? 1 : 0.5 }}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={16} color="#fff" />
            )}
            <Text className="text-sm font-bold text-white">
              {isDownloading ? 'Downloading…' : isPremiumUser ? 'Download' : 'Premium Required'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function CityPacksScreen() {
  const {
    availablePacks,
    downloadedPacks,
    isCatalogLoading,
    isDownloadingPack,
    isPackDownloaded,
    isRemovingPack,
    isPremiumUser,
    packCatalogError,
    downloadPack,
    removePack,
  } = usePremiumCityPacks();

  const handleDownload = useCallback(
    (pack: PremiumCityPackManifest) => {
      void downloadPack(pack);
    },
    [downloadPack],
  );

  const handleRemove = useCallback(
    (slug: string) => {
      void removePack(slug);
    },
    [removePack],
  );

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['bottom']}>
      <View className="px-5 pt-4">
        <Text className="text-2xl font-black tracking-tight text-ink-900">
          Offline City Packs
        </Text>
        <Text className="mt-1 text-sm leading-5 text-ink-500">
          Download bathrooms for offline access. Search and browse even without internet.
        </Text>

        {!isPremiumUser ? (
          <View className="mt-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="star" size={14} color={colors.warning} />
              <Text className="text-xs font-bold text-warning">
                Premium required for offline city packs
              </Text>
            </View>
          </View>
        ) : null}

        {downloadedPacks.length > 0 ? (
          <View className="mt-4 flex-row items-center gap-2">
            <Ionicons name="cloud-done" size={14} color={colors.success} />
            <Text className="text-xs font-semibold text-ink-500">
              {downloadedPacks.length} pack{downloadedPacks.length !== 1 ? 's' : ''} saved offline
            </Text>
          </View>
        ) : null}
      </View>

      {isCatalogLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand[600]} />
          <Text className="mt-3 text-sm text-ink-500">Loading available packs…</Text>
        </View>
      ) : packCatalogError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="cloud-offline-outline" size={48} color={colors.danger} />
          <Text className="mt-3 text-center text-sm text-danger">{packCatalogError}</Text>
        </View>
      ) : (
        <FlatList
          data={availablePacks}
          keyExtractor={(item) => item.slug}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 100,
            gap: 12,
          }}
          renderItem={({ item }) => (
            <PackCard
              pack={item}
              isDownloaded={isPackDownloaded(item.slug)}
              isDownloading={isDownloadingPack(item.slug)}
              isRemoving={isRemovingPack(item.slug)}
              isPremiumUser={isPremiumUser}
              onDownload={() => handleDownload(item)}
              onRemove={() => handleRemove(item.slug)}
            />
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="map-outline" size={48} color={colors.ink[300]} />
              <Text className="mt-3 text-sm text-ink-500">
                No city packs available yet
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
