import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchContributorLeaderboard,
  fetchMyBadges,
  fetchMyGamificationSummary,
  fetchMyPointEvents,
  redeemPointsForPremium,
} from '@/api/gamification';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { getErrorMessage } from '@/utils/errorMap';

export const gamificationQueryKeys = {
  all: ['gamification'] as const,
  summary: ['gamification', 'summary'] as const,
  badges: ['gamification', 'badges'] as const,
  history: ['gamification', 'history'] as const,
  leaderboard: (scope: string, timeframe: string, state?: string | null, city?: string | null) =>
    ['gamification', 'leaderboard', scope, timeframe, state ?? null, city ?? null] as const,
};

export function useGamificationDashboard() {
  const queryClient = useQueryClient();
  const { isAuthenticated, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const summaryQuery = useQuery({
    queryKey: gamificationQueryKeys.summary,
    enabled: isAuthenticated,
    queryFn: async () => {
      const result = await fetchMyGamificationSummary();

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const badgesQuery = useQuery({
    queryKey: gamificationQueryKeys.badges,
    enabled: isAuthenticated,
    queryFn: async () => {
      const result = await fetchMyBadges();

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const historyQuery = useQuery({
    queryKey: gamificationQueryKeys.history,
    enabled: isAuthenticated,
    queryFn: async () => {
      const result = await fetchMyPointEvents(20);

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const globalWeeklyLeaderboardQuery = useQuery({
    queryKey: gamificationQueryKeys.leaderboard('global', 'weekly'),
    enabled: true,
    queryFn: async () => {
      const result = await fetchContributorLeaderboard({
        scope: 'global',
        timeframe: 'weekly',
        limit: 10,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const cityWeeklyLeaderboardQuery = useQuery({
    queryKey: gamificationQueryKeys.leaderboard(
      'city',
      'weekly',
      summaryQuery.data?.primary_state ?? null,
      summaryQuery.data?.primary_city ?? null
    ),
    enabled: isAuthenticated && Boolean(summaryQuery.data?.primary_city),
    queryFn: async () => {
      const result = await fetchContributorLeaderboard({
        scope: 'city',
        timeframe: 'weekly',
        state: summaryQuery.data?.primary_state ?? null,
        city: summaryQuery.data?.primary_city ?? null,
        limit: 5,
      });

      if (result.error) {
        throw result.error;
      }

      return result.data;
    },
  });

  const redeemMutation = useMutation({
    mutationFn: async (months: number) => {
      const result = await redeemPointsForPremium(months);

      if (result.error || !result.data) {
        throw result.error ?? new Error('Unable to redeem points for premium right now.');
      }

      return result.data;
    },
    onSuccess: async (result) => {
      await refreshProfile();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gamificationQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['bathrooms'] }),
      ]);

      showToast({
        title: 'Premium unlocked',
        message: `You redeemed ${result.points_spent} points. Premium is active until ${new Date(result.premium_expires_at).toLocaleDateString()}.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      showToast({
        title: 'Redemption failed',
        message: getErrorMessage(error, 'Unable to redeem points for premium right now.'),
        variant: 'error',
      });
    },
  });

  const redeemPremium = useCallback(async (months = 1) => {
    return redeemMutation.mutateAsync(months);
  }, [redeemMutation]);

  const refreshDashboard = useCallback(async () => {
    const refreshOperations: Array<Promise<unknown>> = [globalWeeklyLeaderboardQuery.refetch()];

    if (isAuthenticated) {
      refreshOperations.push(
        refreshProfile(),
        summaryQuery.refetch(),
        badgesQuery.refetch(),
        historyQuery.refetch()
      );

      if (summaryQuery.data?.primary_city) {
        refreshOperations.push(cityWeeklyLeaderboardQuery.refetch());
      }
    }

    await Promise.all(refreshOperations);
  }, [
    badgesQuery,
    cityWeeklyLeaderboardQuery,
    globalWeeklyLeaderboardQuery,
    historyQuery,
    isAuthenticated,
    refreshProfile,
    summaryQuery,
  ]);

  const isRefreshingDashboard =
    summaryQuery.isFetching ||
    badgesQuery.isFetching ||
    historyQuery.isFetching ||
    globalWeeklyLeaderboardQuery.isFetching ||
    cityWeeklyLeaderboardQuery.isFetching;

  return {
    badges: badgesQuery.data ?? [],
    badgesError: badgesQuery.error ? getErrorMessage(badgesQuery.error, 'Unable to load badges.') : null,
    cityWeeklyLeaderboard: cityWeeklyLeaderboardQuery.data ?? [],
    cityWeeklyLeaderboardError: cityWeeklyLeaderboardQuery.error
      ? getErrorMessage(cityWeeklyLeaderboardQuery.error, 'Unable to load the city leaderboard.')
      : null,
    globalWeeklyLeaderboard: globalWeeklyLeaderboardQuery.data ?? [],
    globalWeeklyLeaderboardError: globalWeeklyLeaderboardQuery.error
      ? getErrorMessage(globalWeeklyLeaderboardQuery.error, 'Unable to load the global leaderboard.')
      : null,
    isLoadingBadges: badgesQuery.isLoading,
    isLoadingCityWeeklyLeaderboard: cityWeeklyLeaderboardQuery.isLoading,
    isLoadingGlobalWeeklyLeaderboard: globalWeeklyLeaderboardQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    isLoadingSummary: summaryQuery.isLoading,
    isRefreshingDashboard,
    isRedeemingPremium: redeemMutation.isPending,
    pointHistory: historyQuery.data ?? [],
    pointHistoryError: historyQuery.error ? getErrorMessage(historyQuery.error, 'Unable to load recent activity.') : null,
    primaryCity: summaryQuery.data?.primary_city ?? null,
    primaryState: summaryQuery.data?.primary_state ?? null,
    refreshDashboard,
    redeemPremium,
    summary: summaryQuery.data,
    summaryError: summaryQuery.error ? getErrorMessage(summaryQuery.error, 'Unable to load your contribution summary.') : null,
    userProfile: profile,
  };
}
