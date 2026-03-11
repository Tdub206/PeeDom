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
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingScreen } from '@/components/LoadingScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { queryClient } from '@/lib/query-client';
import { initializeSentry, Sentry } from '@/lib/sentry';

initializeSentry();
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });
  const { loading } = useAuth();
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
        <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <AuthProvider>
                <RootNavigator />
              </AuthProvider>
            </ToastProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
