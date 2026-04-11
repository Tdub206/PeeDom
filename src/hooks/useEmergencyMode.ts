import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { spendPointsForEmergencyFind } from '@/api/gamification';
import { fetchBathroomsNearRegion } from '@/api/bathrooms';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/useToast';
import { trackAnalyticsEvent } from '@/lib/analytics';
import { consumeEmergencyFindCredit, getFirstInstallCredits } from '@/lib/first-install-credits';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { BathroomListItem, Coordinates } from '@/types';
import {
  calculateBathroomRecommendationScore,
  calculateDistanceMeters,
  mapBathroomRowToListItem,
  mergeAccessibilityFilters,
} from '@/utils/bathroom';

export const EMERGENCY_FIND_POINTS_COST = 25;

type EmergencyPhase = 'idle' | 'locating' | 'searching' | 'picking' | 'navigating' | 'error';

interface EmergencyState {
  phase: EmergencyPhase;
  nearestBathroom: BathroomListItem | null;
  /** Top candidates for the urgency picker (sorted by distance) */
  candidates: BathroomListItem[];
}

const EMERGENCY_SEARCH_RADIUS_DELTA = 0.045; // ~5 km viewport
const MAX_CANDIDATES = 3;

/**
 * Find top candidates sorted by distance, with an accessibility score boost
 * when accessibility mode is active. Accessible bathrooms within a similar
 * distance range are ranked higher.
 */
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
      recommendationScore: calculateBathroomRecommendationScore(bathroom, {
        scenario: boostAccessible ? 'accessible' : 'best_overall',
      }),
    }))
    .sort((a, b) => {
      if (!boostAccessible) {
        if (b.recommendationScore !== a.recommendationScore) {
          return b.recommendationScore - a.recommendationScore;
        }

        return a.distance - b.distance;
      }
      // When accessibility mode is on, prefer accessible bathrooms
      // that are within 50% additional distance of the nearest option.
      const aAccessible = (a.bathroom.accessibility_score ?? 0) > 30;
      const bAccessible = (b.bathroom.accessibility_score ?? 0) > 30;
      if (aAccessible !== bAccessible) {
        const closer = Math.min(a.distance, b.distance);
        const farther = Math.max(a.distance, b.distance);
        // Only boost if the accessible one isn't drastically farther
        if (farther <= closer * 1.5) {
          return aAccessible ? -1 : 1;
        }
      }
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      return a.distance - b.distance;
    })
    .slice(0, limit)
    .map((entry) => entry.bathroom);
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
  const { coordinates, permission_status, requestPermission } = useLocation();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const isAccessibilityMode = useAccessibilityStore((s) => s.isAccessibilityMode);
  const accessibilityPreferences = useAccessibilityStore((s) => s.preferences);
  const [state, setState] = useState<EmergencyState>({
    phase: 'idle',
    nearestBathroom: null,
    candidates: [],
  });
  const [emergencyFreeCredits, setEmergencyFreeCredits] = useState(0);
  const isRunningRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    getFirstInstallCredits().then((credits) => {
      if (isMounted) setEmergencyFreeCredits(credits.emergency_finds);
    }).catch(() => undefined);
    return () => { isMounted = false; };
  }, []);

  const activate = useCallback(async () => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);

    try {
      // Step 0: Check if user has a free credit or points to cover the emergency find
      const credits = await getFirstInstallCredits();
      const hasFreeCredit = credits.emergency_finds > 0;
      const pointsBalance = profile?.points_balance ?? 0;
      const hasEnoughPoints = pointsBalance >= EMERGENCY_FIND_POINTS_COST;

      if (!hasFreeCredit && !hasEnoughPoints) {
        showToast({
          title: 'Emergency find unavailable',
          message: `You need ${EMERGENCY_FIND_POINTS_COST} points to use emergency mode. Watch an ad on your profile to earn points.`,
          variant: 'warning',
        });
        setState({ phase: 'idle', nearestBathroom: null });
        isRunningRef.current = false;
        return;
      }

      if (hasFreeCredit) {
        await consumeEmergencyFindCredit();
        setEmergencyFreeCredits(0);
      } else {
        const spendResult = await spendPointsForEmergencyFind();
        if (spendResult.error || !spendResult.data) {
          showToast({
            title: 'Could not use emergency mode',
            message: 'Unable to deduct points right now. Please try again.',
            variant: 'error',
          });
          setState({ phase: 'idle', nearestBathroom: null });
          isRunningRef.current = false;
          return;
        }
      }

      // Step 1: Get location
      setState({ phase: 'locating', nearestBathroom: null, candidates: [] });
      let userCoordinates = coordinates;

      if (!userCoordinates) {
        if (permission_status !== 'granted') {
          const granted = await requestPermission();

          if (!granted) {
            showToast({
              title: 'Location required',
              message: 'Emergency mode needs your location to find the nearest bathroom.',
              variant: 'warning',
            });
            setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
            return;
          }
        }

        try {
          const freshLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          userCoordinates = {
            latitude: freshLocation.coords.latitude,
            longitude: freshLocation.coords.longitude,
          };
        } catch (_e) {
          showToast({
            title: 'Location unavailable',
            message: 'We could not determine your location. Please try again.',
            variant: 'error',
          });
          setState({ phase: 'error', nearestBathroom: null, candidates: [] });
          return;
        }
      }

      // Step 2: Find nearest bathrooms
      setState({ phase: 'searching', nearestBathroom: null, candidates: [] });

      const region = {
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude,
        latitudeDelta: EMERGENCY_SEARCH_RADIUS_DELTA,
        longitudeDelta: EMERGENCY_SEARCH_RADIUS_DELTA,
      };

      const baseFilters = {
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

      // Apply accessibility preferences when accessibility mode is active
      const emergencyFilters = mergeAccessibilityFilters(
        baseFilters,
        isAccessibilityMode,
        accessibilityPreferences,
      );

      const result = await fetchBathroomsNearRegion({ region, filters: emergencyFilters });
      let bathrooms: BathroomListItem[] = [];

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
        showToast({
          title: 'No bathrooms found',
          message: 'We could not find any bathrooms near you. Try zooming out on the map.',
          variant: 'warning',
        });
        setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
        return;
      }

      // Step 3: Show picker with top candidates
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setState({
        phase: 'picking',
        nearestBathroom: topCandidates[0],
        candidates: topCandidates,
      });
    } catch (error) {
      console.error('Emergency mode error:', error);
      showToast({
        title: 'Emergency mode failed',
        message: 'Something went wrong. Please try again or use the map.',
        variant: 'error',
      });
      setState({ phase: 'error', nearestBathroom: null, candidates: [] });
    } finally {
      isRunningRef.current = false;
    }
  }, [accessibilityPreferences, coordinates, isAccessibilityMode, permission_status, requestPermission, showToast]);

  const selectAndNavigate = useCallback(
    async (bathroom: BathroomListItem) => {
      setState((prev) => ({ ...prev, phase: 'navigating', nearestBathroom: bathroom }));

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
      } catch (_e) {
        // Navigation launch failed silently
      }

      setState((prev) => ({ ...prev, phase: 'idle' }));
    },
    [showToast],
  );

  const dismiss = useCallback(() => {
    setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
  }, []);

  return {
    ...state,
    isActive: state.phase !== 'idle' && state.phase !== 'error',
    emergencyFreeCredits,
    isSearching: state.phase === 'locating' || state.phase === 'searching',
    isPicking: state.phase === 'picking',
    activate,
    selectAndNavigate,
    dismiss,
  };
}
