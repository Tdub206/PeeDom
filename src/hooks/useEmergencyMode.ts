import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { consumeEmergencyLookupAccess } from '@/api/feature-access';
import { fetchBathroomsNearRegion } from '@/api/bathrooms';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/hooks/useLocation';
import { useToast } from '@/hooks/useToast';
import { getAdMobAvailability, showRewardedFeatureUnlockAd } from '@/lib/admob';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  canSpendPointsOnFeature,
  EMERGENCY_LOOKUP_UNLOCK_POINTS_COST,
  hasServerStarterFeatureAccess,
} from '@/lib/feature-access';
import { hasActivePremium } from '@/lib/gamification';
import { openDirectionsInMaps } from '@/lib/map-navigation';
import { pushSafely } from '@/lib/navigation';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { BathroomListItem, Coordinates } from '@/types';
import {
  calculateBathroomRecommendationScore,
  calculateDistanceMeters,
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

interface EmergencyUnlockChoiceInput {
  canUnlockWithPoints: boolean;
  isAdUnlockAvailable: boolean;
  pointsCost: number;
}

const EMERGENCY_SEARCH_RADIUS_DELTA = 0.045;
const MAX_CANDIDATES = 3;

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

      const aAccessible = (a.bathroom.accessibility_score ?? 0) > 30;
      const bAccessible = (b.bathroom.accessibility_score ?? 0) > 30;

      if (aAccessible !== bAccessible) {
        const closer = Math.min(a.distance, b.distance);
        const farther = Math.max(a.distance, b.distance);

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
  await openDirectionsInMaps(
    {
      placeName: bathroom.place_name,
      coordinates: bathroom.coordinates,
      address: bathroom.address,
    },
    {
      travelMode: 'walking',
    }
  );

  return true;
}

function requestEmergencyUnlockChoice({
  canUnlockWithPoints,
  isAdUnlockAvailable,
  pointsCost,
}: EmergencyUnlockChoiceInput): Promise<'points' | 'ad' | 'cancel'> {
  return new Promise((resolve) => {
    const buttons: Array<{
      text: string;
      style?: 'cancel';
      onPress?: () => void;
    }> = [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve('cancel'),
      },
    ];

    if (canUnlockWithPoints) {
      buttons.unshift({
        text: `Spend ${pointsCost} Points`,
        onPress: () => resolve('points'),
      });
    }

    if (isAdUnlockAvailable) {
      buttons.unshift({
        text: 'Watch Rewarded Video',
        onPress: () => resolve('ad'),
      });
    }

    Alert.alert(
      'Unlock emergency lookup',
      canUnlockWithPoints && isAdUnlockAvailable
        ? `Choose 1 unlock path for this emergency search: spend ${pointsCost} points or watch a rewarded video.`
        : canUnlockWithPoints
          ? `Spend ${pointsCost} points to unlock this emergency search right now.`
          : 'Watch a rewarded video to unlock this emergency search right now.',
      buttons,
      {
        cancelable: true,
        onDismiss: () => resolve('cancel'),
      }
    );
  });
}

export function useEmergencyMode() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { profile, refreshProfile, requireAuth, user } = useAuth();
  const { coordinates, permission_status, requestPermission } = useLocation();
  const { showToast } = useToast();
  const isAccessibilityMode = useAccessibilityStore((state) => state.isAccessibilityMode);
  const accessibilityPreferences = useAccessibilityStore((state) => state.preferences);
  const isPremiumUser = hasActivePremium(profile);
  const adMobAvailability = useMemo(() => getAdMobAvailability(), []);
  const [state, setState] = useState<EmergencyState>({
    phase: 'idle',
    nearestBathroom: null,
    candidates: [],
  });
  const [unlockIssue, setUnlockIssue] = useState<string | null>(null);
  const isRunningRef = useRef(false);
  const isFreeLookupAvailable = useMemo(
    () => !isPremiumUser && hasServerStarterFeatureAccess(profile, 'emergency_lookup'),
    [isPremiumUser, profile]
  );
  const canUnlockWithPoints = useMemo(
    () =>
      !isPremiumUser &&
      !isFreeLookupAvailable &&
      canSpendPointsOnFeature(profile, 'emergency_lookup'),
    [isFreeLookupAvailable, isPremiumUser, profile]
  );

  const syncAccountUnlockState = useCallback(async () => {
    await refreshProfile();
    await queryClient.invalidateQueries({ queryKey: ['gamification'] });
  }, [queryClient, refreshProfile]);

  const resolveEmergencyOrigin = useCallback(async (): Promise<Coordinates | null> => {
    setState({ phase: 'locating', nearestBathroom: null, candidates: [] });

    if (coordinates) {
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
      showToast({
        title: 'Location unavailable',
        message: 'We could not determine your location. Please try again.',
        variant: 'error',
      });
      setState({ phase: 'error', nearestBathroom: null, candidates: [] });
      return null;
    }
  }, [coordinates, permission_status, requestPermission, showToast]);

  const loadEmergencyCandidates = useCallback(async (userCoordinates: Coordinates): Promise<BathroomListItem[] | null> => {
    try {
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

      const emergencyFilters = mergeAccessibilityFilters(
        baseFilters,
        isAccessibilityMode,
        accessibilityPreferences,
      );

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

  const requireEmergencyAuth = useCallback(() => {
    const authenticatedUser = requireAuth({
      type: 'emergency_lookup',
      route: '/',
      params: {},
    });

    if (!authenticatedUser) {
      const message =
        'Sign in to use emergency lookup and keep your free lookup synced across devices and reinstalls.';
      setUnlockIssue(message);
      pushSafely(router, routes.auth.login, routes.auth.login);
      return null;
    }

    return authenticatedUser;
  }, [requireAuth, router]);

  const activate = useCallback(async () => {
    if (isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    setUnlockIssue(null);

    try {
      const authenticatedUser = isPremiumUser ? user : requireEmergencyAuth();

      if (!authenticatedUser) {
        return;
      }

      const userCoordinates = await resolveEmergencyOrigin();

      if (!userCoordinates) {
        return;
      }

      const topCandidates = await loadEmergencyCandidates(userCoordinates);

      if (!topCandidates || topCandidates.length === 0) {
        return;
      }

      if (isPremiumUser) {
        presentEmergencyCandidates(topCandidates);
        return;
      }

      if (isFreeLookupAvailable) {
        const accessResult = await consumeEmergencyLookupAccess('starter_free');

        if (accessResult.error || !accessResult.data) {
          const message = getErrorMessage(
            accessResult.error,
            'Your free emergency lookup is available, but it could not be unlocked.'
          );
          setUnlockIssue(message);
          showToast({
            title: 'Emergency unlock failed',
            message,
            variant: 'error',
          });
          setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
          return;
        }

        await syncAccountUnlockState();
        showToast({
          title: 'Emergency lookup unlocked',
          message:
            'Your account used its free emergency lookup. Future emergency searches can use 100 points, a rewarded video, or premium.',
          variant: 'success',
        });
        presentEmergencyCandidates(topCandidates);
        return;
      }

      if (!canUnlockWithPoints && !adMobAvailability.isAvailable) {
        const message =
          adMobAvailability.errorMessage ?? 'Emergency lookup is unavailable right now. Earn points or try again later.';
        setUnlockIssue(message);
        showToast({
          title: 'Emergency unlock unavailable',
          message,
          variant: 'warning',
        });
        setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
        return;
      }

      setState({ phase: 'unlocking', nearestBathroom: null, candidates: [] });

      const unlockChoice = await requestEmergencyUnlockChoice({
        canUnlockWithPoints,
        isAdUnlockAvailable: adMobAvailability.isAvailable,
        pointsCost: EMERGENCY_LOOKUP_UNLOCK_POINTS_COST,
      });

      if (unlockChoice === 'cancel') {
        setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
        return;
      }

      if (unlockChoice === 'points') {
        const accessResult = await consumeEmergencyLookupAccess('points_redeemed');

        if (accessResult.error || !accessResult.data) {
          const message = getErrorMessage(accessResult.error, 'Unable to spend points on emergency lookup right now.');
          setUnlockIssue(message);
          showToast({
            title: 'Emergency unlock failed',
            message,
            variant: 'error',
          });
          setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
          return;
        }

        await syncAccountUnlockState();
        showToast({
          title: 'Emergency lookup unlocked',
          message: `Spent ${accessResult.data.points_spent} points. ${accessResult.data.remaining_points} points remain on your account.`,
          variant: 'success',
        });
        presentEmergencyCandidates(topCandidates);
        return;
      }

      const rewardedResult = await showRewardedFeatureUnlockAd({
        context: 'emergency_lookup',
        userId: authenticatedUser.id,
      });

      if (rewardedResult.outcome !== 'earned') {
        const message =
          rewardedResult.message ?? 'The rewarded unlock did not complete, so emergency mode stayed locked.';
        setUnlockIssue(message);
        showToast({
          title: rewardedResult.outcome === 'unavailable' ? 'Emergency unlock unavailable' : 'Unlock cancelled',
          message,
          variant: rewardedResult.outcome === 'unavailable' ? 'warning' : 'info',
        });
        setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
        return;
      }

      const accessResult = await consumeEmergencyLookupAccess('rewarded_ad');

      if (accessResult.error || !accessResult.data) {
        const message = getErrorMessage(
          accessResult.error,
          'The reward completed, but emergency lookup could not be unlocked.'
        );
        setUnlockIssue(message);
        showToast({
          title: 'Emergency unlock failed',
          message,
          variant: 'error',
        });
        setState({ phase: 'idle', nearestBathroom: null, candidates: [] });
        return;
      }

      showToast({
        title: 'Emergency lookup unlocked',
        message: 'Emergency mode is ready after the rewarded video.',
        variant: 'success',
      });
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
    adMobAvailability.errorMessage,
    adMobAvailability.isAvailable,
    canUnlockWithPoints,
    isFreeLookupAvailable,
    isPremiumUser,
    loadEmergencyCandidates,
    presentEmergencyCandidates,
    requireEmergencyAuth,
    resolveEmergencyOrigin,
    showToast,
    syncAccountUnlockState,
    user,
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
    isFreeLookupAvailable,
    canUnlockWithPoints,
    pointsUnlockCost: EMERGENCY_LOOKUP_UNLOCK_POINTS_COST,
    requiresAuthForUnlock: !isPremiumUser && !user,
    isPremiumUser,
    isSearching: state.phase === 'locating' || state.phase === 'searching',
    isUnlocking: state.phase === 'unlocking',
    isPicking: state.phase === 'picking',
    isAdUnlockAvailable: adMobAvailability.isAvailable,
    unlockIssue,
    activate,
    selectAndNavigate,
    dismiss,
  };
}
