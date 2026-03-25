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
import { BathroomListItem, Coordinates } from '@/types';
import { calculateDistanceMeters, mapBathroomRowToListItem } from '@/utils/bathroom';

export const EMERGENCY_FIND_POINTS_COST = 25;

type EmergencyPhase = 'idle' | 'locating' | 'searching' | 'navigating' | 'error';

interface EmergencyState {
  phase: EmergencyPhase;
  nearestBathroom: BathroomListItem | null;
}

const EMERGENCY_SEARCH_RADIUS_DELTA = 0.045; // ~5 km viewport

function findNearestBathroom(
  bathrooms: BathroomListItem[],
  origin: Coordinates
): BathroomListItem | null {
  if (bathrooms.length === 0) {
    return null;
  }

  let nearest = bathrooms[0];
  let nearestDistance = calculateDistanceMeters(origin, nearest.coordinates);

  for (let i = 1; i < bathrooms.length; i++) {
    const distance = calculateDistanceMeters(origin, bathrooms[i].coordinates);

    if (distance < nearestDistance) {
      nearest = bathrooms[i];
      nearestDistance = distance;
    }
  }

  return nearest;
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
  const [state, setState] = useState<EmergencyState>({
    phase: 'idle',
    nearestBathroom: null,
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
      setState({ phase: 'locating', nearestBathroom: null });
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
            setState({ phase: 'idle', nearestBathroom: null });
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
          setState({ phase: 'error', nearestBathroom: null });
          return;
        }
      }

      // Step 2: Find nearest bathroom
      setState({ phase: 'searching', nearestBathroom: null });

      const region = {
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude,
        latitudeDelta: EMERGENCY_SEARCH_RADIUS_DELTA,
        longitudeDelta: EMERGENCY_SEARCH_RADIUS_DELTA,
      };

      const noFilters = {
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

      const result = await fetchBathroomsNearRegion({ region, filters: noFilters });
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

      const nearest = findNearestBathroom(bathrooms, userCoordinates);

      if (!nearest) {
        showToast({
          title: 'No bathrooms found',
          message: 'We could not find any bathrooms near you. Try zooming out on the map.',
          variant: 'warning',
        });
        setState({ phase: 'idle', nearestBathroom: null });
        return;
      }

      // Step 3: Navigate
      setState({ phase: 'navigating', nearestBathroom: nearest });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);

      const distanceText = nearest.distance_meters
        ? nearest.distance_meters < 1000
          ? `${nearest.distance_meters}m away`
          : `${(nearest.distance_meters / 1609.34).toFixed(1)} mi away`
        : '';

      showToast({
        title: `Routing to ${nearest.place_name}`,
        message: distanceText || 'Opening navigation...',
        variant: 'success',
      });

      void trackAnalyticsEvent('emergency_mode_activated', {
        bathroom_id: nearest.id,
        distance_meters: nearest.distance_meters,
      });

      await launchNavigation(nearest);
      setState({ phase: 'idle', nearestBathroom: nearest });
    } catch (error) {
      console.error('Emergency mode error:', error);
      showToast({
        title: 'Emergency mode failed',
        message: 'Something went wrong. Please try again or use the map.',
        variant: 'error',
      });
      setState({ phase: 'error', nearestBathroom: null });
    } finally {
      isRunningRef.current = false;
    }
  }, [coordinates, permission_status, requestPermission, showToast]);

  return {
    ...state,
    isActive: state.phase !== 'idle' && state.phase !== 'error',
    emergencyFreeCredits,
    activate,
  };
}
