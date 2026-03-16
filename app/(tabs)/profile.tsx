import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useGamificationDashboard } from '@/hooks/useGamificationDashboard';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useToast } from '@/hooks/useToast';
import { getLevelProgress, getPointEventLabel, hasActivePremium } from '@/lib/gamification';
import { pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';

function formatDateLabel(value?: string | null): string {
  if (!value) {
    return 'Not set';
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not set';
  }

  return parsedDate.toLocaleDateString();
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="w-[48%] rounded-2xl bg-surface-muted px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">{label}</Text>
      <Text className="mt-2 text-2xl font-black text-ink-900">{value}</Text>
    </View>
  );
}

function NotificationPreferenceRow({
  description,
  enabled,
  isLoading,
  label,
  onPress,
}: {
  description: string;
  enabled: boolean;
  isLoading: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, busy: isLoading, disabled: isLoading }}
      className={[
        'rounded-3xl border px-4 py-4',
        enabled ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-base',
        isLoading ? 'opacity-60' : '',
      ].join(' ')}
      disabled={isLoading}
      onPress={onPress}
    >
      <View className="flex-row items-center justify-between gap-4">
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-900">{label}</Text>
          <Text className="mt-1 text-sm leading-5 text-ink-600">{description}</Text>
        </View>
        <View
          className={[
            'min-w-[78px] items-center rounded-full px-4 py-2',
            enabled ? 'bg-brand-600' : 'bg-surface-muted',
          ].join(' ')}
        >
          {isLoading ? (
            <ActivityIndicator color={enabled ? '#ffffff' : '#1f2937'} size="small" />
          ) : (
            <Text className={['text-sm font-bold', enabled ? 'text-white' : 'text-ink-700'].join(' ')}>
              {enabled ? 'On' : 'Off'}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfileTab() {
  const router = useRouter();
  const { authIssue, isAuthenticated, isGuest, profile, sessionState, signOut, user } = useAuth();
  const { showToast } = useToast();
  const notificationPreferences = useNotificationPreferences();
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
    pointHistory,
    pointHistoryError,
    primaryCity,
    primaryState,
    redeemPremium,
    summary,
    summaryError,
  } = useGamificationDashboard();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const activePremium = hasActivePremium(profile);
  const levelProgress = useMemo(
    () => getLevelProgress(profile?.points_balance ?? 0),
    [profile?.points_balance]
  );
  const canRedeemPremium = (profile?.points_balance ?? 0) >= 1000;
  const currentMultiplierActive = Boolean(
    profile?.streak_multiplier_expires_at &&
    new Date(profile.streak_multiplier_expires_at).getTime() > Date.now() &&
    (profile.streak_multiplier ?? 1) > 1
  );
  const contributionMetrics = useMemo(() => {
    return [
      {
        label: 'Bathrooms Added',
        value: summary?.total_bathrooms_added ?? 0,
      },
      {
        label: 'Codes Submitted',
        value: summary?.total_codes_submitted ?? 0,
      },
      {
        label: 'Codes Verified',
        value: summary?.total_code_verifications ?? 0,
      },
      {
        label: 'Reports Filed',
        value: summary?.total_reports_filed ?? 0,
      },
      {
        label: 'Photos Uploaded',
        value: summary?.total_photos_uploaded ?? 0,
      },
      {
        label: 'Badges Earned',
        value: summary?.total_badges ?? 0,
      },
    ];
  }, [summary]);

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

  const handleRedeemPremium = useCallback(async () => {
    await redeemPremium(1);
  }, [redeemPremium]);

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic">
        <View className="px-6 py-8">
          <Text className="text-4xl font-black tracking-tight text-ink-900">Profile</Text>
          <Text className="mt-2 text-base leading-6 text-ink-600">
            Track your contribution streak, unlock premium with points, and see how you rank against the Pee-Dom community.
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
                    {activePremium ? `Active until ${formatDateLabel(profile?.premium_expires_at)}` : 'Standard'}
                  </Text>
                </View>
              </View>
            ) : null}

            {isGuest ? (
              <View className="mt-6 gap-3">
                <Text className="text-base leading-6 text-ink-600">
                  You are browsing in guest mode. Sign in to save favorites, submit bathroom codes, earn points, and appear on leaderboards.
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

          {isAuthenticated ? (
            <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Push Notifications</Text>
              <Text className="mt-3 text-2xl font-bold text-ink-900">
                {profile?.push_enabled ? 'This device is eligible for alerts' : 'Alerts are currently muted'}
              </Text>
              <Text className="mt-2 text-base leading-6 text-ink-600">
                Save favorite bathrooms and stay synced when a new community code lands. Notification delivery depends on device permission and this profile setting.
              </Text>

              <View className="mt-5 gap-3">
                <NotificationPreferenceRow
                  description="Enable or mute all push notifications for this device."
                  enabled={notificationPreferences.isPushEnabled}
                  isLoading={notificationPreferences.isUpdating('push_enabled')}
                  label="Push notifications"
                  onPress={() => {
                    void notificationPreferences.togglePushEnabled(!notificationPreferences.isPushEnabled);
                  }}
                />
                <NotificationPreferenceRow
                  description="Get alerted when a saved bathroom receives a newly submitted access code."
                  enabled={notificationPreferences.settings.favorite_update}
                  isLoading={notificationPreferences.isUpdating('favorite_update')}
                  label="Favorite updates"
                  onPress={() => {
                    void notificationPreferences.togglePreference('favorite_update');
                  }}
                />
              </View>

              <Text className="mt-4 text-sm leading-5 text-ink-600">
                {profile?.push_token
                  ? 'Device registration is active.'
                  : profile?.push_enabled
                    ? 'Pee-Dom will register this device the next time notification permission is available.'
                    : 'Notifications remain disabled until you turn them back on.'}
              </Text>
            </View>
          ) : null}

          {isAuthenticated ? (
            <>
              <View className="mt-6 rounded-[32px] bg-brand-600 px-6 py-6">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">Level & Tier</Text>
                <Text className="mt-3 text-4xl font-black text-white">
                  Level {levelProgress.level} · {levelProgress.tierName}
                </Text>
                <Text className="mt-2 text-base leading-6 text-white/80">
                  {levelProgress.pointsToNextLevel === 0
                    ? 'You have reached the current level cap.'
                    : `${levelProgress.pointsToNextLevel} more points to reach the next level.`}
                </Text>
                <View className="mt-5 h-3 rounded-full bg-white/15">
                  <View
                    className="h-3 rounded-full bg-white"
                    style={{ width: `${levelProgress.progressPercent}%` }}
                  />
                </View>
                <View className="mt-3 flex-row justify-between">
                  <Text className="text-sm text-white/70">{levelProgress.currentFloor} pts</Text>
                  <Text className="text-sm text-white/70">
                    {levelProgress.nextFloor === levelProgress.currentFloor ? 'Max' : `${levelProgress.nextFloor} pts`}
                  </Text>
                </View>
              </View>

              <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Contribution Dashboard</Text>
                {summaryError ? (
                  <Text className="mt-3 text-sm leading-5 text-warning">{summaryError}</Text>
                ) : null}
                {isLoadingSummary ? (
                  <Text className="mt-3 text-sm leading-5 text-ink-600">Loading your contribution totals...</Text>
                ) : (
                  <View className="mt-4 flex-row flex-wrap justify-between gap-y-4">
                    {contributionMetrics.map((metric) => (
                      <MetricTile key={metric.label} label={metric.label} value={metric.value} />
                    ))}
                  </View>
                )}
              </View>

              <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Streak Engine</Text>
                <Text className="mt-3 text-2xl font-bold text-ink-900">
                  {profile?.current_streak ?? 0} day streak
                </Text>
                <Text className="mt-2 text-base leading-6 text-ink-600">
                  Longest streak: {profile?.longest_streak ?? 0} days. Last contribution: {formatDateLabel(profile?.last_contribution_date)}.
                </Text>
                <Text className="mt-3 text-sm leading-5 text-ink-600">
                  7-day streaks unlock the cosmetic streak badge. 30-day streaks activate a {profile?.streak_multiplier ?? 1}x point multiplier through{' '}
                  {formatDateLabel(profile?.streak_multiplier_expires_at)}.
                </Text>
                {currentMultiplierActive ? (
                  <Text className="mt-3 rounded-2xl bg-success/10 px-4 py-3 text-sm font-medium text-success">
                    Your contribution multiplier is active right now.
                  </Text>
                ) : null}
              </View>

              <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Premium Redemption</Text>
                <Text className="mt-3 text-2xl font-bold text-ink-900">1,000 points = 1 month of premium</Text>
                <Text className="mt-2 text-base leading-6 text-ink-600">
                  Earn your way into ad-free code reveals and premium privileges by contributing reliable bathroom data.
                </Text>
                <Button
                  className="mt-5"
                  disabled={!canRedeemPremium}
                  label={isRedeemingPremium ? 'Redeeming Premium...' : 'Redeem 1 Month Premium'}
                  loading={isRedeemingPremium}
                  onPress={() => {
                    void handleRedeemPremium();
                  }}
                />
                {!canRedeemPremium ? (
                  <Text className="mt-3 text-sm leading-5 text-ink-600">
                    You need 1,000 points to redeem premium. Current balance: {profile?.points_balance ?? 0}.
                  </Text>
                ) : null}
              </View>

              <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Badges</Text>
                {badgesError ? (
                  <Text className="mt-3 text-sm leading-5 text-warning">{badgesError}</Text>
                ) : null}
                {isLoadingBadges ? (
                  <Text className="mt-3 text-sm leading-5 text-ink-600">Loading earned badges...</Text>
                ) : badges.length ? (
                  <View className="mt-4 flex-row flex-wrap gap-3">
                    {badges.map((badge) => (
                      <View
                        className="rounded-full border border-brand-200 bg-brand-50 px-4 py-3"
                        key={badge.id}
                      >
                        <Text className="text-sm font-bold text-brand-700">{badge.badge_name}</Text>
                        <Text className="mt-1 text-xs leading-5 text-brand-700/90">{badge.badge_description}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-3 text-sm leading-5 text-ink-600">
                    Contribute bathrooms, codes, and verifications to unlock your first badge.
                  </Text>
                )}
              </View>

              <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Leaderboards</Text>
                {globalWeeklyLeaderboardError ? (
                  <Text className="mt-3 text-sm leading-5 text-warning">{globalWeeklyLeaderboardError}</Text>
                ) : null}
                <Text className="mt-4 text-lg font-bold text-ink-900">Global This Week</Text>
                {isLoadingGlobalWeeklyLeaderboard ? (
                  <Text className="mt-2 text-sm leading-5 text-ink-600">Loading weekly rankings...</Text>
                ) : globalWeeklyLeaderboard.length ? (
                  <View className="mt-3 gap-3">
                    {globalWeeklyLeaderboard.map((entry) => (
                      <View className="flex-row items-center justify-between rounded-2xl bg-surface-muted px-4 py-4" key={`${entry.leaderboard_scope}-${entry.user_id}`}>
                        <View className="pr-4">
                          <Text className="text-base font-bold text-ink-900">
                            #{entry.rank} {entry.display_name}
                          </Text>
                          <Text className="mt-1 text-sm text-ink-600">
                            {entry.total_points} pts · {entry.codes_submitted} codes · {entry.verifications} verifications
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-2 text-sm leading-5 text-ink-600">No weekly contributors have scored yet.</Text>
                )}

                {primaryCity ? (
                  <>
                    <Text className="mt-6 text-lg font-bold text-ink-900">
                      {primaryCity}{primaryState ? `, ${primaryState}` : ''} This Week
                    </Text>
                    {cityWeeklyLeaderboardError ? (
                      <Text className="mt-2 text-sm leading-5 text-warning">{cityWeeklyLeaderboardError}</Text>
                    ) : isLoadingCityWeeklyLeaderboard ? (
                      <Text className="mt-2 text-sm leading-5 text-ink-600">Loading local rankings...</Text>
                    ) : cityWeeklyLeaderboard.length ? (
                      <View className="mt-3 gap-3">
                        {cityWeeklyLeaderboard.map((entry) => (
                          <View className="flex-row items-center justify-between rounded-2xl bg-surface-muted px-4 py-4" key={`${entry.scope_label}-${entry.user_id}`}>
                            <View className="pr-4">
                              <Text className="text-base font-bold text-ink-900">
                                #{entry.rank} {entry.display_name}
                              </Text>
                              <Text className="mt-1 text-sm text-ink-600">
                                {entry.total_points} pts · {entry.bathrooms_added} bathrooms · {entry.photos_uploaded} photos
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text className="mt-2 text-sm leading-5 text-ink-600">
                        No local leaderboard activity has been recorded yet.
                      </Text>
                    )}
                  </>
                ) : null}
              </View>

              <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Recent Activity</Text>
                {pointHistoryError ? (
                  <Text className="mt-3 text-sm leading-5 text-warning">{pointHistoryError}</Text>
                ) : null}
                {isLoadingHistory ? (
                  <Text className="mt-3 text-sm leading-5 text-ink-600">Loading recent point events...</Text>
                ) : pointHistory.length ? (
                  <View className="mt-4 gap-3">
                    {pointHistory.map((event) => (
                      <View className="rounded-2xl bg-surface-muted px-4 py-4" key={event.id}>
                        <View className="flex-row items-center justify-between gap-4">
                          <Text className="flex-1 text-base font-semibold text-ink-900">
                            {getPointEventLabel(event.event_type)}
                          </Text>
                          <Text className={['text-base font-bold', event.points_awarded >= 0 ? 'text-success' : 'text-danger'].join(' ')}>
                            {event.points_awarded >= 0 ? `+${event.points_awarded}` : event.points_awarded}
                          </Text>
                        </View>
                        <Text className="mt-2 text-sm text-ink-600">{new Date(event.created_at).toLocaleString()}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text className="mt-3 text-sm leading-5 text-ink-600">
                    Your point history will appear here after your first contribution.
                  </Text>
                )}
              </View>

              <Button
                className="mt-6"
                label="Sign Out"
                loading={isSigningOut}
                variant="destructive"
                onPress={() => {
                  void handleSignOut();
                }}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
