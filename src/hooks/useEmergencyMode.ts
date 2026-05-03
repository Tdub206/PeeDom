import { useCallback, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { fetchBathroomsNearRegion } from '@/api/bathrooms';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/useToast';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { isEmergencyLocationFresh } from '@/lib/emergency-location';
import { hasActivePremium } from '@/lib/gamification';
import { premiumCityPackStorage } from '@/lib/premium-city-packs';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { BathroomFilters, BathroomListItem, Coordinates, RegionBounds } from '@/types';
import {
  calculateBathroomRecommendationScore,
  calculateDistanceMeters,
  getBathroomMapPinTone,
  mapBathroomRowToListItem,
  mergeAccessibilityFilters,
} from '@/utils/bathroom';
import { getErrorMessage } from '@/utils/errorMap';

type EmergencyPhase = 'idle' | 'unlocking' | 'locating' | 'searching' | 'picking' | 'navigating' | 'error';

interface EmergencyState {
  phase: EmergencyPhase;
  nearestBathroom: BathroomListItem | null;
  candidates: BathroomListItem[];
}

const EMERGENCY_SEARCH_RADIUS_DELTA = 0.045;
const MAX_CANDIDATES = 3;

function getEmergencyRescueTier(bathroom: BathroomListItem): number {
  switch (getBathroomMapPinTone(bathroom)) {
    case 'open_unlocked':
      return 0;
    case 'locked_with_code':
      return 1;
    case 'unknown_hours':
      return 2;
    case 'locked_without_code':
      return 3;
    default:
      return 4;
  }
}

function findTopCandidates(
  bathrooms: BathroomListItem[],
  origin: Coordinates,
  limit: number,
  boostAccessible: boolean = false,
): BathroomListItem[] {
  return bathrooms
    .map((bathroom) => ({
      bathroom,
      distance: calculateDistanceMeters(origin, bathroom.coordinates),
      rescueTier: getEmergencyRescueTier(bathroom),
      recommendationScore: calculateBathroomRecommendationScore(bathroom, {
        scenario: boostAccessible ? 'accessible' : 'best_overall',
      }),
    }))
    .sort((a, b) => {
      if (a.rescueTier !== b.rescueTier) {
        return a.rescueTier - b.rescueTier;
      }

      if (boostAccessible) {
        const aAccessible = (a.bathroom.accessibility_score ?? 0) > 30;
        const bAccessible = (b.bathroom.accessibility_score ?? 0) > 30;

        if (aAccessible !== bAccessible) {
          const closer = Math.min(a.distance, b.distance);
          const farther = Math.max(a.distance, b.distance);

          if (farther <= closer * 1.5) {
            return aAccessible ? -1 : 1;
          }
        }
      }

      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      return b.recommendationScore - a.recommendationScore;
    })
    .slice(0, limit)
    .map((entry) => entry.bathroom);
}

async function findOfflineEmergencyCandidates({
  filters,
  origin,
  region,
  boostAccessible,
}: {
  filters: BathroomFilters;
  origin: Coordinates;
  region: RegionBounds;
  boostAccessible: boolean;
}): Promise<BathroomListItem[]> {
  try {
    const offlineResult = await premiumCityPackStorage.findBathroomsInRegion(region, filters);

    if (!offlineResult?.items.length) {
      return [];
    }

    return findTopCandidates(offlineResult.items, origin, MAX_CANDIDATES, boostAccessible);
  } catch (error) {
    console.warn('Unable to load offline emergency bathrooms:', error);
    return [];
  }
}

async function launchNavigation(bathroom: BathroomListItem): Promise<boolean> {
  const { latitude, longitude } = bathroom.coordinates;
  const encodedLabel = encodeURIComponent(bathroom.place_name);

  if (Platform.OS === 'ios') {
    const appleMapsUrl = `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedLabel}&dirflg=w`;

    if (await Linking.canOpenURL(appleMapsUrl)) {
      await Linking.openURL(appleMapsUrl);
      return true;
    }
  } else {
    const googleNavigationUrl = `google.navigation:q=${latitude},${longitude}&mode=w`;

    if (await Linking.canOpenURL(googleNavigationUrl)) {
      await Linking.openURL(googleNavigationUrl);
      return true;
    }
  }

  const browserFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;
  await Linking.openURL(browserFallbackUrl);
  return true;
}

export function useEmergencyMode() {
  const { profile } = useAuth();
  const { coordinates, coordinates_updated_at, permission_status, requestPermission } = useLocation();
  const { showToast } = useToast();
  const isAccessibilityMode = useAccessibilityStore((state) => state.isAccessibilityMode);
  const accessibilityPreferences = useAccessibilityStore((state) => state.preferences);
  const isPremiumUser = hasActivePremium(profile);
  const [state, setState] = useState<EmergencyState>({
    phase: 'idle',
    nearestBathroom: null,
    candidates: [],
  });
  const [unlockIssue, setUnlockIssue] = useState<string | null>(null);
  const isRunningRef = useRef(false);

  const resolveEmergencyOrigin = useCallback(async (): Promise<Coordinates | null> => {
    setState({ phase: 'locating', nearestBathroom: null, candidates: [] });

    if (isEmergencyLocationFresh(coordinates, coordinates_updated_at)) {
      return coordinates;
    }

    if (permission_status !== 'granted') {
      const granted = await requestPermission();

      if (!granted) {
        showToast({
          title: 'Location required',
          message: 'Emergency mode needs your location to find the nearest bathroom.',
          variant: 'warning',
        });
        setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
        return null;
      }
    }

    try {
      const freshLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return {
        latitude: freshLocation.coords.latitude,
        longitude: freshLocation.coords.longitude,
      };
    } catch (_error) {
      if (coordinates) {
        showToast({
          title: 'Using last known location',
          message: 'We could not refresh your location, so Emergency Mode is using the last location saved on this device.',
          variant: 'warning',
        });
        return coordinates;
      }

      showToast({
        title: 'Location unavailable',
        message: 'We could not determine your location. Please try again.',
        variant: 'error',
      });
      setState({ phase: 'error', nearestBathroom: null, candidates: [] });
      return null;
    }
  }, [coordinates, coordinates_updated_at, permission_status, requestPermission, showToast]);

  const loadEmergencyCandidates = useCallback(async (userCoordinates: Coordinates): Promise<BathroomListItem[] | null> => {
    setState({ phase: 'searching', nearestBathroom: null, candidates: [] });

    const region = {
      latitude: userCoordinates.latitude,
      longitude: userCoordinates.longitude,
      latitudeDelta: EMERGENCY_SEARCH_RADIUS_DELTA,
      longitudeDelta: EMERGENCY_SEARCH_RADIUS_DELTA,
    };

    const baseFilters: BathroomFilters = {
      isAccessible: null,
      isLocked: null,
      isCustomerOnly: null,
      openNow: null,
      noCodeRequired: null,
      recentlyVerifiedOnly: null,
      hasChangingTable: null,
      isFamilyRestroom: null,
      requireGrabBars: null,
      requireAutomaticDoor: null,
      requireGenderNeutral: null,
      minDoorWidth: null,
      minStallWidth: null,
      prioritizeAccessible: null,
      hideNonAccessible: null,
      minCleanlinessRating: null,
    };

    const emergencyFilters = mergeAccessibilityFilters(
      baseFilters,
      isAccessibilityMode,
      accessibilityPreferences,
    );

    try {
      const result = await fetchBathroomsNearRegion({ region, filters: emergencyFilters });
      let bathrooms: BathroomListItem[] = [];

      if (result.error) {
        throw result.error;
      }

      if (result.data.length > 0) {
        const cachedAt = new Date().toISOString();
        bathrooms = result.data.map((row) =>
          mapBathroomRowToListItem(row, {
            cachedAt,
            stale: false,
            origin: userCoordinates,
          })
        );
      }

      const topCandidates = findTopCandidates(bathrooms, userCoordinates, MAX_CANDIDATES, isAccessibilityMode);

      if (topCandidates.length === 0) {
        const offlineCandidates = await findOfflineEmergencyCandidates({
          boostAccessible: isAccessibilityMode,
          filters: emergencyFilters,
          origin: userCoordinates,
          region,
        });

        if (offlineCandidates.length > 0) {
          showToast({
            title: 'Using offline bathrooms',
            message: 'No live results were available, so Emergency Mode is using downloaded city-pack data.',
            variant: 'warning',
          });
          return offlineCandidates;
        }

        showToast({
          title: 'No bathrooms found',
          message: 'We could not find any bathrooms near you. Try zooming out on the map.',
          variant: 'warning',
        });
        setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
        return [];
      }

      return topCandidates;
    } catch (error) {
      const offlineCandidates = await findOfflineEmergencyCandidates({
        boostAccessible: isAccessibilityMode,
        filters: emergencyFilters,
        origin: userCoordinates,
        region,
      });

      if (offlineCandidates.length > 0) {
        showToast({
          title: 'Using offline bathrooms',
          message: 'Network lookup failed, so Emergency Mode is using downloaded city-pack data.',
          variant: 'warning',
        });
        return offlineCandidates;
      }

      console.error('Emergency mode error:', error);
      showToast({
        title: 'Emergency mode failed',
        message: 'Something went wrong. Please try again or use the map.',
        variant: 'error',
      });
      setState({ phase: 'error', nearestBathroom: null, candidates: [] });
      return null;
    }
  }, [accessibilityPreferences, isAccessibilityMode, showToast]);

  const presentEmergencyCandidates = useCallback((candidates: BathroomListItem[]) => {
    if (!candidates.length) {
      setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setState({
      phase: 'picking',
      nearestBathroom: candidates[0] ?? null,
      candidates,
    });
  }, []);

  const activate = useCallback(async () => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    setUnlockIssue(null);

    try {
      const userCoordinates = await resolveEmergencyOrigin();

      if (!userCoordinates) {
        return;
      }

      const topCandidates = await loadEmergencyCandidates(userCoordinates);

      if (!topCandidates || topCandidates.length === 0) {
        return;
      }

      presentEmergencyCandidates(topCandidates);
    } catch (error) {
      const message = getErrorMessage(error, 'Emergency mode could not start right now.');
      setUnlockIssue(message);
      showToast({
        title: 'Emergency mode failed',
        message,
        variant: 'error',
      });
      setState({ phase: 'error', nearestBathroom: null, candidates: [] });
    } finally {
      isRunningRef.current = false;
    }
  }, [
    loadEmergencyCandidates,
    presentEmergencyCandidates,
    resolveEmergencyOrigin,
    showToast,
  ]);

  const selectAndNavigate = useCallback(
    async (bathroom: BathroomListItem) => {
      setState((previousState) => ({ ...previousState, phase: 'navigating', nearestBathroom: bathroom }));

      const distanceText = bathroom.distance_meters
        ? bathroom.distance_meters < 1000
          ? `${bathroom.distance_meters}m away`
          : `${(bathroom.distance_meters / 1609.34).toFixed(1)} mi away`
        : '';

      showToast({
        title: `Routing to ${bathroom.place_name}`,
        message: distanceText || 'Opening navigation...',
        variant: 'success',
      });

      void trackAnalyticsEvent('emergency_mode_activated', {
        bathroom_id: bathroom.id,
        distance_meters: bathroom.distance_meters,
      });

      try {
        await launchNavigation(bathroom);
      } catch (_error) {
        // Navigation launch failed silently.
      }

      setState((previousState) => ({ ...previousState, phase: 'idle' }));
    },
    [showToast],
  );

  const dismiss = useCallback(() => {
    setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
  }, []);

  return {
    ...state,
    isActive: state.phase !== 'idle' && state.phase !== 'error',
    isFreeLookupAvailable: !isPremiumUser,
    canUnlockWithPoints: false,
    pointsUnlockCost: 0,
    requiresAuthForUnlock: false,
    isPremiumUser,
    isSearching: state.phase === 'locating' || state.phase === 'searching',
    isUnlocking: state.phase === 'unlocking',
    isPicking: state.phase === 'picking',
    isAdUnlockAvailable: false,
    unlockIssue,
    activate,
    selectAndNavigate,
    dismiss,
  };
}
