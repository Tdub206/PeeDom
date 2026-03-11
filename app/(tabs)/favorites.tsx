import { useCallback } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BathroomCard } from '@/components/BathroomCard';
import { Button } from '@/components/Button';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { pushSafely } from '@/lib/navigation';
import { FavoriteItem } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

const FAVORITE_ITEM_HEIGHT = 250;

export default function FavoritesTab() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const favorites = useFavorites();

  const handleToggleFavorite = useCallback(
    async (favoriteItem: FavoriteItem) => {
      try {
        await favorites.toggleFavorite(favoriteItem);
      } catch (error) {
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
              void handleToggleFavorite(favoriteItem);
            },
          },
        ]
      );
    },
    [handleToggleFavorite]
  );

  const renderRightActions = useCallback(
    (favoriteItem: FavoriteItem) => {
      return (
        <View className="ml-3 w-[112px] justify-center">
          <Pressable
            accessibilityRole="button"
            className="flex-1 items-center justify-center rounded-[28px] bg-danger px-4"
            onPress={() => confirmRemoval(favoriteItem)}
          >
            <Text className="text-sm font-semibold text-white">Remove</Text>
          </Pressable>
        </View>
      );
    },
    [confirmRemoval]
  );

  if (isGuest) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
        <View className="flex-1 px-4 py-4">
          <View className="rounded-[30px] bg-ink-900 px-5 py-5">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">Favorites</Text>
            <Text className="mt-2 text-3xl font-black tracking-tight text-white">Save reliable stops.</Text>
            <Text className="mt-2 text-sm leading-6 text-white/80">
              Sign in to build a synced favorites list that follows you across Pee-Dom sessions.
            </Text>
          </View>

          <View className="mt-4 rounded-[30px] border border-surface-strong bg-surface-card px-5 py-6">
            <Text className="text-lg font-bold text-ink-900">Your list is empty for now.</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              Guest mode lets you browse bathrooms, but favorites are only saved for signed-in accounts.
            </Text>
            <Button
              className="mt-5"
              label="Sign In To Save Favorites"
              onPress={() => pushSafely(router, routes.auth.login, routes.auth.login)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (favorites.isLoading && !favorites.favorites.length) {
    return <LoadingScreen message="Loading the bathrooms you saved to your account." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-4 pb-4 pt-3">
        <View className="rounded-[30px] bg-brand-600 px-5 py-5">
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/80">Favorites</Text>
          <Text className="mt-2 text-3xl font-black tracking-tight text-white">Your saved bathrooms.</Text>
          <Text className="mt-2 text-sm leading-6 text-white/85">
            Keep dependable access points close at hand, even when you need to move quickly.
          </Text>
        </View>

        {favorites.error ? (
          <View className="mt-4 rounded-[30px] border border-danger/20 bg-danger/10 px-5 py-6">
            <Text className="text-lg font-bold text-danger">Favorites unavailable</Text>
            <Text className="mt-2 text-sm leading-6 text-danger">
              {getErrorMessage(favorites.error, 'We could not load your favorites right now.')}
            </Text>
            <Button
              className="mt-5"
              label="Try Again"
              onPress={() => {
                void favorites.refetch();
              }}
              variant="secondary"
            />
          </View>
        ) : favorites.favorites.length === 0 ? (
          <View className="mt-4 rounded-[30px] border border-surface-strong bg-surface-card px-5 py-6">
            <Text className="text-lg font-bold text-ink-900">No favorites saved yet.</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              Add bathrooms from the map or search tab to keep them pinned here for quick access later.
            </Text>
            <Button className="mt-5" label="Browse Search" onPress={() => router.push(routes.tabs.search)} />
          </View>
        ) : (
          <FlatList
            contentContainerStyle={{ gap: 16, paddingTop: 16, paddingBottom: 8 }}
            data={favorites.favorites}
            getItemLayout={(_, index) => ({
              index,
              length: FAVORITE_ITEM_HEIGHT,
              offset: FAVORITE_ITEM_HEIGHT * index,
            })}
            keyExtractor={(item) => item.bathroom_id}
            renderItem={({ item }) => (
              <Swipeable overshootRight={false} renderRightActions={() => renderRightActions(item)}>
                <BathroomCard
                  isFavorited={favorites.isFavorite(item.bathroom_id)}
                  isFavoritePending={favorites.isFavoritePending(item.bathroom_id)}
                  item={item}
                  onPress={() => router.push(routes.bathroomDetail(item.bathroom_id))}
                  onToggleFavorite={() => {
                    void handleToggleFavorite(item);
                  }}
                />
              </Swipeable>
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
