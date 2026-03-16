import { useCallback, useMemo, useState } from 'react';
import { persistPushToken, updateNotificationSettings } from '@/api/notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { requestPushToken } from '@/lib/push-notifications';
import { DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

type NotificationSettingKey = 'push_enabled' | keyof NotificationPrefs;

export function useNotificationPreferences() {
  const { profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [pendingKey, setPendingKey] = useState<NotificationSettingKey | null>(null);
  const settings = useMemo(
    () => profile?.notification_prefs ?? DEFAULT_NOTIFICATION_PREFS,
    [profile?.notification_prefs]
  );

  const togglePushEnabled = useCallback(
    async (enabled: boolean) => {
      if (pendingKey) {
        return false;
      }

      setPendingKey('push_enabled');

      try {
        if (enabled) {
          const registrationResult = await requestPushToken();

          if (registrationResult.status === 'permission_denied') {
            showToast({
              title: 'Notifications blocked',
              message: 'Allow notifications in your device settings to receive bathroom updates.',
              variant: 'warning',
            });
            return false;
          }

          if (registrationResult.status === 'not_device') {
            showToast({
              title: 'Physical device required',
              message: 'Push notifications can only be enabled on a physical device.',
              variant: 'info',
            });
            return false;
          }

          if (registrationResult.status === 'missing_project_id') {
            showToast({
              title: 'Notification config missing',
              message: 'This build is missing its Expo project ID, so push registration cannot complete.',
              variant: 'error',
            });
            return false;
          }

          if (registrationResult.status === 'error') {
            throw registrationResult.error;
          }

          const persistResult = await persistPushToken(registrationResult.token);

          if (persistResult.error) {
            throw persistResult.error;
          }
        }

        const updateResult = await updateNotificationSettings({
          pushEnabled: enabled,
        });

        if (updateResult.error) {
          throw updateResult.error;
        }

        await refreshProfile();

        showToast({
          title: enabled ? 'Push enabled' : 'Push disabled',
          message: enabled
            ? 'This device will receive saved bathroom updates.'
            : 'Pee-Dom will stop sending push notifications to this device.',
          variant: 'success',
        });

        return true;
      } catch (error) {
        showToast({
          title: 'Notification update failed',
          message: getErrorMessage(error, 'We could not update your notification settings right now.'),
          variant: 'error',
        });
        return false;
      } finally {
        setPendingKey(null);
      }
    },
    [pendingKey, refreshProfile, showToast]
  );

  const togglePreference = useCallback(
    async (preferenceKey: keyof NotificationPrefs) => {
      if (pendingKey) {
        return false;
      }

      setPendingKey(preferenceKey);

      try {
        const nextValue = !settings[preferenceKey];
        const updateResult = await updateNotificationSettings({
          notificationPrefs: {
            [preferenceKey]: nextValue,
          },
        });

        if (updateResult.error) {
          throw updateResult.error;
        }

        await refreshProfile();

        showToast({
          title: 'Preference saved',
          message: nextValue ? 'This notification type is now enabled.' : 'This notification type is now muted.',
          variant: 'success',
        });

        return true;
      } catch (error) {
        showToast({
          title: 'Preference update failed',
          message: getErrorMessage(error, 'We could not save that notification preference right now.'),
          variant: 'error',
        });
        return false;
      } finally {
        setPendingKey(null);
      }
    },
    [pendingKey, refreshProfile, settings, showToast]
  );

  return {
    isPushEnabled: Boolean(profile?.push_enabled),
    isUpdating: (key: NotificationSettingKey) => pendingKey === key,
    settings,
    togglePreference,
    togglePushEnabled,
  };
}
