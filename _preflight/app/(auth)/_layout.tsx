import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/constants/routes';
import { replaceSafely, toSafeRoute } from '@/lib/navigation';

export default function AuthLayout() {
  const { isAuthenticated, loading, peekReturnIntent } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isAuthenticated) {
      return;
    }

    void (async () => {
      try {
        const intent = peekReturnIntent();
        const destination = toSafeRoute(intent?.route, routes.tabs.profile);
        replaceSafely(router, destination, routes.tabs.profile);
      } catch (error) {
        console.error('Unable to restore the protected-route destination:', error);
        replaceSafely(router, routes.tabs.profile, routes.tabs.profile);
      }
    })();
  }, [isAuthenticated, loading, peekReturnIntent, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        presentation: 'modal',
        headerBackTitle: 'Cancel',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In',
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Create Account',
          headerLeft: () => null,
        }}
      />
    </Stack>
  );
}
