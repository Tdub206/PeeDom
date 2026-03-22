import '../global.css';

import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { ConfigurationErrorScreen } from '@/components/ConfigurationErrorScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { initializeAnalytics, trackAnalyticsEvent } from '@/lib/analytics';
import { isNetworkStateOnline } from '@/lib/network-state';
import { initializeQueryLifecycleManagers } from '@/lib/query-lifecycle';
import { realtimeManager } from '@/lib/realtime-manager';
import { ToastProvider } from '@/contexts/ToastContext';
import { queryClient } from '@/lib/query-client';
import { initializeSentry, Sentry } from '@/lib/sentry';
import { supabaseConfigState } from '@/lib/supabase';
import { useRealtimeStore } from '@/store/useRealtimeStore';

initializeSentry();
initializeQueryLifecycleManagers();
void initializeAnalytics().catch(() => undefined);
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });
  const { loading } = useAuth();
  const hasTrackedBootstrap = useRef(false);
  const wasOnlineRef = useRef<boolean | null>(null);
  const setConnectionState = useRealtimeStore((state) => state.setConnectionState);
  useOfflineSync();
  usePushNotifications();
  const isAppReady = !loading && (fontsLoaded || Boolean(fontError));

  useEffect(() => {
    if (fontError) {
      Sentry.captureException(fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (!isAppReady) {
      return;
    }

    if (hasTrackedBootstrap.current) {
      return;
    }

    hasTrackedBootstrap.current = true;
    void trackAnalyticsEvent('app_bootstrapped', {
      auth_loading: loading,
      fonts_ready: fontsLoaded || Boolean(fontError),
    });
  }, [fontError, fontsLoaded, isAppReady, loading]);

  useEffect(() => {
    if (!isAppReady) {
      return;
    }

    void SplashScreen.hideAsync().catch(() => undefined);
  }, [isAppReady]);

  useEffect(() => {
    const unsubscribeForeground = realtimeManager.onForeground(() => {
      void queryClient.invalidateQueries({ refetchType: 'active' }).catch((error) => {
        Sentry.captureException(error);
      });
    });

    const unsubscribeBackground = realtimeManager.onBackground(() => {
      setConnectionState('CLOSING');
    });

    const unsubscribeNetwork = NetInfo.addEventListener((state) => {
      const isOnline = isNetworkStateOnline(state);
      const wasOnline = wasOnlineRef.current;
      wasOnlineRef.current = isOnline;

      if (!isOnline) {
        setConnectionState('CLOSED');
        return;
      }

      if (wasOnline === false) {
        void realtimeManager.handleNetworkReconnect().catch((error) => {
          Sentry.captureException(error);
        });
        void queryClient.invalidateQueries({ refetchType: 'active' }).catch((error) => {
          Sentry.captureException(error);
        });
      }
    });

    void NetInfo.fetch()
      .then((state) => {
        const isOnline = isNetworkStateOnline(state);
        wasOnlineRef.current = isOnline;

        if (!isOnline) {
          setConnectionState('CLOSED');
        }
      })
      .catch((error) => {
        Sentry.captureException(error);
      });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
      unsubscribeNetwork();
      void realtimeManager.destroy().catch((error) => {
        Sentry.captureException(error);
      });
    };
  }, [setConnectionState]);

  if (!isAppReady) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="bathroom/[id]"
          options={{
            presentation: 'card',
            headerShown: true,
            headerTitle: 'Bathroom Details',
          }}
        />
        <Stack.Screen
          name="modal/report"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Report Issue',
          }}
        />
        <Stack.Screen
          name="modal/add-bathroom"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Add A Spot',
          }}
        />
        <Stack.Screen
          name="modal/submit-code"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Submit Access Code',
          }}
        />
        <Stack.Screen
          name="modal/rate-cleanliness"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Rate Cleanliness',
          }}
        />
        <Stack.Screen
          name="modal/live-status"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Live Status',
          }}
        />
        <Stack.Screen
          name="modal/update-accessibility"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Accessibility Details',
          }}
        />
        <Stack.Screen
          name="modal/claim-business"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Claim A Business',
          }}
        />
        <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
      </Stack>
    </>
  );
}

export default Sentry.wrap(function RootLayout() {
  if (!supabaseConfigState.isConfigured) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ConfigurationErrorScreen
            title="Launch configuration is incomplete"
            message={
              supabaseConfigState.errorMessage ??
              'This build is missing the runtime configuration required to talk to Supabase.'
            }
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <AuthProvider>
                <LocationProvider>
                  <RootNavigator />
                </LocationProvider>
              </AuthProvider>
            </ToastProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
});
