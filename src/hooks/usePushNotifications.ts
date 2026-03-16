import { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { persistPushToken } from '@/api/notifications';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { pushSafely } from '@/lib/navigation';
import { clearBadgeCount, extractNotificationRoute, requestPushToken } from '@/lib/push-notifications';
import { Sentry } from '@/lib/sentry';

export function usePushNotifications(): void {
  const router = useRouter();
  const { isAuthenticated, profile, refreshProfile } = useAuth();
  const isRegisteringRef = useRef(false);

  const navigateFromNotificationResponse = useCallback(
    async (response: Notifications.NotificationResponse | null) => {
      if (!response) {
        return;
      }

      try {
        const route = extractNotificationRoute(response.notification.request.content.data);

        if (route) {
          pushSafely(router, route, routes.tabs.map);
        }

        await Notifications.clearLastNotificationResponseAsync();
      } catch (error) {
        Sentry.captureException(error);
      }
    },
    [router]
  );

  const ensurePushRegistration = useCallback(async () => {
    if (!isAuthenticated || !profile?.push_enabled || isRegisteringRef.current) {
      return;
    }

    isRegisteringRef.current = true;

    try {
      const result = await requestPushToken();

      if (result.status === 'registered') {
        if (result.token !== profile.push_token) {
          const persistResult = await persistPushToken(result.token);

          if (persistResult.error) {
            throw persistResult.error;
          }

          await refreshProfile();
        }

        return;
      }

      if (result.status === 'missing_project_id') {
        Sentry.captureException(new Error('Expo push project ID is missing from runtime configuration.'));
      } else if (result.status === 'error') {
        Sentry.captureException(result.error);
      }
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      isRegisteringRef.current = false;
    }
  }, [isAuthenticated, profile?.push_enabled, profile?.push_token, refreshProfile]);

  useEffect(() => {
    if (!isAuthenticated || !profile?.push_enabled || profile.push_token) {
      return;
    }

    void ensurePushRegistration();
  }, [ensurePushRegistration, isAuthenticated, profile?.push_enabled, profile?.push_token]);

  useEffect(() => {
    const notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void navigateFromNotificationResponse(response);
    });

    const pushTokenSubscription = Notifications.addPushTokenListener((token) => {
      if (!isAuthenticated || !profile?.push_enabled) {
        return;
      }

      void (async () => {
        try {
          const persistResult = await persistPushToken(token.data);

          if (persistResult.error) {
            throw persistResult.error;
          }

          if (token.data !== profile.push_token) {
            await refreshProfile();
          }
        } catch (error) {
          Sentry.captureException(error);
        }
      })();
    });

    void (async () => {
      try {
        const initialResponse = await Notifications.getLastNotificationResponseAsync();
        await navigateFromNotificationResponse(initialResponse);
      } catch (error) {
        Sentry.captureException(error);
      }
    })();

    return () => {
      notificationResponseSubscription.remove();
      pushTokenSubscription.remove();
    };
  }, [isAuthenticated, navigateFromNotificationResponse, profile?.push_enabled, profile?.push_token, refreshProfile]);

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') {
        return;
      }

      void clearBadgeCount();

      if (isAuthenticated && profile?.push_enabled && !profile.push_token) {
        void ensurePushRegistration();
      }
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [ensurePushRegistration, isAuthenticated, profile?.push_enabled, profile?.push_token]);
}
