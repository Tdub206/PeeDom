import { useCallback, useEffect, useMemo } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, Text, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CityBrowse, RecentSearches, SearchBar, SearchFilters, SearchResultsList } from '@/components/search';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useFavorites } from '@/hooks/useFavorites';
import { useAccessibilityPreferences } from '@/hooks/useAccessibility';
import { useGeocodeFallback, useGeocodeTypeahead } from '@/hooks/useGeocodeFallback';
import { useSearch, useSearchSuggestions } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { pushSafely } from '@/lib/navigation';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapStore } from '@/store/useMapStore';
import { useSearchStore } from '@/store/useSearchStore';
import { BathroomListItem } from '@/types';
import { mergeAccessibilityFilters } from '@/utils/bathroom';
import { formatSearchDistance } from '@/utils/search';

export default function SearchTab() {
  const router = useRouter();
  const filters = useFilterStore((state) => state.filters);
  const isAccessibilityMode = useAccessibilityStore((state) => state.isAccessibilityMode);
  const accessibilityPreferences = useAccessibilityStore((state) => state.preferences);
  const resolvedFilters = useMemo(
    () => mergeAccessibilityFilters(filters, isAccessibilityMode, accessibilityPreferences),
    [accessibilityPreferences, filters, isAccessibilityMode]
  );
  const activeQuery = useSearchStore((state) => state.activeQuery);
  const committedQuery = useSearchStore((state) => state.committedQuery);
  const phase = useSearchStore((state) => state.phase);
  const setActiveQuery = useSearchStore((state) => state.setActiveQuery);
  const commitQuery = useSearchStore((state) => state.commitQuery);
  const clearQuery = useSearchStore((state) => state.clearQuery);
  const setPhase = useSearchStore((state) => state.setPhase);
  const setActiveBathroomId = useMapStore((state) => state.setActiveBathroomId);
  const setRegion = useMapStore((state) => state.setRegion);
  const userLocation = useMapStore((state) => state.userLocation);
  const {
    addToHistory,
    clearHistory,
    error: historyError,
    history,
    isLoading: isLoadingHistory,
    removeFromHistory,
  } = useSearchHistory();
  const searchResults = useSearch({
    filters: resolvedFilters,
    origin: userLocation,
    onSearchResolved: async (query, resultCount) => {
      await addToHistory(query, resultCount);
    },
  });
  const suggestionsQuery = useSearchSuggestions(userLocation);
  const { geocoded } = useGeocodeFallback(committedQuery);
  const { geocoded: typeaheadLocation } = useGeocodeTypeahead(activeQuery);
  useAccessibilityPreferences();
  const bathrooms = searchResults.items;
  const suggestions = suggestionsQuery.data ?? [];
  const { isFavorite, isFavoritePending, toggleFavorite } = useFavorites(bathrooms);

  useEffect(() => {
    const trimmedActiveQuery = activeQuery.trim();
    const trimmedCommittedQuery = committedQuery.trim();
    const isTypingAhead = trimmedActiveQuery.length >= 2 && trimmedActiveQuery !== trimmedCommittedQuery;

    if (!trimmedActiveQuery && !trimmedCommittedQuery && !searchResults.isSearchReady) {
      setPhase('idle');
      return;
    }

    if (searchResults.error) {
      setPhase('error');
      return;
    }

    if (searchResults.isLoading && searchResults.isSearchReady && bathrooms.length === 0) {
      setPhase('searching');
      return;
    }

    if (isTypingAhead) {
      setPhase(suggestions.length > 0 ? 'suggesting' : 'typing');
      return;
    }

    if (bathrooms.length > 0) {
      setPhase('results');
      return;
    }

    if (searchResults.isSearchReady && !searchResults.isLoading) {
      setPhase('empty');
      return;
    }

    setPhase('idle');
  }, [
    activeQuery,
    bathrooms.length,
    committedQuery,
    searchResults.error,
    searchResults.isLoading,
    searchResults.isSearchReady,
    setPhase,
    suggestions.length,
  ]);

  const handleClearSearch = useCallback(() => {
    clearQuery();
  }, [clearQuery]);

  const handleSubmitSearch = useCallback(() => {
    const trimmedQuery = activeQuery.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    commitQuery(trimmedQuery);
    Keyboard.dismiss();
  }, [activeQuery, commitQuery]);

  const handleSelectBathroom = useCallback(
    (bathroom: BathroomListItem) => {
      Keyboard.dismiss();
      setRegion({
        latitude: bathroom.coordinates.latitude,
        longitude: bathroom.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setActiveBathroomId(bathroom.id);
      pushSafely(router, routes.tabs.map, routes.tabs.search);
    },
    [router, setActiveBathroomId, setRegion]
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
      setActiveQuery(query);
      commitQuery(query);
      Keyboard.dismiss();
    },
    [commitQuery, setActiveQuery]
  );

  const handleSelectCity = useCallback(
    (city: string, state: string) => {
      const nextQuery = `${city}, ${state}`;
      setActiveQuery(nextQuery);
      commitQuery(nextQuery);
      Keyboard.dismiss();
    },
    [commitQuery, setActiveQuery]
  );

  const handleSelectSuggestion = useCallback(
    (query: string) => {
      setActiveQuery(query);
      commitQuery(query);
      Keyboard.dismiss();
    },
    [commitQuery, setActiveQuery]
  );

  const handleJumpToLocation = useCallback(
    (coordinates: { latitude: number; longitude: number }) => {
      Keyboard.dismiss();
      setRegion({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      pushSafely(router, routes.tabs.map, routes.tabs.search);
    },
    [router, setRegion]
  );

  const handleJumpToGeocodedLocation = useCallback(() => {
    if (!geocoded) {
      return;
    }

    handleJumpToLocation(geocoded.coordinates);
  }, [geocoded, handleJumpToLocation]);

  const showIdleState = phase === 'idle';
  const isTypingPhase = phase === 'typing' || phase === 'suggesting';
  const showSuggestions = isTypingPhase && suggestions.length > 0;
  const showTypeaheadGeocode = isTypingPhase && suggestions.length === 0 && typeaheadLocation !== null;
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
              Search by name, address, or city, then jump straight back to the map with the selected bathroom centered.
            </Text>
          </View>

          <View className="mt-4">
            <SearchBar
              isLoading={searchResults.isLoading || searchResults.isFetching}
              onChangeText={setActiveQuery}
              onClear={handleClearSearch}
              onSubmitEditing={handleSubmitSearch}
              value={activeQuery}
            />
            <SearchFilters />
          </View>

          {showSuggestions ? (
            <ScrollView
              className="mt-4 flex-1"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Suggestions</Text>
                <View className="mt-4 gap-3">
                  {suggestions.map((suggestion) => (
                    <Pressable
                      accessibilityLabel={`Search suggestion ${suggestion.place_name}`}
                      accessibilityRole="button"
                      className="rounded-2xl bg-surface-base px-4 py-4"
                      key={suggestion.bathroom_id}
                      onPress={() => handleSelectSuggestion(suggestion.place_name)}
                    >
                      <Text className="text-base font-semibold text-ink-900">
                        {suggestion.place_name}
                        {suggestion.city ? `, ${suggestion.city}` : ''}
                        {suggestion.state ? `, ${suggestion.state}` : ''}
                      </Text>
                      {formatSearchDistance(suggestion.distance_meters) ? (
                        <Text className="mt-1 text-sm text-ink-600">
                          {formatSearchDistance(suggestion.distance_meters)}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>
          ) : null}

          {showTypeaheadGeocode ? (
            <View className="mt-4">
              <Pressable
                accessibilityLabel={`Search ${typeaheadLocation.name} on the map`}
                accessibilityRole="button"
                className="flex-row items-center gap-3 rounded-[28px] border border-brand-200 bg-brand-50 px-5 py-5"
                onPress={() => handleJumpToLocation(typeaheadLocation.coordinates)}
              >
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-600">
                  <Ionicons color="#fff" name="location-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-brand-700">
                    {typeaheadLocation.name}
                  </Text>
                  <Text className="mt-1 text-sm text-brand-600">
                    Tap to explore this area on the map
                  </Text>
                </View>
                <Ionicons color={colors.brand[600]} name="chevron-forward" size={20} />
              </Pressable>
            </View>
          ) : null}

          {!showSuggestions && !showTypeaheadGeocode && showIdleState ? (
            <ScrollView className="mt-4 flex-1" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View className="rounded-[28px] border border-surface-strong bg-surface-card px-5 py-6">
                <Text className="text-lg font-bold text-ink-900">Start with a place, address, or city.</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  Recent searches stay handy here, and city browse gives you a quick way to explore dense bathroom coverage.
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
          ) : null}

          {!showSuggestions && !showTypeaheadGeocode && !showIdleState ? (
            <>
              <SearchResultsList
                bathrooms={bathrooms}
                error={searchResults.error}
                hasNextPage={Boolean(searchResults.hasNextPage)}
                isFavorite={isFavorite}
                isFavoritePending={isFavoritePending}
                isFetchingNextPage={searchResults.isFetchingNextPage}
                isLoading={searchResults.isLoading || searchResults.isFetching}
                onEndReached={() => {
                  if (searchResults.hasNextPage && !searchResults.isFetchingNextPage) {
                    void searchResults.fetchNextPage();
                  }
                }}
                onSelect={handleSelectBathroom}
                onToggleFavorite={(bathroom) => {
                  void handleToggleFavorite(bathroom);
                }}
                query={committedQuery}
              />
              {bathrooms.length === 0 &&
                !searchResults.isLoading &&
                !searchResults.isFetching &&
                geocoded ? (
                <Pressable
                  accessibilityLabel={`View ${geocoded.name} on the map`}
                  accessibilityRole="button"
                  className="mt-4 flex-row items-center gap-3 rounded-[28px] border border-brand-200 bg-brand-50 px-5 py-5"
                  onPress={handleJumpToGeocodedLocation}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-600">
                    <Ionicons color="#fff" name="map-outline" size={20} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-brand-700">
                      Jump to {geocoded.name}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-brand-600">
                      No bathrooms listed yet — be the first to add one!
                    </Text>
                  </View>
                  <Ionicons color={colors.brand[600]} name="chevron-forward" size={20} />
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
