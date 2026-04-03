import { useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import {
  BusinessHoursEditorSheet,
  CouponCard,
  CouponEditorSheet,
  DashboardStats,
  EarlyAdopterBanner,
  FeaturedPlacementCard,
  ManagedBathroomSection,
  VisitAnalyticsCard,
} from '@/components/business';
import { LoadingScreen } from '@/components/LoadingScreen';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessDashboard, useBusinessFeaturedPlacements } from '@/hooks/useBusiness';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { useBusinessCoupons, useCreateCoupon, useDeactivateCoupon } from '@/hooks/useBusinessCoupons';
import { useEarlyAdopterInvites, useGenerateInvite } from '@/hooks/useEarlyAdopterInvite';
import { useBusinessVisitStats } from '@/hooks/useStallPassVisits';
import { pushSafely } from '@/lib/navigation';
import { useBusinessStore } from '@/store/useBusinessStore';
import type { BusinessClaimListItem, BusinessClaimStatus, CreateCouponInput } from '@/types';
import { getErrorMessage } from '@/utils/errorMap';

const STATUS_META: Record<
  BusinessClaimStatus,
  {
    label: string;
    badgeClassName: string;
    badgeLabelClassName: string;
    body: string;
  }
> = {
  pending: {
    label: 'Pending review',
    badgeClassName: 'border border-warning/20 bg-warning/10',
    badgeLabelClassName: 'text-warning',
    body: 'Your ownership claim is queued for moderator review. Analytics unlock as soon as this location is approved.',
  },
  approved: {
    label: 'Approved',
    badgeClassName: 'border border-success/20 bg-success/10',
    badgeLabelClassName: 'text-success',
    body: 'This location is approved and can now be managed through the business dashboard.',
  },
  rejected: {
    label: 'Needs changes',
    badgeClassName: 'border border-danger/20 bg-danger/10',
    badgeLabelClassName: 'text-danger',
    body: 'This claim was rejected. Review the details, gather stronger evidence, and resubmit when ready.',
  },
};

function formatClaimDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View className="flex-1 rounded-2xl border border-surface-strong bg-surface-card px-4 py-4">
      <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">{label}</Text>
      <Text className="mt-2 text-3xl font-black tracking-tight text-ink-900">{value}</Text>
    </View>
  );
}

function ClaimStatusCard({
  claim,
  onOpenBathroom,
  onResubmitClaim,
}: {
  claim: BusinessClaimListItem;
  onOpenBathroom: (bathroomId: string) => void;
  onResubmitClaim: (bathroomId: string) => void;
}) {
  const statusMeta = STATUS_META[claim.review_status];

  return (
    <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Claimed Business</Text>
          <Text className="mt-2 text-2xl font-bold text-ink-900">{claim.business_name}</Text>
          <Text className="mt-2 text-base leading-6 text-ink-600">
            {claim.bathroom?.place_name ?? 'Bathroom details unavailable'}
          </Text>
        </View>
        <View className={['rounded-full px-3 py-2', statusMeta.badgeClassName].join(' ')}>
          <Text
            className={[
              'text-xs font-semibold uppercase tracking-[1px]',
              statusMeta.badgeLabelClassName,
            ].join(' ')}
          >
            {statusMeta.label}
          </Text>
        </View>
      </View>

      <Text className="mt-4 text-sm leading-6 text-ink-600">{statusMeta.body}</Text>

      {claim.is_lifetime_free ? (
        <View className="mt-3 rounded-full bg-success/10 px-3 py-2 self-start">
          <Text className="text-xs font-bold uppercase text-success">Lifetime Free</Text>
        </View>
      ) : null}

      <View className="mt-4 rounded-2xl bg-surface-base px-4 py-4">
        <Text className="text-xs font-semibold uppercase tracking-[1px] text-ink-500">Bathroom</Text>
        <Text className="mt-2 text-base font-semibold text-ink-900">
          {claim.bathroom?.place_name ?? `Bathroom ${claim.bathroom_id}`}
        </Text>
        <Text className="mt-1 text-sm leading-5 text-ink-600">
          {claim.bathroom?.address ?? 'This bathroom is no longer visible in the public directory.'}
        </Text>
      </View>

      <Text className="mt-4 text-xs font-medium uppercase tracking-[1px] text-ink-500">
        Submitted {formatClaimDate(claim.created_at)}
      </Text>

      <View className="mt-4 gap-3">
        <Button
          label="Open Bathroom"
          onPress={() => onOpenBathroom(claim.bathroom_id)}
          variant="secondary"
        />
        {claim.review_status === 'rejected' ? (
          <Button label="Resubmit Claim" onPress={() => onResubmitClaim(claim.bathroom_id)} />
        ) : null}
      </View>
    </View>
  );
}

export default function BusinessTab() {
  const router = useRouter();
  const { isGuest, profile } = useAuth();
  const {
    claims,
    counts,
    error: claimsError,
    isFetching: isClaimsFetching,
    isLoading: isClaimsLoading,
    refetch: refetchClaims,
  } = useBusinessClaims();
  const {
    isHoursEditorOpen,
    isCouponEditorOpen,
    selectedBathroomId,
    couponEditorBathroomId,
    openHoursEditor,
    closeHoursEditor,
    openCouponEditor,
    closeCouponEditor,
    reset: resetBusinessStore,
  } = useBusinessStore();

  const isAdmin = profile?.role === 'admin';
  const hasDashboardAccess = profile?.role === 'business' || isAdmin || counts.approved > 0;

  const dashboardQuery = useBusinessDashboard({
    enabled: !isGuest && !isClaimsLoading && hasDashboardAccess,
  });
  const featuredPlacementsQuery = useBusinessFeaturedPlacements({
    enabled: !isGuest && !isClaimsLoading && hasDashboardAccess,
  });
  const visitStatsQuery = useBusinessVisitStats({
    enabled: !isGuest && !isClaimsLoading && hasDashboardAccess,
  });
  const couponsQuery = useBusinessCoupons({
    enabled: !isGuest && !isClaimsLoading && hasDashboardAccess,
  });
  const invitesQuery = useEarlyAdopterInvites(undefined, {
    enabled: !isGuest && isAdmin,
  });

  const createCouponMutation = useCreateCoupon();
  const deactivateCouponMutation = useDeactivateCoupon();
  const generateInviteMutation = useGenerateInvite();

  useEffect(() => {
    if (isGuest) {
      resetBusinessStore();
    }
  }, [isGuest, resetBusinessStore]);

  const headerCopy = useMemo(() => {
    if (hasDashboardAccess && (dashboardQuery.data?.bathrooms.length ?? 0) > 0) {
      return {
        eyebrow: 'Business Dashboard',
        title: 'Run your claimed bathrooms with live analytics.',
        body: 'Manage hours, coupons, map visibility, and track how many customers StallPass sends your way.',
      };
    }

    if (counts.pending > 0 || counts.approved > 0 || counts.rejected > 0) {
      return {
        eyebrow: 'Business Portal',
        title: 'Track claim review and unlock management tools.',
        body: 'Claim history stays visible here while approved locations graduate into the analytics dashboard.',
      };
    }

    return {
      eyebrow: 'Business Portal',
      title: 'Claim bathrooms and manage the trusted surface customers see.',
      body: 'Once your first ownership claim is approved, this tab turns into the operating console for that location.',
    };
  }, [counts.approved, counts.pending, counts.rejected, dashboardQuery.data?.bathrooms.length, hasDashboardAccess]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchClaims(),
      hasDashboardAccess ? dashboardQuery.refetch() : Promise.resolve(),
      hasDashboardAccess ? featuredPlacementsQuery.refetch() : Promise.resolve(),
      hasDashboardAccess ? visitStatsQuery.refetch() : Promise.resolve(),
      hasDashboardAccess ? couponsQuery.refetch() : Promise.resolve(),
      isAdmin ? invitesQuery.refetch() : Promise.resolve(),
    ]);
  }, [
    couponsQuery, dashboardQuery, featuredPlacementsQuery, hasDashboardAccess,
    invitesQuery, isAdmin, refetchClaims, visitStatsQuery,
  ]);

  const handleRequestFeatured = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.modal.requestFeaturedBathroom(bathroomId), routes.tabs.business);
    },
    [router],
  );

  const handleOpenBathroom = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.bathroomDetail(bathroomId), routes.tabs.business);
    },
    [router]
  );

  const handleResubmitClaim = useCallback(
    (bathroomId: string) => {
      pushSafely(router, routes.modal.claimBusinessBathroom(bathroomId), routes.tabs.business);
    },
    [router]
  );

  const handleCreateCoupon = useCallback(
    (input: CreateCouponInput) => {
      createCouponMutation.mutate(input, {
        onSuccess: () => {
          closeCouponEditor();
        },
      });
    },
    [closeCouponEditor, createCouponMutation]
  );

  const handleDeactivateCoupon = useCallback(
    (couponId: string) => {
      deactivateCouponMutation.mutate(couponId);
    },
    [deactivateCouponMutation]
  );

  const managedBathrooms = dashboardQuery.data?.bathrooms ?? [];
  const placements = featuredPlacementsQuery.data ?? [];
  const visitStats = visitStatsQuery.data ?? [];
  const coupons = couponsQuery.data ?? [];
  const invites = invitesQuery.data ?? [];
  const activeCoupons = coupons.filter((c) => c.is_active);
  const activeCouponCountsByBathroom = useMemo(() => {
    return activeCoupons.reduce<Record<string, number>>((counts, coupon) => {
      counts[coupon.bathroom_id] = (counts[coupon.bathroom_id] ?? 0) + 1;
      return counts;
    }, {});
  }, [activeCoupons]);
  const dashboardError = dashboardQuery.error;
  const featuredPlacementsError = featuredPlacementsQuery.error;
  const isRefreshing =
    isClaimsFetching ||
    dashboardQuery.isFetching ||
    featuredPlacementsQuery.isFetching ||
    visitStatsQuery.isFetching ||
    couponsQuery.isFetching;

  if (isGuest) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
        <View className="flex-1 px-6 py-8">
          <View className="rounded-[32px] bg-ink-900 px-6 py-8">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/70">Business Portal</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">Sign in to track business claims.</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">
              Ownership claims, verification badges, and paid placement inventory are account-scoped and managed from this portal.
            </Text>
          </View>

          <View className="mt-6 rounded-[32px] border border-surface-strong bg-surface-card p-6">
            <Text className="text-base leading-6 text-ink-600">
              Start from a bathroom detail screen, open the claim flow, and this tab will track review status until your dashboard goes live.
            </Text>
            <Button
              className="mt-6"
              label="Sign In"
              onPress={() => pushSafely(router, routes.auth.login, routes.auth.login)}
            />
            <Button
              className="mt-3"
              label="Create Account"
              onPress={() => pushSafely(router, routes.auth.register, routes.auth.register)}
              variant="secondary"
            />
            <Button
              className="mt-3"
              label="Browse Bathrooms"
              onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
              variant="ghost"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (isClaimsLoading) {
    return <LoadingScreen message="Loading your business claims and dashboard access." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} />}
      >
        <View className="px-6 py-8">
          {/* Header */}
          <View className="rounded-[32px] bg-brand-600 px-6 py-8">
            <Text className="text-sm font-semibold uppercase tracking-[1px] text-white/80">{headerCopy.eyebrow}</Text>
            <Text className="mt-3 text-4xl font-black tracking-tight text-white">{headerCopy.title}</Text>
            <Text className="mt-3 text-base leading-6 text-white/80">{headerCopy.body}</Text>
          </View>

          {/* Claim Summary */}
          <View className="mt-6 flex-row gap-3">
            <SummaryCard label="Pending" value={counts.pending} />
            <SummaryCard label="Approved" value={counts.approved} />
            <SummaryCard label="Needs Changes" value={counts.rejected} />
          </View>

          {/* Error State */}
          {claimsError ? (
            <View className="mt-6 rounded-[28px] border border-danger/20 bg-danger/10 p-5">
              <Text className="text-xl font-bold text-danger">Business portal unavailable</Text>
              <Text className="mt-2 text-sm leading-6 text-danger">
                {getErrorMessage(claimsError, 'We could not load your ownership claims right now.')}
              </Text>
              <Button className="mt-5" label="Try Again" loading={isRefreshing} onPress={() => void handleRefresh()} />
            </View>
          ) : null}

          {/* Dashboard Content */}
          {hasDashboardAccess ? (
            <View className="mt-6 gap-4">
              {dashboardError ? (
                <View className="rounded-[28px] border border-warning/20 bg-warning/10 p-5">
                  <Text className="text-xl font-bold text-warning">Dashboard data delayed</Text>
                  <Text className="mt-2 text-sm leading-6 text-warning">
                    {getErrorMessage(dashboardError, 'Your claim history is available, but analytics could not be refreshed right now.')}
                  </Text>
                  <Button
                    className="mt-5"
                    label="Retry Analytics"
                    onPress={() => void dashboardQuery.refetch()}
                    variant="secondary"
                  />
                </View>
              ) : null}

              {/* Dashboard Stats */}
              {dashboardQuery.data ? <DashboardStats summary={dashboardQuery.data.summary} /> : null}

              {/* StallPass Visit Analytics */}
              {visitStats.length > 0 ? (
                <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
                  <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">
                    StallPass Visit Analytics
                  </Text>
                  <Text className="mt-2 text-sm leading-5 text-ink-600">
                    How many customers StallPass is sending to your business.
                  </Text>
                  <View className="mt-4 gap-3">
                    {visitStats.map((stats) => (
                      <VisitAnalyticsCard key={stats.bathroom_id} stats={stats} />
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Managed Locations with Free Map Toggle */}
              <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Managed Locations</Text>
                {managedBathrooms.length ? (
                  <View className="mt-4 gap-4">
                    {managedBathrooms.map((bathroom) => (
                      <ManagedBathroomSection
                        activeCouponCount={activeCouponCountsByBathroom[bathroom.bathroom_id] ?? 0}
                        bathroom={bathroom}
                        key={bathroom.bathroom_id}
                        onOpenCouponEditor={openCouponEditor}
                        onManageHours={openHoursEditor}
                        onOpenBathroom={handleOpenBathroom}
                        onRequestFeatured={handleRequestFeatured}
                      />
                    ))}
                  </View>
                ) : (
                  <View className="mt-4 rounded-2xl bg-surface-base px-4 py-5">
                    <Text className="text-base font-semibold text-ink-900">No approved bathrooms yet</Text>
                    <Text className="mt-2 text-sm leading-6 text-ink-600">
                      Claims show up below immediately. Analytics appear here as soon as the first location is approved.
                    </Text>
                  </View>
                )}
              </View>

              {/* Coupons & Discounts */}
              <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">
                  Coupons & Discounts
                </Text>
                <Text className="mt-2 text-sm leading-5 text-ink-600">
                  Create coupons for StallPass users to incentivize visits. Premium users see these on your bathroom detail screen.
                </Text>
                {activeCoupons.length > 0 ? (
                  <View className="mt-4 gap-3">
                    {activeCoupons.map((coupon) => (
                      <CouponCard
                        coupon={coupon}
                        key={coupon.id}
                        onDeactivate={handleDeactivateCoupon}
                      />
                    ))}
                  </View>
                ) : (
                  <View className="mt-4 rounded-2xl bg-surface-base px-4 py-5">
                    <Text className="text-base font-semibold text-ink-900">No active coupons</Text>
                    <Text className="mt-2 text-sm leading-6 text-ink-600">
                      Create your first coupon from a managed location above. Popular ideas: 10% off when showing StallPass, free drink with purchase, or BOGO deals.
                    </Text>
                  </View>
                )}
              </View>

              {/* Featured Placements */}
              <View className="rounded-[28px] border border-surface-strong bg-surface-card p-5">
                <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Featured Placements</Text>
                {featuredPlacementsError ? (
                  <Text className="mt-4 text-sm leading-6 text-danger">
                    {getErrorMessage(featuredPlacementsError, 'Featured placement data is temporarily unavailable.')}
                  </Text>
                ) : placements.length ? (
                  <View className="mt-4 gap-4">
                    {placements.map((placement) => (
                      <FeaturedPlacementCard key={placement.id} placement={placement} />
                    ))}
                  </View>
                ) : (
                  <View className="mt-4 rounded-2xl bg-surface-base px-4 py-5">
                    <Text className="text-base font-semibold text-ink-900">No active placements</Text>
                    <Text className="mt-2 text-sm leading-6 text-ink-600">
                      Featured placement inventory is empty for this account right now. Once a campaign is scheduled, impressions and clicks will appear here.
                    </Text>
                  </View>
                )}
              </View>

              {/* Early Adopter Program (Admin only) */}
              {isAdmin ? (
                <EarlyAdopterBanner
                  invites={invites}
                  isGenerating={generateInviteMutation.isPending}
                  onGenerate={(input) => generateInviteMutation.mutate(input)}
                />
              ) : null}
            </View>
          ) : null}

          {/* Empty State */}
          {!claimsError && !claims.length ? (
            <View className="mt-6 rounded-[28px] border border-surface-strong bg-surface-card p-6">
              <Text className="text-2xl font-bold text-ink-900">No ownership claims yet</Text>
              <Text className="mt-3 text-base leading-6 text-ink-600">
                Open any bathroom detail screen from the map or search tab to submit your first claim.
              </Text>
              <View className="mt-6 gap-3">
                <Button
                  label="Open Map"
                  onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
                />
                <Button
                  label="Search Bathrooms"
                  onPress={() => pushSafely(router, routes.tabs.search, routes.tabs.map)}
                  variant="secondary"
                />
              </View>
            </View>
          ) : null}

          {/* Claim History */}
          {!claimsError && claims.length ? (
            <View className="mt-6 gap-4">
              <Text className="text-sm font-semibold uppercase tracking-[1px] text-ink-500">Claim History</Text>
              {claims.map((claim) => (
                <ClaimStatusCard
                  claim={claim}
                  key={claim.id}
                  onOpenBathroom={handleOpenBathroom}
                  onResubmitClaim={handleResubmitClaim}
                />
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Hours Editor Sheet */}
      <BusinessHoursEditorSheet
        bathroomId={selectedBathroomId}
        onClose={closeHoursEditor}
        visible={isHoursEditorOpen}
      />

      {/* Coupon Editor Sheet */}
      <CouponEditorSheet
        bathroomId={couponEditorBathroomId}
        isSubmitting={createCouponMutation.isPending}
        onClose={closeCouponEditor}
        onSubmit={handleCreateCoupon}
        visible={isCouponEditorOpen}
      />
    </SafeAreaView>
  );
}
