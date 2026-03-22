import { useCallback, useMemo } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import {
  FavoriteListItem,
  FavoritesEmptyState,
  FavoritesListHeader,
  FavoritesSortBar,
} from '@/components/favorites';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useFavoriteDirectory, useFavorites } from '@/hooks/useFavorites';
import { pushSafely } from '@/lib/navigation';
import { useFavoritesStore } from '@/store/useFavoritesStore';
import { useMapStore } from '@/store/useMapStore';
import { FavoriteItem, FavoritesSortOption } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

export default function FavoritesTab() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const setActiveBathroomId = useMapStore((state) => state.setActiveBathroomId);
  const setRegion = useMapStore((state) => state.setRegion);
  const userLocation = useMapStore((state) => state.userLocation);
  const isOptimisticallyRemoved = useFavoritesStore((state) => state.isOptimisticallyRemoved);
  const setSortBy = useFavoritesStore((state) => state.setSortBy);
  const favoritesDirectory = useFavoriteDirectory(userLocation);
  const favorites = useFavorites(favoritesDirectory.items);
  const visibleFavorites = useMemo(
    () =>
      favoritesDirectory.items.filter(
        (item) => !isOptimisticallyRemoved(item.bathroom_id)
      ),
    [favoritesDirectory.items, isOptimisticallyRemoved]
  );

  const handleSelectFavorite = useCallback(
    (favoriteItem: FavoriteItem) => {
      setRegion({
        latitude: favoriteItem.coordinates.latitude,
        longitude: favoriteItem.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setActiveBathroomId(favoriteItem.bathroom_id);
      pushSafely(router, routes.tabs.map, routes.tabs.favorites);
    },
    [router, setActiveBathroomId, setRegion]
  );

  const handleRemoveFavorite = useCallback(
    async (favoriteItem: FavoriteItem) => {
      try {
        await favorites.toggleFavorite(favoriteItem);
      } catch {
        // The hook already handles the failure toast.
      }
    },
    [favorites]
  );

  const confirmRemoval = useCallback(
    (favoriteItem: FavoriteItem) => {
      Alert.alert(
        'Remove favorite?',
        `Stop saving ${favoriteItem.place_name} in your favorites list?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              void handleRemoveFavorite(favoriteItem);
            },
          },
        ]
      );
    },
    [handleRemoveFavorite]
  );

  const handleSortChange = useCallback(
    (sortBy: FavoritesSortOption) => {
      setSortBy(sortBy);
    },
    [setSortBy]
  );

  if (isGuest) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
        <View className="flex-1 px-4 pb-4 pt-3">
          <View className="rounded-[30px] bg-ink-900 px-5 py-5">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">Favorites</Text>
            <Text className="mt-2 text-3xl font-black tracking-tight text-white">Save reliable stops.</Text>
            <Text className="mt-2 text-sm leading-6 text-white/80">
              Sign in to build a synced favorites list that follows you across Pee-Dom sessions.
            </Text>
          </View>

          <View className="mt-4">
            <FavoritesEmptyState
              isGuest
              onPrimaryAction={() => pushSafely(router, routes.auth.login, routes.tabs.favorites)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (favoritesDirectory.isLoading && !visibleFavorites.length) {
    return <LoadingScreen message="Loading the bathrooms you saved to your account." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-4 pb-4 pt-3">
        <View className="rounded-[30px] bg-brand-600 px-5 py-5">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/80">Favorites</Text>
          <Text className="mt-2 text-3xl font-black tracking-tight text-white">Your saved bathrooms.</Text>
          <Text className="mt-2 text-sm leading-6 text-white/85">
            Keep dependable access points close at hand, then jump back to the map with the bathroom already selected.
          </Text>
        </View>

        {favoritesDirectory.error ? (
          <View className="mt-4 rounded-[30px] border border-danger/20 bg-danger/10 px-5 py-6">
            <Text className="text-lg font-bold text-danger">Favorites unavailable</Text>
            <Text className="mt-2 text-sm leading-6 text-danger">
              {getErrorMessage(favoritesDirectory.error, 'We could not load your favorites right now.')}
            </Text>
            <Button
              className="mt-5"
              label="Try Again"
              onPress={() => {
                void favoritesDirectory.refetch();
              }}
              variant="secondary"
            />
          </View>
        ) : visibleFavorites.length === 0 ? (
          <View className="mt-4">
            <FavoritesEmptyState
              isGuest={false}
              onPrimaryAction={() => pushSafely(router, routes.tabs.search, routes.tabs.favorites)}
            />
          </View>
        ) : (
          <>
            <FavoritesSortBar hasLocation={Boolean(userLocation)} onSortChange={handleSortChange} />

            <FlatList
              contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 8 }}
              data={visibleFavorites}
              keyExtractor={(item) => item.bathroom_id}
              ListHeaderComponent={<FavoritesListHeader count={visibleFavorites.length} />}
              onEndReached={() => {
                if (favoritesDirectory.hasNextPage && !favoritesDirectory.isFetchingNextPage) {
                  void favoritesDirectory.fetchNextPage();
                }
              }}
              onEndReachedThreshold={0.3}
              refreshControl={
                <RefreshControl
                  onRefresh={() => {
                    void favoritesDirectory.refetch();
                  }}
                  refreshing={favoritesDirectory.isFetching && !favoritesDirectory.isFetchingNextPage}
                />
              }
              renderItem={({ item }) => (
                <FavoriteListItem
                  isPending={favorites.isFavoritePending(item.bathroom_id)}
                  item={item}
                  onPress={() => handleSelectFavorite(item)}
                  onRemove={() => confirmRemoval(item)}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
