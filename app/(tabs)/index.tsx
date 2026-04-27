import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheet } from '@/components/BottomSheet';
import { EmergencyButton } from '@/components/EmergencyButton';
import { UrgencyPickerSheet } from '@/components/UrgencyPickerSheet';
import { LoadingScreen } from '@/components/LoadingScreen';
import { MapDetailSheetCard } from '@/components/MapDetailSheetCard';
import { MapFilterDrawer } from '@/components/MapFilterDrawer';
import { BathroomMapView } from '@/components/MapView';
import { NearbyBathroomsPanel } from '@/components/NearbyBathroomsPanel';
import { RealtimeStatusBadge } from '@/components/realtime';
import { recordBathroomNavigationOpen } from '@/api/bathrooms';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useEmergencyMode } from '@/hooks/useEmergencyMode';
import { useRealtimeBathrooms } from '@/hooks/useRealtimeBathrooms';
import { useBathrooms } from '@/hooks/useBathrooms';
import { useAccessibilityPreferences } from '@/hooks/useAccessibility';
import { useFavorites } from '@/hooks/useFavorites';
import { useLocation } from '@/hooks/useLocation';
import { useRecordVisit } from '@/hooks/useStallPassVisits';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { pushSafely } from '@/lib/navigation';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useFilterStore } from '@/store/useFilterStore';
import { useMapStore } from '@/store/useMapStore';
import { BathroomListItem } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';
import {
  getCanonicalBathroomId,
  hasActiveBathroomFilters,
  isBathroomVisibleOnMap,
  mergeAccessibilityFilters,
} from '@/utils/bathroom';
import { countActiveAccessibilityPreferences } from '@/utils/accessibility';

export default function MapTab() {
  const router = useRouter();
  const { showToast } = useToast();
  const { profile, requireAuth, user } = useAuth();
  const filters = useFilterStore((state) => state.filters);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const setMinCleanlinessRating = useFilterStore((state) => state.setMinCleanlinessRating);
  const toggleFilter = useFilterStore((state) => state.toggleFilter);
  const activeBathroomId = useMapStore((state) => state.activeBathroomId);
  const clearSearchTarget = useMapStore((state) => state.clearSearchTarget);
  const centerOnUser = useMapStore((state) => state.centerOnUser);
  const hasCenteredOnUser = useMapStore((state) => state.hasCenteredOnUser);
  const region = useMapStore((state) => state.region);
  const setActiveBathroomId = useMapStore((state) => state.setActiveBathroomId);
  const setRegion = useMapStore((state) => state.setRegion);
  const searchTarget = useMapStore((state) => state.searchTarget);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isOpeningDirections, setIsOpeningDirections] = useState(false);
  const isAccessibilityMode = useAccessibilityStore((state) => state.isAccessibilityMode);
  const accessibilityPreferences = useAccessibilityStore((state) => state.preferences);
  const resolvedFilters = useMemo(
    () => mergeAccessibilityFilters(filters, isAccessibilityMode, accessibilityPreferences),
    [accessibilityPreferences, filters, isAccessibilityMode]
  );
  const {
    coordinates,
    error_message,
    is_refreshing,
    permission_status,
    requestPermission,
    refreshLocation,
  } = useLocation();
  const bathroomsQuery = useBathrooms({
    region,
    filters: resolvedFilters,
  });
  useAccessibilityPreferences();
  const bathrooms = bathroomsQuery.data?.items ?? [];
  const isPremiumUser = hasActivePremium(profile);
  const visibleBathrooms = useMemo(
    () => bathrooms.filter((bathroom) => isBathroomVisibleOnMap(bathroom, isPremiumUser)),
    [bathrooms, isPremiumUser]
  );
  useRealtimeBathrooms({
    viewport: region,
    visibleBathrooms,
    enabled: visibleBathrooms.length > 0 || bathroomsQuery.isSuccess,
  });
  const activeBathroom = useMemo(
    () => visibleBathrooms.find((bathroom) => bathroom.id === activeBathroomId) ?? null,
    [activeBathroomId, visibleBathrooms]
  );
  const activeFilterCount = useMemo(() => {
    if (!hasActiveBathroomFilters(resolvedFilters)) {
      return 0;
    }

    let count = 0;

    Object.entries(resolvedFilters).forEach(([, value]) => {
      if (typeof value === 'boolean' && value) {
        count += 1;
      }

      if (typeof value === 'number') {
        count += 1;
      }
    });

    if (isAccessibilityMode) {
      count = Math.max(count, countActiveAccessibilityPreferences(accessibilityPreferences));
    }

    return count;
  }, [accessibilityPreferences, isAccessibilityMode, resolvedFilters]);
  const { isFavorite, isFavoritePending, toggleFavorite } = useFavorites(visibleBathrooms);
  const recordVisitMutation = useRecordVisit();
  const emergency = useEmergencyMode();

  useEffect(() => {
    if (coordinates && !hasCenteredOnUser) {
      centerOnUser();
    }
  }, [centerOnUser, coordinates, hasCenteredOnUser]);

  const handleLocateMe = useCallback(async () => {
    try {
      clearSearchTarget();

      if (permission_status !== 'granted') {
        const granted = await requestPermission();

        if (granted) {
          centerOnUser();
        }

        return;
      }

      await refreshLocation();
      centerOnUser();
    } catch (error) {
      showToast({
        title: 'Location unavailable',
        message: getErrorMessage(error, 'We could not center the map on your device right now.'),
        variant: 'error',
      });
    }
  }, [centerOnUser, clearSearchTarget, permission_status, refreshLocation, requestPermission, showToast]);

  const handleToggleFavorite = useCallback(
    async (bathroom: BathroomListItem) => {
      if (bathroom.can_favorite === false) {
        return;
      }

      try {
        const outcome = await toggleFavorite(bathroom);

        if (outcome === 'completed') {
          void Haptics.selectionAsync().catch(() => undefined);
        }
      } catch (error) {
        // The hook already shows a user-facing error toast.
      }
    },
    [toggleFavorite]
  );

  const handleMarkerPress = useCallback((bathroomId: string) => {
    setActiveBathroomId(bathroomId);
    void Haptics.selectionAsync().catch(() => undefined);
  }, [setActiveBathroomId]);

  const handleOpenFilterDrawer = useCallback(() => {
    setActiveBathroomId(null);
    setIsFilterDrawerOpen(true);
  }, [setActiveBathroomId]);

  const handleCloseFilterDrawer = useCallback(() => {
    setIsFilterDrawerOpen(false);
  }, []);

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const handleToggleFilter = useCallback(
    (
      filterKey:
        | 'isAccessible'
        | 'isLocked'
        | 'isCustomerOnly'
        | 'openNow'
        | 'noCodeRequired'
        | 'recentlyVerifiedOnly'
        | 'hasChangingTable'
        | 'isFamilyRestroom'
    ) => {
      toggleFilter(filterKey);
    },
    [toggleFilter]
  );

  const handleSetMinCleanlinessRating = useCallback(
    (rating: number | null) => {
      setMinCleanlinessRating(rating);
    },
    [setMinCleanlinessRating]
  );

  const handleNavigateToBathroom = useCallback(
    async (bathroom: BathroomListItem) => {
      const canonicalBathroomId = getCanonicalBathroomId(bathroom);
      const encodedLabel = encodeURIComponent(bathroom.place_name);
      const latitude = bathroom.coordinates.latitude;
      const longitude = bathroom.coordinates.longitude;
      const appleMapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}`;
      const googleNavigationUrl = `google.navigation:q=${latitude},${longitude}`;
      const browserFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

      setIsOpeningDirections(true);

      try {
        if (canonicalBathroomId) {
          void recordBathroomNavigationOpen(canonicalBathroomId);
        }

        if (user?.id && canonicalBathroomId) {
          recordVisitMutation.mutate({
            bathroomId: canonicalBathroomId,
            source: 'map_navigation',
          });
        }

        if (Platform.OS === 'ios') {
          const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);

          if (canOpenAppleMaps) {
            await Linking.openURL(appleMapsUrl);
            return;
          }
        } else {
          const canOpenGoogleNavigation = await Linking.canOpenURL(googleNavigationUrl);

          if (canOpenGoogleNavigation) {
            await Linking.openURL(googleNavigationUrl);
            return;
          }
        }

        await Linking.openURL(browserFallbackUrl);
      } catch (error) {
        showToast({
          title: 'Navigation unavailable',
          message: getErrorMessage(error, 'We could not open navigation right now.'),
          variant: 'error',
        });
      } finally {
        setIsOpeningDirections(false);
      }
    },
    [recordVisitMutation, showToast, user?.id]
  );

  const handleOpenBathroomDetail = useCallback(
    (bathroom: BathroomListItem) => {
      const targetRoute =
        bathroom.listing_kind === 'source_candidate' && bathroom.source_record_id
          ? routes.candidateDetail(bathroom.source_record_id)
          : bathroom.bathroom_id
            ? routes.bathroomDetail(bathroom.bathroom_id)
            : routes.tabs.map;

      pushSafely(router, targetRoute, routes.tabs.map);
    },
    [router]
  );

  const handleOpenReport = useCallback(
    (bathroom: BathroomListItem) => {
      const canonicalBathroomId = getCanonicalBathroomId(bathroom);

      if (!canonicalBathroomId || bathroom.can_report_live_status === false) {
        return;
      }

      pushSafely(router, routes.modal.reportBathroom(canonicalBathroomId), routes.tabs.map);
    },
    [router]
  );

  const handleOpenAddBathroom = useCallback(() => {
    const authenticatedUser = requireAuth({
      type: 'add_bathroom',
      route: '/modal/add-bathroom',
      params: {},
      replay_strategy: 'draft_resume',
    });

    if (!authenticatedUser) {
      pushSafely(router, routes.auth.login, routes.auth.login);
      return;
    }

    pushSafely(router, routes.modal.addBathroom, routes.tabs.map);
  }, [requireAuth, router]);

  const handleViewPremiumOptions = useCallback(() => {
    pushSafely(router, routes.tabs.profile, routes.tabs.map);
  }, [router]);

  if (bathroomsQuery.isLoading && !visibleBathrooms.length) {
    return <LoadingScreen message="Finding bathrooms around the current map region." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-4 pb-4 pt-3">
        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="search"
            className="flex-1 flex-row items-center gap-2 rounded-full bg-surface-card border border-surface-strong px-4 py-3"
            onPress={() => router.push(routes.tabs.search)}
          >
            <Ionicons color="#6b7280" name="search" size={18} />
            <Text className="text-sm text-ink-500">Search bathrooms or addresses...</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Add a bathroom"
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-brand-600"
            onPress={handleOpenAddBathroom}
          >
            <Ionicons color="#ffffff" name="add" size={22} />
          </Pressable>
          <View className="self-center">
            <RealtimeStatusBadge />
          </View>
        </View>

        {error_message ? (
          <View className="mt-4 rounded-3xl border border-warning/20 bg-warning/10 px-4 py-4">
            <Text className="text-sm font-semibold text-warning">Location note</Text>
            <Text className="mt-1 text-sm leading-5 text-warning">{error_message}</Text>
          </View>
        ) : null}

        {bathroomsQuery.error ? (
          <View className="mt-4 rounded-3xl border border-danger/20 bg-danger/10 px-4 py-4">
            <Text className="text-sm font-semibold text-danger">Map data unavailable</Text>
            <Text className="mt-1 text-sm leading-5 text-danger">
              {getErrorMessage(bathroomsQuery.error, 'We could not load nearby bathrooms right now.')}
            </Text>
          </View>
        ) : null}

        {bathroomsQuery.isFetching && bathrooms.length > 0 ? (
          <View className="mt-4 rounded-3xl border border-brand-200 bg-brand-50 px-4 py-4">
            <Text className="text-sm font-semibold text-brand-700">Refreshing bathrooms</Text>
            <Text className="mt-1 text-sm leading-5 text-brand-700">
              Updating the current map region without interrupting your existing pins.
            </Text>
          </View>
        ) : null}

        {searchTarget && visibleBathrooms.length === 0 ? (
          <View className="mt-4 rounded-3xl border border-brand-200 bg-brand-50 px-4 py-4">
            <Text className="text-sm font-semibold text-brand-700">Exploring {searchTarget.label}</Text>
            <Text className="mt-1 text-sm leading-5 text-brand-700">
              No bathrooms are listed here yet. You can still inspect the area on the map or add a new location.
            </Text>
          </View>
        ) : null}

        <NearbyBathroomsPanel
          filters={resolvedFilters}
          onNavigate={(bathroom) => {
            void handleNavigateToBathroom(bathroom);
          }}
          onOpenBathroomDetail={handleOpenBathroomDetail}
          onViewPremiumOptions={handleViewPremiumOptions}
        />

        <View className="mt-4 flex-1">
          <BathroomMapView
            activeFilterCount={activeFilterCount}
            bathrooms={visibleBathrooms}
            isRefreshingLocation={is_refreshing}
            onFilterPress={handleOpenFilterDrawer}
            onLocateMe={() => {
              void handleLocateMe();
            }}
            onMarkerPress={handleMarkerPress}
            onRegionChangeComplete={setRegion}
            region={region}
            selectedBathroomId={activeBathroomId}
            searchTarget={searchTarget}
            userLocation={coordinates}
          />

          <View className="absolute bottom-5 left-4" style={{ zIndex: 10 }}>
            <Pressable
              accessibilityLabel="Find bathrooms along your route"
              accessibilityRole="button"
              className="h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg"
              onPress={() =>
                pushSafely(router, routes.modal.routeBathrooms, routes.tabs.map)
              }
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
                elevation: 6,
              })}
            >
              <Ionicons color="#ffffff" name="git-branch-outline" size={24} />
            </Pressable>
            <Text className="mt-1 text-center text-[10px] font-bold uppercase tracking-wide text-brand-600">
              Route
            </Text>
          </View>

          <EmergencyButton
            isActive={emergency.isActive}
            isFreeLookupAvailable={emergency.isFreeLookupAvailable}
            canUnlockWithPoints={emergency.canUnlockWithPoints}
            pointsUnlockCost={emergency.pointsUnlockCost}
            requiresAuthForUnlock={emergency.requiresAuthForUnlock}
            isPremiumUser={emergency.isPremiumUser}
            isUnlocking={emergency.isUnlocking}
            isAdUnlockAvailable={emergency.isAdUnlockAvailable}
            onPress={() => {
              void emergency.activate();
            }}
          />

          <UrgencyPickerSheet
            candidates={emergency.candidates}
            isSearching={emergency.isSearching}
            onDismiss={emergency.dismiss}
            onSelect={(bathroom) => {
              void emergency.selectAndNavigate(bathroom);
            }}
          />

          <BottomSheet isOpen={Boolean(activeBathroom)} onClose={() => setActiveBathroomId(null)} snapPoints={['52%', '88%']}>
            <View className="flex-1 px-4 pb-6 pt-2">
              {activeBathroom ? (
                <MapDetailSheetCard
                  bathroom={activeBathroom}
                  isFavorited={isFavorite(activeBathroom.id)}
                  isFavoritePending={isFavoritePending(activeBathroom.id)}
                  isNavigating={isOpeningDirections}
                  onNavigate={() => {
                    void handleNavigateToBathroom(activeBathroom);
                  }}
                  onOpenDetail={() => handleOpenBathroomDetail(activeBathroom)}
                  onReport={() => handleOpenReport(activeBathroom)}
                  onToggleFavorite={() => {
                    void handleToggleFavorite(activeBathroom);
                  }}
                />
              ) : null}
            </View>
          </BottomSheet>
        </View>
      </View>

      <MapFilterDrawer
        filters={filters}
        isOpen={isFilterDrawerOpen}
        onClose={handleCloseFilterDrawer}
        onReset={handleResetFilters}
        onSetMinCleanlinessRating={handleSetMinCleanlinessRating}
        onToggleFilter={handleToggleFilter}
      />
    </SafeAreaView>
  );
}
