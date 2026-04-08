import { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import {
  BusinessScreenLayout,
  BusinessSectionHeader,
  FeaturedPlacementCard,
  QuickStatTile,
} from '@/components/business';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import {
  useBusinessDashboard,
  useBusinessFeaturedPlacements,
} from '@/hooks/useBusiness';
import { pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';

export default function BusinessFeaturedScreen() {
  const router = useRouter();
  const placementsQuery = useBusinessFeaturedPlacements();
  const dashboardQuery = useBusinessDashboard();

  const placements = placementsQuery.data ?? [];
  const bathrooms = dashboardQuery.data?.bathrooms ?? [];

  const totals = useMemo(() => {
    return {
      active: placements.filter((p) => p.status === 'active').length,
      impressions: placements.reduce((sum, p) => sum + (p.impressions_count ?? 0), 0),
      clicks: placements.reduce((sum, p) => sum + (p.clicks_count ?? 0), 0),
    };
  }, [placements]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(routes.tabs.business);
  }, [router]);

  const handleRequestFeatured = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.modal.requestFeaturedBathroom(bathroomId), routes.tabs.business);
    },
    [router]
  );

  if (placementsQuery.isLoading) {
    return <LoadingScreen message="Loading featured placements." />;
  }

  return (
    <BusinessScreenLayout
      eyebrow="Boost"
      title="Featured placements"
      subtitle="Boost discoverability and put your spot at the top of the map."
      iconName="star"
      variant="dark"
      onBack={handleBack}
      isRefreshing={placementsQuery.isFetching}
      onRefresh={() => void placementsQuery.refetch()}
    >
      {placementsQuery.error ? (
        <View className="rounded-[24px] border border-danger/20 bg-danger/10 p-5">
          <Text className="text-lg font-bold text-danger">Could not load placements</Text>
          <Text className="mt-2 text-sm leading-6 text-danger">
            {getErrorMessage(placementsQuery.error, 'Featured placement data is temporarily unavailable.')}
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-3">
        <QuickStatTile
          iconName="rocket"
          label="Active"
          tone="brand"
          value={totals.active}
        />
        <QuickStatTile
          iconName="eye"
          label="Impressions"
          value={totals.impressions}
        />
        <QuickStatTile
          iconName="navigate"
          label="Clicks"
          value={totals.clicks}
        />
      </View>

      {placements.length > 0 ? (
        <View>
          <BusinessSectionHeader
            eyebrow="Live"
            title="Active campaigns"
            description="These placements are currently boosting discovery."
            iconName="flash"
          />
          <View className="gap-3">
            {placements.map((placement) => (
              <FeaturedPlacementCard key={placement.id} placement={placement} />
            ))}
          </View>
        </View>
      ) : (
        <View className="rounded-[24px] border border-surface-strong bg-surface-card p-6">
          <Text className="text-lg font-bold text-ink-900">No active placements</Text>
          <Text className="mt-2 text-sm leading-6 text-ink-600">
            Featured placement gives your bathroom a boost on the map. Once a campaign is scheduled, impressions and clicks will appear here.
          </Text>
        </View>
      )}

      {bathrooms.length > 0 ? (
        <View>
          <BusinessSectionHeader
            eyebrow="Request a boost"
            title="Promote a location"
            description="Pick a location to start a featured placement campaign."
            iconName="trending-up"
          />
          <View className="gap-3">
            {bathrooms.map((b) => (
              <View
                key={b.bathroom_id}
                className="rounded-[24px] border border-surface-strong bg-surface-card p-5"
              >
                <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
                  {b.business_name ?? 'Managed location'}
                </Text>
                <Text className="mt-1 text-lg font-black tracking-tight text-ink-900">
                  {b.place_name}
                </Text>
                {b.has_active_featured_placement ? (
                  <View className="mt-3 self-start rounded-full bg-success/10 px-3 py-1.5">
                    <Text className="text-[11px] font-bold uppercase tracking-[1px] text-success">
                      Already running
                    </Text>
                  </View>
                ) : (
                  <Button
                    className="mt-4"
                    label="Request featured placement"
                    onPress={() => handleRequestFeatured(b.bathroom_id)}
                  />
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </BusinessScreenLayout>
  );
}
