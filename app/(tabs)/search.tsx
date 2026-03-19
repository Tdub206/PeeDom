import { useCallback } from 'react';
import { Keyboard, KeyboardAvoidingView, ScrollView, Text, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CityBrowse, RecentSearches, SearchBar, SearchFilters, SearchResultsList } from '@/components/search';
import { routes } from '@/constants/routes';
import { useFavorites } from '@/hooks/useFavorites';
import { useSearch } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { pushSafely } from '@/lib/navigation';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapStore } from '@/store/useMapStore';
import { BathroomListItem } from '@/types';

export default function SearchTab() {
  const router = useRouter();
  const filters = useFilterStore((state) => state.filters);
  const searchQuery = useFilterStore((state) => state.searchQuery);
  const setSearchQuery = useFilterStore((state) => state.setSearchQuery);
  const setActiveBathroomId = useMapStore((state) => state.setActiveBathroomId);
  const setRegion = useMapStore((state) => state.setRegion);
  const userLocation = useMapStore((state) => state.userLocation);
  const searchResults = useSearch({
    query: searchQuery,
    filters,
    origin: userLocation,
  });
  const bathrooms = searchResults.data?.items ?? [];
  const {
    addToHistory,
    clearHistory,
    error: historyError,
    history,
    isLoading: isLoadingHistory,
    removeFromHistory,
  } = useSearchHistory();
  const { isFavorite, isFavoritePending, toggleFavorite } = useFavorites(bathrooms);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  const handleSubmitSearch = useCallback(() => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    void addToHistory(searchQuery);
  }, [addToHistory, searchQuery]);

  const handleSelectBathroom = useCallback(
    (bathroom: BathroomListItem) => {
      Keyboard.dismiss();

      if (searchResults.debouncedQuery.length >= 2) {
        void addToHistory(searchResults.debouncedQuery);
      }

      setRegion({
        latitude: bathroom.coordinates.latitude,
        longitude: bathroom.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setActiveBathroomId(bathroom.id);
      pushSafely(router, routes.tabs.map, routes.tabs.search);
    },
    [addToHistory, router, searchResults.debouncedQuery, setActiveBathroomId, setRegion]
  );

  const handleToggleFavorite = useCallback(
    async (bathroom: BathroomListItem) => {
      try {
        await toggleFavorite(bathroom);
      } catch (error) {
        // useFavorites already shows the user-facing failure state.
      }
    },
    [toggleFavorite]
  );

  const handleSelectHistory = useCallback(
    (query: string) => {
      setSearchQuery(query);
    },
    [setSearchQuery]
  );

  const handleSelectCity = useCallback(
    (city: string, state: string) => {
      setSearchQuery(`${city}, ${state}`);
    },
    [setSearchQuery]
  );

  const showIdleState = !searchResults.isSearchReady;

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <View className="flex-1 px-4 pb-4 pt-3">
          <View className="rounded-[30px] bg-ink-900 px-5 py-5">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">Search</Text>
            <Text className="mt-2 text-3xl font-black tracking-tight text-white">Find the right stop.</Text>
            <Text className="mt-2 text-sm leading-6 text-white/80">
              Search by name, address, or postal code, then jump straight back to the map with the selected bathroom centered.
            </Text>
          </View>

          <View className="mt-4">
            <SearchBar
              isLoading={searchResults.isFetching}
              onChangeText={setSearchQuery}
              onClear={handleClearSearch}
              onSubmitEditing={handleSubmitSearch}
              value={searchQuery}
            />
            <SearchFilters />
          </View>

          {showIdleState ? (
            <ScrollView className="mt-4 flex-1" showsVerticalScrollIndicator={false}>
              <View className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-6">
                <Text className="text-lg font-bold text-ink-900">Start with a place, address, or city.</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  Recent searches stay handy here, and city browse gives you a quick way to explore dense bathroom coverage when you do not have a query yet.
                </Text>
              </View>

              {historyError ? (
                <View className="mt-4 rounded-[28px] border border-warning/20 bg-warning/10 px-5 py-5">
                  <Text className="text-sm font-semibold text-warning">Recent searches unavailable</Text>
                  <Text className="mt-2 text-sm leading-6 text-warning">{historyError.message}</Text>
                </View>
              ) : null}

              {!isLoadingHistory ? (
                <RecentSearches
                  history={history}
                  onClear={() => {
                    void clearHistory();
                  }}
                  onRemove={(query) => {
                    void removeFromHistory(query);
                  }}
                  onSelect={handleSelectHistory}
                />
              ) : null}

              <CityBrowse onSelect={handleSelectCity} />
            </ScrollView>
          ) : (
            <SearchResultsList
              bathrooms={bathrooms}
              error={searchResults.error}
              isFavorite={isFavorite}
              isFavoritePending={isFavoritePending}
              isLoading={searchResults.isFetching}
              onSelect={handleSelectBathroom}
              onToggleFavorite={(bathroom) => {
                void handleToggleFavorite(bathroom);
              }}
              query={searchResults.debouncedQuery}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
