import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import {
  BusinessScreenLayout,
  BusinessSectionHeader,
  CouponCard,
  CouponEditorSheet,
  QuickStatTile,
} from '@/components/business';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useBusinessDashboard } from '@/hooks/useBusiness';
import {
  useBusinessCoupons,
  useCreateCoupon,
  useDeactivateCoupon,
} from '@/hooks/useBusinessCoupons';
import type { CreateCouponInput } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

export default function BusinessCouponsScreen() {
  const router = useRouter();
  const dashboardQuery = useBusinessDashboard();
  const couponsQuery = useBusinessCoupons();
  const createCouponMutation = useCreateCoupon();
  const deactivateCouponMutation = useDeactivateCoupon();

  const [editorBathroomId, setEditorBathroomId] = useState<string | null>(null);
  const [filterBathroomId, setFilterBathroomId] = useState<string | null>(null);

  const bathrooms = dashboardQuery.data?.bathrooms ?? [];
  const allCoupons = couponsQuery.data ?? [];

  const filteredCoupons = useMemo(() => {
    if (!filterBathroomId) return allCoupons;
    return allCoupons.filter((c) => c.bathroom_id === filterBathroomId);
  }, [allCoupons, filterBathroomId]);

  const activeCoupons = filteredCoupons.filter((c) => c.is_active);
  const inactiveCoupons = filteredCoupons.filter((c) => !c.is_active);

  const totals = useMemo(() => {
    return {
      total: allCoupons.length,
      active: allCoupons.filter((c) => c.is_active).length,
      redeemed: allCoupons.reduce((sum, c) => sum + (c.current_redemptions ?? 0), 0),
    };
  }, [allCoupons]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(routes.tabs.business);
  }, [router]);

  const handleCreateCoupon = useCallback(
    (input: CreateCouponInput) => {
      createCouponMutation.mutate(input, {
        onSuccess: () => setEditorBathroomId(null),
      });
    },
    [createCouponMutation]
  );

  const handleDeactivateCoupon = useCallback(
    (couponId: string) => {
      deactivateCouponMutation.mutate(couponId);
    },
    [deactivateCouponMutation]
  );

  if (couponsQuery.isLoading) {
    return <LoadingScreen message="Loading coupons." />;
  }

  return (
    <>
      <BusinessScreenLayout
        eyebrow="Promotions"
        title="Coupons & discounts"
        subtitle="Create perks customers see when they discover your bathroom in StallPass."
        iconName="pricetags"
        onBack={handleBack}
        isRefreshing={couponsQuery.isFetching}
        onRefresh={() => void couponsQuery.refetch()}
      >
        {couponsQuery.error ? (
          <View className="rounded-[24px] border border-danger/20 bg-danger/10 p-5">
            <Text className="text-lg font-bold text-danger">Could not load coupons</Text>
            <Text className="mt-2 text-sm leading-6 text-danger">
              {getErrorMessage(couponsQuery.error, 'We could not load your coupons.')}
            </Text>
          </View>
        ) : null}

        <View className="flex-row gap-3">
          <QuickStatTile
            iconName="pricetags"
            label="Total"
            tone="brand"
            value={totals.total}
          />
          <QuickStatTile
            iconName="checkmark-circle"
            label="Active"
            tone="success"
            value={totals.active}
          />
          <QuickStatTile
            iconName="cart"
            label="Redeemed"
            value={totals.redeemed}
          />
        </View>

        {bathrooms.length > 1 ? (
          <View>
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
              Filter by location
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              <View className="flex-row gap-2 px-1">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFilterBathroomId(null)}
                  className={[
                    'rounded-full border px-4 py-2',
                    filterBathroomId === null
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-surface-strong bg-surface-card',
                  ].join(' ')}
                >
                  <Text
                    className={[
                      'text-xs font-bold uppercase tracking-[1px]',
                      filterBathroomId === null ? 'text-white' : 'text-ink-700',
                    ].join(' ')}
                  >
                    All
                  </Text>
                </Pressable>
                {bathrooms.map((b) => {
                  const active = filterBathroomId === b.bathroom_id;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={b.bathroom_id}
                      onPress={() => setFilterBathroomId(b.bathroom_id)}
                      className={[
                        'rounded-full border px-4 py-2',
                        active
                          ? 'border-brand-600 bg-brand-600'
                          : 'border-surface-strong bg-surface-card',
                      ].join(' ')}
                    >
                      <Text
                        className={[
                          'text-xs font-bold',
                          active ? 'text-white' : 'text-ink-700',
                        ].join(' ')}
                      >
                        {b.place_name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <View>
          <BusinessSectionHeader
            eyebrow={`${activeCoupons.length} active`}
            title="Active coupons"
            description="Customers can see and redeem these now."
            iconName="flash"
          />
          {activeCoupons.length > 0 ? (
            <View className="gap-3">
              {activeCoupons.map((coupon) => (
                <CouponCard
                  coupon={coupon}
                  key={coupon.id}
                  onDeactivate={handleDeactivateCoupon}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-[24px] border border-surface-strong bg-surface-card p-6">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
                <Ionicons name="pricetag" size={24} color={colors.brand[600]} />
              </View>
              <Text className="mt-3 text-lg font-bold text-ink-900">No active coupons</Text>
              <Text className="mt-2 text-sm leading-5 text-ink-600">
                Pick a location below to start your first promotion. Try 10% off with StallPass, free drink with purchase, or a BOGO deal.
              </Text>
              {bathrooms.length > 0 ? (
                <View className="mt-4 gap-2">
                  {bathrooms.map((b) => (
                    <Pressable
                      accessibilityRole="button"
                      key={b.bathroom_id}
                      onPress={() => setEditorBathroomId(b.bathroom_id)}
                      className="flex-row items-center justify-between rounded-2xl border border-surface-strong bg-surface-card px-4 py-3"
                    >
                      <Text className="text-sm font-bold text-ink-900">{b.place_name}</Text>
                      <Ionicons name="add-circle" size={20} color={colors.brand[600]} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        </View>

        {inactiveCoupons.length > 0 ? (
          <View>
            <BusinessSectionHeader
              eyebrow="Archive"
              title="Inactive coupons"
              description="Past or deactivated promotions."
              iconName="archive"
            />
            <View className="gap-3">
              {inactiveCoupons.map((coupon) => (
                <CouponCard
                  coupon={coupon}
                  key={coupon.id}
                  onDeactivate={handleDeactivateCoupon}
                />
              ))}
            </View>
          </View>
        ) : null}

        {bathrooms.length > 0 ? (
          <Button
            label="New coupon"
            onPress={() => setEditorBathroomId(bathrooms[0].bathroom_id)}
          />
        ) : null}
      </BusinessScreenLayout>

      <CouponEditorSheet
        bathroomId={editorBathroomId}
        isSubmitting={createCouponMutation.isPending}
        onClose={() => setEditorBathroomId(null)}
        onSubmit={handleCreateCoupon}
        visible={editorBathroomId !== null}
      />
    </>
  );
}
