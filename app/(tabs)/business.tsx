import { useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import {
  ActionTile,
  BusinessHeroHeader,
  BusinessLocationCard,
  BusinessNavCard,
  BusinessSectionHeader,
  EarlyAdopterBanner,
  QuickStatTile,
} from '@/components/business';
import { LoadingScreen } from '@/components/LoadingScreen';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessDashboard, useBusinessFeaturedPlacements } from '@/hooks/useBusiness';
import { useBusinessClaims } from '@/hooks/useBusinessClaims';
import { useBusinessCoupons } from '@/hooks/useBusinessCoupons';
import { useEarlyAdopterInvites, useGenerateInvite } from '@/hooks/useEarlyAdopterInvite';
import { useBusinessVisitStats } from '@/hooks/useStallPassVisits';
import { pushSafely } from '@/lib/navigation';
import { useBusinessStore } from '@/store/useBusinessStore';
import { getErrorMessage } from '@/utils/errorMap';

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
  const { reset: resetBusinessStore } = useBusinessStore();

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

  const generateInviteMutation = useGenerateInvite();

  useEffect(() => {
    if (isGuest) {
      resetBusinessStore();
    }
  }, [isGuest, resetBusinessStore]);

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
    couponsQuery,
    dashboardQuery,
    featuredPlacementsQuery,
    hasDashboardAccess,
    invitesQuery,
    isAdmin,
    refetchClaims,
    visitStatsQuery,
  ]);

  const goTo = useCallback(
    (route: Parameters<typeof pushSafely>[1]) => {
      pushSafely(router, route, routes.tabs.business);
    },
    [router]
  );

  const managedBathrooms = dashboardQuery.data?.bathrooms ?? [];
  const summary = dashboardQuery.data?.summary;
  const visitStats = visitStatsQuery.data ?? [];
  const coupons = couponsQuery.data ?? [];
  const placements = featuredPlacementsQuery.data ?? [];
  const invites = invitesQuery.data ?? [];

  const activeCouponCount = coupons.filter((c) => c.is_active).length;
  const activeCouponsByBathroom = useMemo(() => {
    return coupons
      .filter((c) => c.is_active)
      .reduce<Record<string, number>>((acc, coupon) => {
        acc[coupon.bathroom_id] = (acc[coupon.bathroom_id] ?? 0) + 1;
        return acc;
      }, {});
  }, [coupons]);

  const activePlacementCount = placements.filter((p) => p.status === 'active').length;

  const totalStallPassVisits = useMemo(
    () => visitStats.reduce((sum, stat) => sum + (stat.visits_this_month ?? 0), 0),
    [visitStats]
  );

  const isRefreshing =
    isClaimsFetching ||
    dashboardQuery.isFetching ||
    featuredPlacementsQuery.isFetching ||
    visitStatsQuery.isFetching ||
    couponsQuery.isFetching;

  // Guest view
  if (isGuest) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
        <ScrollView className="flex-1">
          <View className="px-5 pb-10 pt-6">
            <BusinessHeroHeader
              eyebrow="Business Portal"
              title="Run your bathroom like a real listing."
              subtitle="Sign in to claim ownership, set hours, manage coupons, and track who StallPass sends to your front door."
              iconName="business"
              variant="dark"
            />

            <View className="mt-6 gap-4">
              <View className="flex-row gap-3">
                <QuickStatTile
                  iconName="storefront"
                  label="Manage"
                  tone="brand"
                  value="Locations"
                  helper="Hours, photos, visibility"
                />
                <QuickStatTile
                  iconName="pricetags"
                  label="Promote"
                  value="Coupons"
                  helper="Win premium customers"
                />
              </View>
              <View className="flex-row gap-3">
                <QuickStatTile
                  iconName="bar-chart"
                  label="Track"
                  value="Analytics"
                  helper="Routes, reach, ratings"
                />
                <QuickStatTile
                  iconName="star"
                  label="Boost"
                  value="Featured"
                  helper="Top of the map"
                />
              </View>
            </View>

            <View className="mt-6 rounded-[24px] border border-surface-strong bg-surface-card p-6">
              <Text className="text-base leading-6 text-ink-700">
                Open any bathroom from the map and tap <Text className="font-bold">Claim this business</Text> — we'll guide you through verification and your dashboard goes live as soon as it's approved.
              </Text>
              <Button
                className="mt-5"
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
                label="Browse bathrooms"
                onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
                variant="ghost"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isClaimsLoading) {
    return <LoadingScreen message="Loading your business hub." />;
  }

  // No dashboard access — show onboarding hub
  if (!hasDashboardAccess) {
    return (
      <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} />
          }
        >
          <View className="px-5 pb-10 pt-6">
            <BusinessHeroHeader
              eyebrow="Business Portal"
              title={
                counts.pending > 0
                  ? "Your claim is in review."
                  : counts.rejected > 0
                    ? "Let's get that claim back on track."
                    : 'Claim a bathroom to unlock your dashboard.'
              }
              subtitle={
                counts.pending > 0
                  ? "We'll notify you the moment a moderator approves it. Your full operating console goes live right after."
                  : counts.rejected > 0
                    ? 'Review the rejection notes, gather stronger evidence, and resubmit when you are ready.'
                    : 'Submit an ownership claim from any bathroom detail page to start managing it like a real listing.'
              }
              iconName="business"
            />

            {claimsError ? (
              <View className="mt-6 rounded-[24px] border border-danger/20 bg-danger/10 p-5">
                <Text className="text-lg font-bold text-danger">Business portal unavailable</Text>
                <Text className="mt-2 text-sm leading-6 text-danger">
                  {getErrorMessage(claimsError, 'We could not load your ownership claims.')}
                </Text>
                <Button
                  className="mt-4"
                  label="Try Again"
                  loading={isRefreshing}
                  onPress={() => void handleRefresh()}
                />
              </View>
            ) : null}

            <View className="mt-6 flex-row gap-3">
              <QuickStatTile label="Pending" tone="warning" value={counts.pending} />
              <QuickStatTile label="Approved" tone="success" value={counts.approved} />
              <QuickStatTile label="Rejected" tone="danger" value={counts.rejected} />
            </View>

            {claims.length > 0 ? (
              <View className="mt-6">
                <BusinessNavCard
                  description={`Track every ownership claim · ${counts.pending} pending`}
                  iconName="document-text"
                  onPress={() => goTo(routes.business.claims)}
                  title="Claim history"
                />
              </View>
            ) : (
              <View className="mt-6 rounded-[24px] border border-surface-strong bg-surface-card p-6">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
                  <Ionicons name="business" size={24} color={colors.brand[600]} />
                </View>
                <Text className="mt-3 text-xl font-black text-ink-900">No claims yet</Text>
                <Text className="mt-2 text-sm leading-6 text-ink-600">
                  Open a bathroom from the map and tap "Claim this business" to start.
                </Text>
                <Button
                  className="mt-5"
                  label="Open map"
                  onPress={() => pushSafely(router, routes.tabs.map, routes.tabs.map)}
                />
                <Button
                  className="mt-3"
                  label="Search bathrooms"
                  onPress={() => pushSafely(router, routes.tabs.search, routes.tabs.map)}
                  variant="secondary"
                />
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Full business hub
  const heroTitle =
    managedBathrooms.length === 1
      ? `Welcome back to ${managedBathrooms[0].place_name}`
      : `${managedBathrooms.length} location${managedBathrooms.length === 1 ? '' : 's'} under your management`;

  return (
    <SafeAreaView className="flex-1 bg-surface-base" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => void handleRefresh()} />
        }
      >
        <View className="px-5 pb-10 pt-6">
          <BusinessHeroHeader
            eyebrow="Business Hub"
            title={heroTitle}
            subtitle="Direct controls for everything customers see in StallPass."
            iconName="business"
          />

          {/* Top stats glance */}
          <View className="mt-6 gap-3">
            <View className="flex-row gap-3">
              <QuickStatTile
                iconName="storefront"
                label="Locations"
                tone="brand"
                value={summary?.total_bathrooms ?? managedBathrooms.length}
              />
              <QuickStatTile
                iconName="people"
                label="Weekly reach"
                tone="brand"
                value={summary?.total_weekly_unique_visitors ?? 0}
                helper="unique viewers"
              />
            </View>
            <View className="flex-row gap-3">
              <QuickStatTile
                iconName="navigate"
                label="Routes"
                value={summary?.total_weekly_navigation_count ?? 0}
                helper="this week"
              />
              <QuickStatTile
                iconName="alert-circle"
                label="Open issues"
                tone={(summary?.total_open_reports ?? 0) > 0 ? 'danger' : 'success'}
                value={summary?.total_open_reports ?? 0}
              />
            </View>
          </View>

          {/* Quick actions */}
          <View className="mt-7">
            <BusinessSectionHeader
              eyebrow="Quick actions"
              title="Jump straight in"
              description="The shortcuts you'll use the most."
              iconName="flash"
            />
            <View className="gap-3">
              <View className="flex-row gap-3">
                <ActionTile
                  iconName="storefront"
                  onPress={() => goTo(routes.business.locations)}
                  subtitle="Manage every location"
                  title="Locations"
                  badge={managedBathrooms.length || undefined}
                  tone="brand"
                />
                <ActionTile
                  iconName="bar-chart"
                  onPress={() => goTo(routes.business.analytics)}
                  subtitle="Discovery & reach"
                  title="Analytics"
                  tone="neutral"
                />
              </View>
              <View className="flex-row gap-3">
                <ActionTile
                  iconName="pricetags"
                  badge={activeCouponCount || undefined}
                  onPress={() => goTo(routes.business.coupons)}
                  subtitle="Create discounts"
                  title="Coupons"
                  tone="success"
                />
                <ActionTile
                  iconName="star"
                  badge={activePlacementCount || undefined}
                  onPress={() => goTo(routes.business.featured)}
                  subtitle="Boost on the map"
                  title="Featured"
                  tone="warning"
                />
              </View>
            </View>
          </View>

          {/* Locations preview */}
          {managedBathrooms.length > 0 ? (
            <View className="mt-7">
              <BusinessSectionHeader
                eyebrow="My locations"
                title="Tap to manage"
                description="Open a location for direct control of its StallPass parameters."
                iconName="business"
                actionLabel={managedBathrooms.length > 2 ? 'See all' : undefined}
                onAction={
                  managedBathrooms.length > 2 ? () => goTo(routes.business.locations) : undefined
                }
              />
              <View className="gap-4">
                {managedBathrooms.slice(0, 2).map((bathroom) => (
                  <BusinessLocationCard
                    activeCouponCount={activeCouponsByBathroom[bathroom.bathroom_id] ?? 0}
                    bathroom={bathroom}
                    key={bathroom.bathroom_id}
                    onPress={(id) => goTo(routes.business.location(id))}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Sections nav */}
          <View className="mt-7">
            <BusinessSectionHeader
              eyebrow="Manage"
              title="Everything in one place"
              iconName="apps"
            />
            <View className="gap-3">
              <BusinessNavCard
                description={`${counts.pending} pending · ${counts.approved} approved · ${counts.rejected} rejected`}
                iconName="document-text"
                onPress={() => goTo(routes.business.claims)}
                title="Ownership claims"
                badge={counts.pending > 0 ? counts.pending : undefined}
                badgeTone="warning"
              />
              <BusinessNavCard
                description={`${activeCouponCount} active coupon${activeCouponCount === 1 ? '' : 's'} across your locations`}
                iconName="pricetags"
                onPress={() => goTo(routes.business.coupons)}
                title="Coupons & discounts"
                badge={activeCouponCount > 0 ? activeCouponCount : undefined}
                badgeTone="success"
              />
              <BusinessNavCard
                description={
                  totalStallPassVisits > 0
                    ? `${totalStallPassVisits} StallPass-driven visits this month`
                    : 'Discovery, routes, and trust metrics'
                }
                iconName="bar-chart"
                onPress={() => goTo(routes.business.analytics)}
                title="Live analytics"
              />
              <BusinessNavCard
                description={
                  activePlacementCount > 0
                    ? `${activePlacementCount} active campaign${activePlacementCount === 1 ? '' : 's'}`
                    : 'Boost a location on the map'
                }
                iconName="star"
                onPress={() => goTo(routes.business.featured)}
                title="Featured placements"
                badge={activePlacementCount > 0 ? activePlacementCount : undefined}
                badgeTone="brand"
              />
            </View>
          </View>

          {/* Admin invites */}
          {isAdmin ? (
            <View className="mt-7">
              <EarlyAdopterBanner
                invites={invites}
                isGenerating={generateInviteMutation.isPending}
                onGenerate={(input) => generateInviteMutation.mutate(input)}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
