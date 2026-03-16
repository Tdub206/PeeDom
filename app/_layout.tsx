import '../global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
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
import { ToastProvider } from '@/contexts/ToastContext';
import { queryClient } from '@/lib/query-client';
import { initializeSentry, Sentry } from '@/lib/sentry';
import { supabaseConfigState } from '@/lib/supabase';

initializeSentry();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });
  const { loading } = useAuth();
  useOfflineSync();
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

    void SplashScreen.hideAsync().catch(() => undefined);
  }, [isAppReady]);

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

export default function RootLayout() {
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
}
