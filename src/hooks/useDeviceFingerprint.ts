import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import type { Json } from '@/types/database';
import { registerCurrentDeviceFingerprint } from '@/api/trust';
import { useAuth } from '@/contexts/AuthContext';
import { createSignalIdentifier } from '@/lib/stallpass-signals';

const DEVICE_INSTALL_FINGERPRINT_KEY = 'stallpass_device_install_fingerprint';

async function getOrCreateInstallFingerprint(): Promise<string> {
  const existingFingerprint = await SecureStore.getItemAsync(DEVICE_INSTALL_FINGERPRINT_KEY);

  if (existingFingerprint) {
    return existingFingerprint;
  }

  const nextFingerprint = createSignalIdentifier('device');
  await SecureStore.setItemAsync(DEVICE_INSTALL_FINGERPRINT_KEY, nextFingerprint);
  return nextFingerprint;
}

function getDeviceMetadata(): Record<string, Json> {
  const resolvedIntl = Intl.DateTimeFormat().resolvedOptions();

  return {
    platform: Platform.OS,
    brand: Device.brand ?? null,
    model_name: Device.modelName ?? null,
    os_name: Device.osName ?? null,
    os_version: Device.osVersion ?? null,
    app_version: Constants.expoConfig?.version ?? null,
    locale: resolvedIntl.locale ?? null,
    timezone: resolvedIntl.timeZone ?? null,
    is_device: Device.isDevice,
  };
}

interface UseDeviceFingerprintOptions {
  enabled?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export function useDeviceFingerprint(options?: UseDeviceFingerprintOptions) {
  const { isAuthenticated, user } = useAuth();
  const queryEnabled = (options?.enabled ?? true) && isAuthenticated && Boolean(user?.id);
  const metadata = useMemo(() => getDeviceMetadata(), []);

  return useQuery({
    queryKey: ['device-fingerprint', user?.id ?? null, options?.latitude ?? null, options?.longitude ?? null],
    enabled: queryEnabled,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const installFingerprint = await getOrCreateInstallFingerprint();
      const result = await registerCurrentDeviceFingerprint({
        install_fingerprint: installFingerprint,
        device_metadata: metadata,
        latitude: options?.latitude ?? null,
        longitude: options?.longitude ?? null,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });
}
