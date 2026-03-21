import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { BadgesGrid, NotificationPrefsCard, PointsHistoryList, ProfileHeader, StatsGrid } from '@/components/profile';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useGamificationDashboard } from '@/hooks/useGamificationDashboard';
import { useAccountSignOut, useDeactivateAccount } from '@/hooks/useProfileAccount';
import { useToast } from '@/hooks/useToast';
import { hasActivePremium } from '@/lib/gamification';
import { pushSafely } from '@/lib/navigation';
import { LeaderboardEntry } from '@/types';
import { buildProfileStats } from '@/utils/profile';
import { getErrorMessage } from '@/utils/errorMap';

interface LeaderboardSectionProps {
  emptyCopy: string;
  entries: LeaderboardEntry[];
  error: string | null;
  isLoading: boolean;
  title: string;
}

function formatProfileDate(value?: string | null): string {
  if (!value) {
    return 'Not set';
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return 'Not set';
  }

  return parsedValue.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function LeaderboardRow({
  entry,
  isCurrentUser = false,
}: {
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}) {
  return (
    <View
      className={[
        'rounded-[22px] px-4 py-4',
        isCurrentUser ? 'border border-brand-200 bg-brand-50' : 'bg-surface-base',
      ].join(' ')}
    >
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-black text-ink-900">
            #{entry.rank} {entry.display_name}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">
            {entry.total_points} pts - {entry.codes_submitted} codes - {entry.verifications} verifications
          </Text>
        </View>
        {isCurrentUser ? (
          <View className="rounded-full bg-brand-600 px-3 py-2">
            <Text className="text-xs font-semibold uppercase tracking-[0.75px] text-white">You</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function LeaderboardSection({
  emptyCopy,
  entries,
  error,
  isLoading,
  title,
}: LeaderboardSectionProps) {
  return (
    <View>
      <Text className="text-lg font-bold text-ink-900">{title}</Text>
      {error ? <Text className="mt-2 text-sm leading-6 text-warning">{error}</Text> : null}
      {isLoading ? (
        <Text className="mt-3 text-sm leading-6 text-ink-600">Loading leaderboard activity...</Text>
      ) : entries.length ? (
        <View className="mt-3 gap-3">
          {entries.map((entry) => (
            <LeaderboardRow entry={entry} key={`${entry.leaderboard_scope}-${entry.user_id}`} />
          ))}
        </View>
      ) : (
        <Text className="mt-3 text-sm leading-6 text-ink-600">{emptyCopy}</Text>
      )}
    </View>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { authIssue, isAuthenticated, isGuest, profile, user } = useAuth();
  const { showToast } = useToast();
  const { isSigningOut, signOut } = useAccountSignOut();
  const { deactivateAccount, isDeactivating } = useDeactivateAccount();
  const {
    badges,
    badgesError,
    cityWeeklyLeaderboard,
    cityWeeklyLeaderboardError,
    globalWeeklyLeaderboard,
    globalWeeklyLeaderboardError,
    isLoadingBadges,
    isLoadingCityWeeklyLeaderboard,
    isLoadingGlobalWeeklyLeaderboard,
    isLoadingHistory,
    isLoadingSummary,
    isRedeemingPremium,
    isRefreshingDashboard,
    pointHistory,
    pointHistoryError,
    primaryCity,
    primaryState,
    redeemPremium,
    refreshDashboard,
    summary,
    summaryError,
  } = useGamificationDashboard();

  const profileStats = useMemo(() => buildProfileStats(summary ?? null, profile), [profile, summary]);
  const myLeaderboardEntry = useMemo(
    () => globalWeeklyLeaderboard.find((entry) => entry.user_id === user?.id) ?? null,
    [globalWeeklyLeaderboard, user?.id]
  );
  const canRedeemPremium = (profile?.points_balance ?? 0) >= 1000;
  const premiumActive = hasActivePremium(profile);

  const handleRefresh = useCallback(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  const handleRedeemPremium = useCallback(() => {
    void redeemPremium(1);
  }, [redeemPremium]);

  const handleConfirmSignOut = useCallback(() => {
    if (isSigningOut || isDeactivating) {
      return;
    }

    Alert.alert(
      'Sign out?',
      'You will return to guest mode on this device.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await signOut();
              } catch (error) {
                showToast({
                  title: 'Unable to sign out',
                  message: getErrorMessage(error, 'Try again in a moment.'),
                  variant: 'error',
                });
              }
            })();
          },
        },
      ]
    );
  }, [isDeactivating, isSigningOut, showToast, signOut]);

  const handleConfirmDeactivate = useCallback(() => {
    if (isSigningOut || isDeactivating) {
      return;
    }

    Alert.alert(
      'Deactivate account?',
      'This disables your PeeDom account and clears the current device session.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final confirmation',
              'Are you sure you want to deactivate your account?',
              [
                {
                  text: 'Go Back',
                  style: 'cancel',
                },
                {
                  text: 'Deactivate',
                  style: 'destructive',
                  onPress: () => {
                    void deactivateAccount();
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }, [deactivateAccount, isDeactivating, isSigningOut]);

  if (isAuthenticated && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
        <View className="flex-1 items-center justify-center px-6">
          <ActivityIndicator size="large" />
          <Text className="mt-4 text-base font-semibold text-ink-700">Loading your profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isGuest || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={isRefreshingDashboard} />}
        >
          <View className="px-4 pb-8 pt-3">
            <View className="rounded-[30px] bg-ink-900 px-5 py-5">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-white/70">Profile</Text>
              <Text className="mt-2 text-3xl font-black tracking-tight text-white">Join the community.</Text>
              <Text className="mt-2 text-sm leading-6 text-white/80">
                Create an account to save favorites, build streaks, earn badges, and climb the contributor leaderboard.
              </Text>
            </View>

            {authIssue ? (
              <View className="mt-4 rounded-[28px] border border-warning/20 bg-warning/10 px-5 py-5">
                <Text className="text-sm font-semibold text-warning">{authIssue}</Text>
              </View>
            ) : null}

            <View className="mt-4 rounded-[30px] border border-surface-strong bg-surface-card px-5 py-6">
              <Text className="text-lg font-bold text-ink-900">Browse in guest mode today.</Text>
              <Text className="mt-2 text-sm leading-6 text-ink-600">
                Sign in when you are ready to save dependable bathrooms, submit access codes, and keep a contribution history.
              </Text>
              <Button
                className="mt-5"
                label="Create Account"
                onPress={() => pushSafely(router, routes.auth.register, routes.tabs.profile)}
              />
              <Button
                className="mt-3"
                label="Sign In"
                onPress={() => pushSafely(router, routes.auth.login, routes.tabs.profile)}
                variant="secondary"
              />
            </View>

            <View className="mt-4 rounded-[30px] border border-surface-strong bg-surface-card px-5 py-6">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Weekly leaderboard</Text>
              <Text className="mt-2 text-2xl font-black text-ink-900">See who is contributing this week.</Text>
              <Text className="mt-2 text-sm leading-6 text-ink-600">
                Guest mode can still preview the current community pace before you create an account.
              </Text>

              {globalWeeklyLeaderboardError ? null : isLoadingGlobalWeeklyLeaderboard ? (
                <Text className="mt-4 text-sm leading-6 text-ink-600">Loading the latest community rankings...</Text>
              ) : globalWeeklyLeaderboard.length ? (
                <View className="mt-4 gap-3">
                  {globalWeeklyLeaderboard.slice(0, 5).map((entry) => (
                    <LeaderboardRow entry={entry} key={`${entry.leaderboard_scope}-${entry.user_id}`} />
                  ))}
                </View>
              ) : (
                <Text className="mt-4 text-sm leading-6 text-ink-600">
                  No weekly contributor scores have landed yet.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <View className="flex-row items-center justify-between px-4 pb-2 pt-3">
        <View>
          <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Profile</Text>
          <Text className="mt-1 text-3xl font-black tracking-tight text-ink-900">Your account</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          className="rounded-full border border-danger/20 bg-danger/10 px-4 py-2"
          disabled={isSigningOut || isDeactivating}
          onPress={handleConfirmSignOut}
        >
          <Text className="text-sm font-semibold text-danger">{isSigningOut ? 'Signing out...' : 'Sign Out'}</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={isRefreshingDashboard} />}
      >
        <View className="gap-4 px-4 pb-8 pt-1">
          {authIssue ? (
            <View className="rounded-[28px] border border-warning/20 bg-warning/10 px-5 py-5">
              <Text className="text-sm font-semibold text-warning">{authIssue}</Text>
            </View>
          ) : null}

          <ProfileHeader profile={profile} />

          {myLeaderboardEntry ? (
            <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
              <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Your weekly rank</Text>
              <View className="mt-4">
                <LeaderboardRow entry={myLeaderboardEntry} isCurrentUser />
              </View>
            </View>
          ) : null}

          {summaryError ? (
            <View className="rounded-[28px] border border-warning/20 bg-warning/10 px-5 py-5">
              <Text className="text-sm font-semibold text-warning">{summaryError}</Text>
            </View>
          ) : null}

          <StatsGrid stats={profileStats} />

          <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Premium redemption</Text>
            <Text className="mt-3 text-2xl font-black text-ink-900">
              {premiumActive ? 'Premium is active' : '1,000 points = 1 month of premium'}
            </Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              {premiumActive
                ? `Premium access is currently active through ${formatProfileDate(profile.premium_expires_at)}.`
                : 'Earn your way into ad-free code reveals and premium privileges by contributing reliable bathroom data.'}
            </Text>
            <Button
              className="mt-5"
              disabled={!canRedeemPremium}
              label={isRedeemingPremium ? 'Redeeming Premium...' : 'Redeem 1 Month Premium'}
              loading={isRedeemingPremium}
              onPress={handleRedeemPremium}
            />
            {!canRedeemPremium ? (
              <Text className="mt-3 text-sm leading-6 text-ink-600">
                You need 1,000 points to redeem premium. Current balance: {profile.points_balance}.
              </Text>
            ) : null}
          </View>

          <BadgesGrid badges={badges} error={badgesError} isLoading={isLoadingBadges} />

          <NotificationPrefsCard />

          <View className="rounded-[32px] border border-danger/20 bg-danger/5 px-5 py-6">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-danger">Account controls</Text>
            <Text className="mt-3 text-2xl font-black text-ink-900">Deactivate this account</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              Deactivation signs you out, clears the current device state, and prevents this profile from restoring in
              future app sessions.
            </Text>
            <Button
              className="mt-5"
              disabled={isSigningOut || isDeactivating}
              label={isDeactivating ? 'Deactivating Account...' : 'Deactivate Account'}
              loading={isDeactivating}
              onPress={handleConfirmDeactivate}
              variant="destructive"
            />
          </View>

          <View className="rounded-[32px] border border-surface-strong bg-surface-card px-5 py-6">
            <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Leaderboards</Text>
            <View className="mt-5 gap-6">
              <LeaderboardSection
                emptyCopy="No weekly contributors have scored yet."
                entries={globalWeeklyLeaderboard}
                error={globalWeeklyLeaderboardError}
                isLoading={isLoadingGlobalWeeklyLeaderboard}
                title="Global this week"
              />

              {primaryCity ? (
                <LeaderboardSection
                  emptyCopy="No local leaderboard activity has been recorded yet."
                  entries={cityWeeklyLeaderboard}
                  error={cityWeeklyLeaderboardError}
                  isLoading={isLoadingCityWeeklyLeaderboard}
                  title={`${primaryCity}${primaryState ? `, ${primaryState}` : ''} this week`}
                />
              ) : null}
            </View>
          </View>

          <PointsHistoryList
            error={pointHistoryError}
            events={pointHistory}
            isLoading={isLoadingHistory || isLoadingSummary}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
