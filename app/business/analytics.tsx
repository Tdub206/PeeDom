import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import {
  BusinessScreenLayout,
  BusinessSectionHeader,
  DashboardStats,
  VisitAnalyticsCard,
} from '@/components/business';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useBusinessDashboard } from '@/hooks/useBusiness';
import { useBusinessVisitStats } from '@/hooks/useStallPassVisits';
import { getErrorMessage } from '@/utils/errorMap';

export default function BusinessAnalyticsScreen() {
  const router = useRouter();
  const dashboardQuery = useBusinessDashboard();
  const visitStatsQuery = useBusinessVisitStats();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(routes.tabs.business);
  }, [router]);

  const handleRefresh = useCallback(() => {
    void dashboardQuery.refetch();
    void visitStatsQuery.refetch();
  }, [dashboardQuery, visitStatsQuery]);

  if (dashboardQuery.isLoading) {
    return <LoadingScreen message="Loading analytics." />;
  }

  const visitStats = visitStatsQuery.data ?? [];

  return (
    <BusinessScreenLayout
      eyebrow="Analytics"
      title="Discovery, routes, and reach"
      subtitle="See how StallPass is sending real customers to your locations."
      iconName="bar-chart"
      variant="dark"
      onBack={handleBack}
      isRefreshing={dashboardQuery.isFetching || visitStatsQuery.isFetching}
      onRefresh={handleRefresh}
    >
      {dashboardQuery.error ? (
        <View className="rounded-[24px] border border-danger/20 bg-danger/10 p-5">
          <Text className="text-lg font-bold text-danger">Analytics delayed</Text>
          <Text className="mt-2 text-sm leading-6 text-danger">
            {getErrorMessage(dashboardQuery.error, 'We could not refresh analytics right now.')}
          </Text>
          <Button className="mt-4" label="Retry" onPress={() => void dashboardQuery.refetch()} />
        </View>
      ) : null}

      {dashboardQuery.data ? (
        <DashboardStats
          bathrooms={dashboardQuery.data.bathrooms}
          summary={dashboardQuery.data.summary}
        />
      ) : null}

      {visitStats.length > 0 ? (
        <View>
          <BusinessSectionHeader
            eyebrow="StallPass visits"
            title="Customers we sent your way"
            description="Per-location visit volume tied directly to StallPass discovery."
            iconName="trending-up"
          />
          <View className="gap-3">
            {visitStats.map((stats) => (
              <VisitAnalyticsCard key={stats.bathroom_id} stats={stats} />
            ))}
          </View>
        </View>
      ) : null}
    </BusinessScreenLayout>
  );
}
