import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import {
  ActionTile,
  BusinessHoursEditorSheet,
  BusinessScreenLayout,
  BusinessSectionHeader,
  CouponCard,
  CouponEditorSheet,
  QuickStatTile,
} from '@/components/business';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import {
  useBusinessBathroomSettings,
  useBusinessDashboard,
  useUpdateBusinessBathroomSettings,
} from '@/hooks/useBusiness';
import {
  useBusinessCoupons,
  useCreateCoupon,
  useDeactivateCoupon,
} from '@/hooks/useBusinessCoupons';
import { useBusinessVisitStats } from '@/hooks/useStallPassVisits';
import { useToast } from '@/hooks/useToast';
import { pushSafely } from '@/lib/navigation';
import type {
  BusinessDashboardBathroom,
  CreateCouponInput,
  UpdateBusinessBathroomSettingsInput,
} from '@/types';
import { getBathroomRouteConversionPercent } from '@/utils/business-dashboard';
import { getErrorMessage } from '@/utils/errorMap';

function ToggleRow({
  label,
  description,
  value,
  onChange,
  iconName,
  disabled = false,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
  iconName: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      className={[
        'flex-row items-start gap-3 rounded-2xl border p-4',
        value ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      <View
        className={[
          'h-10 w-10 items-center justify-center rounded-xl',
          value ? 'bg-brand-600' : 'bg-surface-base',
        ].join(' ')}
      >
        <Ionicons
          name={iconName}
          size={18}
          color={value ? '#ffffff' : colors.ink[600]}
        />
      </View>
      <View className="flex-1">
        <Text className={['text-base font-bold', value ? 'text-brand-900' : 'text-ink-900'].join(' ')}>
          {label}
        </Text>
        <Text className="mt-1 text-xs leading-5 text-ink-600">{description}</Text>
      </View>
      <View
        className={[
          'h-7 w-12 items-center justify-center rounded-full px-1',
          value ? 'bg-brand-600' : 'bg-surface-strong',
        ].join(' ')}
      >
        <View
          className={[
            'h-5 w-5 rounded-full bg-white',
            value ? 'self-end' : 'self-start',
          ].join(' ')}
        />
      </View>
    </Pressable>
  );
}

export default function BusinessLocationDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const bathroomId = params.id ?? '';
  const { showToast } = useToast();

  const dashboardQuery = useBusinessDashboard();
  const couponsQuery = useBusinessCoupons();
  const settingsQuery = useBusinessBathroomSettings(bathroomId || null);
  const settingsMutation = useUpdateBusinessBathroomSettings();
  const visitStatsQuery = useBusinessVisitStats();
  const createCouponMutation = useCreateCoupon();
  const deactivateCouponMutation = useDeactivateCoupon();

  const [isHoursOpen, setHoursOpen] = useState(false);
  const [isCouponOpen, setCouponOpen] = useState(false);

  const bathroom: BusinessDashboardBathroom | undefined = useMemo(
    () => dashboardQuery.data?.bathrooms.find((b) => b.bathroom_id === bathroomId),
    [bathroomId, dashboardQuery.data?.bathrooms]
  );

  const visitStats = useMemo(
    () => visitStatsQuery.data?.find((stats) => stats.bathroom_id === bathroomId),
    [bathroomId, visitStatsQuery.data]
  );

  const coupons = useMemo(
    () => (couponsQuery.data ?? []).filter((c) => c.bathroom_id === bathroomId),
    [bathroomId, couponsQuery.data]
  );

  const activeCoupons = coupons.filter((c) => c.is_active);

  const [draft, setDraft] = useState<UpdateBusinessBathroomSettingsInput>({
    bathroom_id: bathroomId,
    requires_premium_access: false,
    show_on_free_map: true,
    is_location_verified: false,
  });

  useEffect(() => {
    if (!bathroom) return;
    const source = settingsQuery.data;
    setDraft({
      bathroom_id: bathroom.bathroom_id,
      requires_premium_access: source?.requires_premium_access ?? bathroom.requires_premium_access,
      show_on_free_map: source?.show_on_free_map ?? bathroom.show_on_free_map,
      is_location_verified: source?.is_location_verified ?? bathroom.is_location_verified,
    });
  }, [bathroom, settingsQuery.data]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(routes.business.locations);
  }, [router]);

  const handleSaveSettings = useCallback(async () => {
    if (!bathroom) return;
    try {
      await settingsMutation.mutateAsync({
        ...draft,
        show_on_free_map: draft.requires_premium_access ? draft.show_on_free_map : true,
      });
      showToast({
        title: 'Settings saved',
        message: `Updated map visibility for ${bathroom.place_name}.`,
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Save failed',
        message: getErrorMessage(error, 'Unable to save these settings right now.'),
        variant: 'error',
      });
    }
  }, [bathroom, draft, settingsMutation, showToast]);

  const handleCreateCoupon = useCallback(
    (input: CreateCouponInput) => {
      createCouponMutation.mutate(input, {
        onSuccess: () => setCouponOpen(false),
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

  const handleOpenBathroom = useCallback(() => {
    if (!bathroomId) return;
    pushSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.business);
  }, [bathroomId, router]);

  const handleRequestFeatured = useCallback(() => {
    if (!bathroomId) return;
    pushSafely(router, routes.modal.requestFeaturedBathroom(bathroomId), routes.tabs.business);
  }, [bathroomId, router]);

  if (dashboardQuery.isLoading) {
    return <LoadingScreen message="Loading location details." />;
  }

  if (!bathroom) {
    return (
      <BusinessScreenLayout
        eyebrow="Location not found"
        title="We couldn't find that location"
        subtitle="It may have been removed or you don't have access to manage it."
        iconName="alert-circle"
        onBack={handleBack}
        variant="dark"
      >
        <Button label="Back to locations" onPress={handleBack} />
      </BusinessScreenLayout>
    );
  }

  const routePercent = getBathroomRouteConversionPercent(bathroom);
  const visibilityLabel =
    bathroom.requires_premium_access && !bathroom.show_on_free_map
      ? 'Premium map only'
      : bathroom.requires_premium_access
        ? 'Premium + Free'
        : 'Public map';

  return (
    <>
      <BusinessScreenLayout
        eyebrow={bathroom.business_name ?? 'Managed location'}
        title={bathroom.place_name}
        subtitle="Direct control over how this location appears in StallPass."
        iconName="storefront"
        onBack={handleBack}
        isRefreshing={dashboardQuery.isFetching}
        onRefresh={() => void dashboardQuery.refetch()}
        rightSlot={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View public bathroom"
            onPress={handleOpenBathroom}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Ionicons name="open-outline" size={20} color="#ffffff" />
          </Pressable>
        }
      >
        {/* Status chips */}
        <View className="flex-row flex-wrap gap-2">
          <View className="rounded-full bg-brand-50 px-3 py-2">
            <Text className="text-[11px] font-bold uppercase tracking-[1px] text-brand-700">
              {visibilityLabel}
            </Text>
          </View>
          <View
            className={[
              'rounded-full px-3 py-2',
              bathroom.is_location_verified ? 'bg-success/10' : 'bg-surface-base',
            ].join(' ')}
          >
            <Text
              className={[
                'text-[11px] font-bold uppercase tracking-[1px]',
                bathroom.is_location_verified ? 'text-success' : 'text-ink-600',
              ].join(' ')}
            >
              {bathroom.is_location_verified ? 'Location verified' : 'Location pending'}
            </Text>
          </View>
          {bathroom.pricing_plan === 'lifetime' ? (
            <View className="rounded-full bg-ink-900 px-3 py-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-white">
                Lifetime access
              </Text>
            </View>
          ) : null}
          {bathroom.has_active_featured_placement ? (
            <View className="rounded-full bg-warning/15 px-3 py-2">
              <Text className="text-[11px] font-bold uppercase tracking-[1px] text-warning">
                {bathroom.active_featured_placements} featured
              </Text>
            </View>
          ) : null}
        </View>

        {/* Performance overview */}
        <View>
          <BusinessSectionHeader
            eyebrow="This week"
            title="How this location is performing"
            description="Discovery, engagement, and trust metrics from StallPass."
            iconName="trending-up"
          />
          <View className="gap-3">
            <View className="flex-row gap-3">
              <QuickStatTile
                iconName="eye"
                label="Weekly views"
                tone="brand"
                value={bathroom.weekly_views}
              />
              <QuickStatTile
                iconName="navigate"
                label="Route rate"
                tone="brand"
                value={`${routePercent}%`}
              />
            </View>
            <View className="flex-row gap-3">
              <QuickStatTile
                iconName="people"
                label="Visitors"
                value={bathroom.weekly_unique_visitors}
                helper="unique this week"
              />
              <QuickStatTile
                iconName="map"
                label="Route opens"
                value={bathroom.weekly_navigation_count}
              />
            </View>
            <View className="flex-row gap-3">
              <QuickStatTile
                iconName="alert-circle"
                label="Open issues"
                tone={bathroom.open_reports > 0 ? 'danger' : 'success'}
                value={bathroom.open_reports}
              />
              <QuickStatTile
                iconName="sparkles"
                label="Cleanliness"
                value={bathroom.avg_cleanliness.toFixed(1)}
                helper={`${bathroom.total_ratings} ratings`}
              />
            </View>
            <View className="flex-row gap-3">
              <QuickStatTile
                iconName="bookmark"
                label="Map saves"
                value={bathroom.total_favorites}
              />
              <QuickStatTile
                iconName="pricetags"
                label="Active offers"
                value={bathroom.active_offer_count}
              />
            </View>
            {visitStats ? (
              <View className="flex-row gap-3">
                <QuickStatTile
                  iconName="bar-chart"
                  label="StallPass visits"
                  helper="Customers we sent your way"
                  value={visitStats.visits_this_month}
                />
                <QuickStatTile
                  iconName="people-circle"
                  label="Unique visitors"
                  helper="Total reach this period"
                  value={visitStats.unique_visitors}
                />
              </View>
            ) : null}
          </View>
        </View>

        {/* Quick actions */}
        <View>
          <BusinessSectionHeader
            eyebrow="Quick actions"
            title="Manage this location"
            description="One-tap shortcuts for the most-used controls."
            iconName="flash"
          />
          <View className="gap-3">
            <View className="flex-row gap-3">
              <ActionTile
                iconName="time"
                onPress={() => setHoursOpen(true)}
                subtitle="Update or sync from Google"
                title="Hours"
                tone="brand"
              />
              <ActionTile
                iconName="pricetags"
                badge={activeCoupons.length || undefined}
                onPress={() => setCouponOpen(true)}
                subtitle="Add a discount or perk"
                title="New coupon"
                tone="neutral"
              />
            </View>
            <View className="flex-row gap-3">
              <ActionTile
                iconName="star"
                disabled={bathroom.has_active_featured_placement}
                onPress={handleRequestFeatured}
                subtitle={
                  bathroom.has_active_featured_placement
                    ? 'Already running'
                    : 'Boost on the map'
                }
                title="Featured spot"
                tone="warning"
              />
              <ActionTile
                iconName="open-outline"
                onPress={handleOpenBathroom}
                subtitle="See the customer view"
                title="Public page"
                tone="neutral"
              />
            </View>
          </View>
        </View>

        {/* StallPass parameters */}
        <View>
          <BusinessSectionHeader
            eyebrow="StallPass parameters"
            title="Visibility & verification"
            description="Control exactly how customers find and trust this location."
            iconName="settings"
          />
          <View className="gap-3">
            <ToggleRow
              description="Hide from the free map and reserve discovery for premium members."
              iconName="diamond"
              label="Premium-only listing"
              onChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  requires_premium_access: next,
                  show_on_free_map: next ? prev.show_on_free_map : true,
                }))
              }
              value={draft.requires_premium_access}
            />
            <ToggleRow
              description="Even when premium-only, keep this location visible on the free map too."
              disabled={!draft.requires_premium_access}
              iconName="globe"
              label="Also show on free map"
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, show_on_free_map: next }))
              }
              value={draft.requires_premium_access ? draft.show_on_free_map : true}
            />
            <ToggleRow
              description="Confirm the saved address and pin coordinates are accurate."
              iconName="checkmark-circle"
              label="Location verified"
              onChange={(next) =>
                setDraft((prev) => ({ ...prev, is_location_verified: next }))
              }
              value={draft.is_location_verified}
            />
          </View>
          {settingsQuery.error ? (
            <Text className="mt-3 text-sm leading-5 text-danger">
              {getErrorMessage(settingsQuery.error, 'Unable to load the latest settings.')}
            </Text>
          ) : null}
          <Button
            className="mt-4"
            label="Save StallPass parameters"
            loading={settingsMutation.isPending}
            onPress={() => void handleSaveSettings()}
          />
        </View>

        {/* Coupons */}
        <View>
          <BusinessSectionHeader
            eyebrow="Promotions"
            title="Coupons & discounts"
            description="Active perks customers see on this bathroom's detail page."
            iconName="pricetags"
            actionLabel="New"
            onAction={() => setCouponOpen(true)}
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
            <View className="rounded-[24px] border border-surface-strong bg-surface-card p-5">
              <Text className="text-base font-bold text-ink-900">No active coupons</Text>
              <Text className="mt-2 text-sm leading-5 text-ink-600">
                Add a discount or perk to give StallPass users a reason to stop in. Popular ideas: 10% off when showing StallPass, free drink with purchase, or BOGO.
              </Text>
              <Button
                className="mt-4"
                label="Create your first coupon"
                onPress={() => setCouponOpen(true)}
                variant="secondary"
              />
            </View>
          )}
        </View>
      </BusinessScreenLayout>

      <BusinessHoursEditorSheet
        bathroomId={isHoursOpen ? bathroomId : null}
        onClose={() => setHoursOpen(false)}
        visible={isHoursOpen}
      />

      <CouponEditorSheet
        bathroomId={isCouponOpen ? bathroomId : null}
        isSubmitting={createCouponMutation.isPending}
        onClose={() => setCouponOpen(false)}
        onSubmit={handleCreateCoupon}
        visible={isCouponOpen}
      />
    </>
  );
}
