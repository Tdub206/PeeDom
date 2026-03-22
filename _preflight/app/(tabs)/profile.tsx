import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/constants/routes';
import { useToast } from '@/hooks/useToast';
import { pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';

export default function ProfileTab() {
  const router = useRouter();
  const { authIssue, isAuthenticated, isGuest, profile, sessionState, signOut, user } = useAuth();
  const { showToast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
      showToast({
        title: 'Signed out',
        message: 'You are back in guest mode.',
        variant: 'info',
      });
    } catch (error) {
      showToast({
        title: 'Unable to sign out',
        message: getErrorMessage(error, 'Try again in a moment.'),
        variant: 'error',
      });
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, showToast, signOut]);

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-6 py-8">
        <Text className="text-4xl font-black tracking-tight text-ink-900">Profile</Text>
        <Text className="mt-2 text-base leading-6 text-ink-600">
          Manage your session, review account status, and jump into protected actions.
        </Text>

        <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Session State</Text>
          <Text className="mt-3 text-2xl font-bold text-ink-900">{sessionState.status}</Text>

          {authIssue ? (
            <Text className="mt-4 rounded-2xl bg-warning/10 px-4 py-3 text-sm leading-5 text-warning">
              {authIssue}
            </Text>
          ) : null}

          {isAuthenticated ? (
            <View className="mt-6 gap-4">
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Email</Text>
                <Text className="mt-1 text-base font-medium text-ink-900">{user?.email ?? 'Unknown'}</Text>
              </View>
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Role</Text>
                <Text className="mt-1 text-base font-medium capitalize text-ink-900">{profile?.role ?? 'user'}</Text>
              </View>
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Points</Text>
                <Text className="mt-1 text-base font-medium text-ink-900">{profile?.points_balance ?? 0}</Text>
              </View>
              <View className="rounded-2xl bg-surface-muted px-4 py-4">
                <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Premium</Text>
                <Text className="mt-1 text-base font-medium text-ink-900">
                  {profile?.is_premium ? 'Active' : 'Standard'}
                </Text>
              </View>
              <Button
                className="mt-2"
                label="Sign Out"
                loading={isSigningOut}
                variant="destructive"
                onPress={() => {
                  void handleSignOut();
                }}
              />
            </View>
          ) : null}

          {isGuest ? (
            <View className="mt-6 gap-3">
              <Text className="text-base leading-6 text-ink-600">
                You are browsing in guest mode. Sign in to save favorites, submit bathroom codes, and sync activity.
              </Text>
              <Button label="Sign In" onPress={() => pushSafely(router, routes.auth.login, routes.auth.login)} />
              <Button
                label="Create Account"
                onPress={() => pushSafely(router, routes.auth.register, routes.auth.register)}
                variant="secondary"
              />
            </View>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
