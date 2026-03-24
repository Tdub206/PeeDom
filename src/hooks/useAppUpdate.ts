import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { getSupabaseClient } from '@/lib/supabase';
import { isVersionBelowMinimum, isUpdateAvailable } from '@/utils/version';
import { Sentry } from '@/lib/sentry';

interface VersionConfig {
  min_supported_version: string;
  latest_version: string;
  force_update: boolean;
  update_message: string | null;
  force_update_message: string | null;
  store_url_ios: string | null;
  store_url_android: string | null;
}

export interface AppUpdateState {
  /** True while the initial check is in progress */
  checking: boolean;
  /** True when the app version is below min_supported_version or force_update is on */
  forceUpdateRequired: boolean;
  /** True when a newer version exists but isn't forced */
  softUpdateAvailable: boolean;
  /** Message to display for the force update screen */
  message: string | null;
  /** Platform-appropriate store URL */
  storeUrl: string | null;
  /** Trigger an OTA update via expo-updates */
  applyOtaUpdate: () => Promise<void>;
  /** Whether an OTA update is currently downloading/applying */
  isApplyingUpdate: boolean;
}

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export function useAppUpdate(): AppUpdateState {
  const [checking, setChecking] = useState(true);
  const [forceUpdateRequired, setForceUpdateRequired] = useState(false);
  const [softUpdateAvailable, setSoftUpdateAvailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        const { data, error } = await getSupabaseClient().rpc(
          'get_app_version_config' as never,
          { p_platform: platform } as never,
        );

        if (error || !data) {
          // Fail-open: don't block the user if the check fails
          return;
        }

        const config = data as unknown as VersionConfig;
        if (cancelled) return;

        const belowMin = isVersionBelowMinimum(APP_VERSION, config.min_supported_version);
        const needsForce = belowMin || config.force_update;
        const hasUpdate = isUpdateAvailable(APP_VERSION, config.latest_version);

        const url =
          Platform.OS === 'ios' ? config.store_url_ios : config.store_url_android;

        if (needsForce) {
          setForceUpdateRequired(true);
          setMessage(
            config.force_update_message ??
              'This version of StallPass is no longer supported. Please update to continue.',
          );
          setStoreUrl(url);
        } else if (hasUpdate) {
          setSoftUpdateAvailable(true);
          setMessage(
            config.update_message ??
              'A new version of StallPass is available. Please update for the best experience.',
          );
          setStoreUrl(url);
        }
      } catch (err) {
        Sentry.captureException(err);
        // Fail-open
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  const applyOtaUpdate = useCallback(async () => {
    if (isApplyingUpdate) return;
    setIsApplyingUpdate(true);

    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (err) {
      Sentry.captureException(err);
    } finally {
      setIsApplyingUpdate(false);
    }
  }, [isApplyingUpdate]);

  return {
    checking,
    forceUpdateRequired,
    softUpdateAvailable,
    message,
    storeUrl,
    applyOtaUpdate,
    isApplyingUpdate,
  };
}
