import { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import {
  BusinessLocationCard,
  BusinessScreenLayout,
  BusinessSectionHeader,
} from '@/components/business';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useBusinessDashboard } from '@/hooks/useBusiness';
import { useBusinessCoupons } from '@/hooks/useBusinessCoupons';
import { pushSafely } from '@/lib/navigation';
import { getErrorMessage } from '@/utils/errorMap';

export default function BusinessLocationsScreen() {
  const router = useRouter();
  const dashboardQuery = useBusinessDashboard();
  const couponsQuery = useBusinessCoupons();

  const bathrooms = dashboardQuery.data?.bathrooms ?? [];
  const coupons = couponsQuery.data ?? [];

  const activeCouponCounts = useMemo(() => {
    return coupons
      .filter((coupon) => coupon.is_active)
      .reduce<Record<string, number>>((acc, coupon) => {
        acc[coupon.bathroom_id] = (acc[coupon.bathroom_id] ?? 0) + 1;
        return acc;
      }, {});
  }, [coupons]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(routes.tabs.business);
  }, [router]);

  const handleOpenLocation = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.business.location(bathroomId), routes.tabs.business);
    },
    [router]
  );

  const handleRefresh = useCallback(() => {
    void dashboardQuery.refetch();
    void couponsQuery.refetch();
  }, [couponsQuery, dashboardQuery]);

  if (dashboardQuery.isLoading) {
    return <LoadingScreen message="Loading your locations." />;
  }

  return (
    <BusinessScreenLayout
      eyebrow="My Locations"
      title="Every place you manage"
      subtitle="Tap a location to control hours, coupons, visibility, and analytics."
      iconName="business"
      onBack={handleBack}
      isRefreshing={dashboardQuery.isFetching || couponsQuery.isFetching}
      onRefresh={handleRefresh}
    >
      {dashboardQuery.error ? (
        <View className="rounded-[24px] border border-danger/20 bg-danger/10 p-5">
          <Text className="text-lg font-bold text-danger">Could not load locations</Text>
          <Text className="mt-2 text-sm leading-6 text-danger">
            {getErrorMessage(dashboardQuery.error, 'We could not load your locations right now.')}
          </Text>
          <Button className="mt-4" label="Try Again" onPress={() => void dashboardQuery.refetch()} />
        </View>
      ) : null}

      <View>
        <BusinessSectionHeader
          eyebrow={`${bathrooms.length} location${bathrooms.length === 1 ? '' : 's'}`}
          title="Managed locations"
          description="Approved bathrooms appear here as soon as a claim is reviewed."
          iconName="storefront"
        />

        {bathrooms.length > 0 ? (
          <View className="gap-4">
            {bathrooms.map((bathroom) => (
              <BusinessLocationCard
                activeCouponCount={activeCouponCounts[bathroom.bathroom_id] ?? 0}
                bathroom={bathroom}
                key={bathroom.bathroom_id}
                onPress={handleOpenLocation}
              />
            ))}
          </View>
        ) : (
          <View className="rounded-[24px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-lg font-bold text-ink-900">No locations yet</Text>
            <Text className="mt-2 text-sm leading-6 text-ink-600">
              Submit an ownership claim from a bathroom detail page to start managing it here.
            </Text>
            <Button
              className="mt-5"
              label="Browse bathrooms"
              onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
              variant="secondary"
            />
          </View>
        )}
      </View>
    </BusinessScreenLayout>
  );
}
