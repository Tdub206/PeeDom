import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { Coordinates, LocationPermissionState, LocationSnapshot } from '@/types';
import { useMapStore } from '@/store/useMapStore';

interface LocationContextValue extends LocationSnapshot {
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

function mapPermissionStatus(status: Location.PermissionStatus): LocationPermissionState {
  switch (status) {
    case Location.PermissionStatus.GRANTED:
      return 'granted';
    case Location.PermissionStatus.DENIED:
      return 'denied';
    default:
      return 'unknown';
  }
}

function toCoordinates(location: Location.LocationObject): Coordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const setUserLocation = useMapStore((state) => state.setUserLocation);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [coordinatesUpdatedAt, setCoordinatesUpdatedAt] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionState>('unknown');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const applyLocationUpdate = useCallback(
    (location: Location.LocationObject) => {
      const nextCoordinates = toCoordinates(location);
      const updatedAt =
        typeof location.timestamp === 'number' && Number.isFinite(location.timestamp)
          ? new Date(location.timestamp).toISOString()
          : new Date().toISOString();

      setCoordinates(nextCoordinates);
      setCoordinatesUpdatedAt(updatedAt);
      setUserLocation(nextCoordinates);
      setErrorMessage(null);
    },
    [setUserLocation]
  );

  const stopWatching = useCallback(() => {
    watcherRef.current?.remove();
    watcherRef.current = null;
  }, []);

  const startWatching = useCallback(async () => {
    try {
      stopWatching();

      const lastKnownLocation = await Location.getLastKnownPositionAsync();

      if (lastKnownLocation) {
        applyLocationUpdate(lastKnownLocation);
      }

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 50,
          timeInterval: 30000,
        },
        applyLocationUpdate
      );
    } catch (error) {
      console.error('Unable to watch device location:', error);
      setErrorMessage('We could not subscribe to your location. You can still browse bathrooms manually.');
    }
  }, [applyLocationUpdate, stopWatching]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsRequestingPermission(true);

    try {
      const permissionResponse = await Location.requestForegroundPermissionsAsync();
      const nextPermissionStatus = mapPermissionStatus(permissionResponse.status);

      setPermissionStatus(nextPermissionStatus);

      if (!permissionResponse.granted) {
        setErrorMessage('Location access is optional. Grant it when you want nearby bathrooms centered automatically.');
        return false;
      }

      await startWatching();
      return true;
    } catch (error) {
      console.error('Unable to request foreground location permission:', error);
      setPermissionStatus('blocked');
      setErrorMessage('Location permission could not be requested right now. Please try again.');
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }, [startWatching]);

  const refreshLocation = useCallback(async () => {
    setIsRefreshing(true);

    try {
      const currentPermissions = await Location.getForegroundPermissionsAsync();
      const nextPermissionStatus = mapPermissionStatus(currentPermissions.status);

      setPermissionStatus(nextPermissionStatus);

      if (!currentPermissions.granted) {
        setErrorMessage('Enable location access first to center nearby bathrooms.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      applyLocationUpdate(currentLocation);

      if (!watcherRef.current) {
        await startWatching();
      }
    } catch (error) {
      console.error('Unable to refresh the device location:', error);
      setErrorMessage('We could not refresh your location. Please try again in a moment.');
    } finally {
      setIsRefreshing(false);
    }
  }, [applyLocationUpdate, startWatching]);

  useEffect(() => {
    let isMounted = true;

    const hydratePermissionState = async () => {
      try {
        const permissionResponse = await Location.getForegroundPermissionsAsync();

        if (!isMounted) {
          return;
        }

        const nextPermissionStatus = mapPermissionStatus(permissionResponse.status);
        setPermissionStatus(nextPermissionStatus);

        if (permissionResponse.granted) {
          await startWatching();
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error('Unable to hydrate the location permission state:', error);
        setPermissionStatus('denied');
        setErrorMessage('We could not read your current location permission state.');
      }
    };

    void hydratePermissionState();

    return () => {
      isMounted = false;
      stopWatching();
    };
  }, [startWatching, stopWatching]);

  const value = useMemo<LocationContextValue>(
    () => ({
      coordinates,
      coordinates_updated_at: coordinatesUpdatedAt,
      permission_status: permissionStatus,
      error_message: errorMessage,
      is_requesting_permission: isRequestingPermission,
      is_refreshing: isRefreshing,
      requestPermission,
      refreshLocation,
    }),
    [
      coordinates,
      coordinatesUpdatedAt,
      errorMessage,
      isRefreshing,
      isRequestingPermission,
      permissionStatus,
      refreshLocation,
      requestPermission,
    ]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationContext(): LocationContextValue {
  const context = useContext(LocationContext);

  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider.');
  }

  return context;
}
