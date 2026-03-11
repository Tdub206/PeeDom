import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/constants/routes';
import { returnIntent } from '@/lib/return-intent';

export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isAuthenticated) {
      return;
    }

    void (async () => {
      try {
        const intent = await returnIntent.consume();
        const destination = (intent?.route ?? routes.tabs.profile) as Parameters<typeof router.replace>[0];
        router.replace(destination);
      } catch (error) {
        console.error('Unable to restore the protected-route destination:', error);
        router.replace(routes.tabs.profile);
      }
    })();
  }, [isAuthenticated, loading, router]);

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
