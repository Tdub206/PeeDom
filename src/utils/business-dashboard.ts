import type { BusinessDashboardBathroom, BusinessDashboardSummary } from '@/types';

export type BusinessInsightTone = 'positive' | 'warning' | 'neutral';

export interface BusinessDashboardInsight {
  id: string;
  title: string;
  body: string;
  tone: BusinessInsightTone;
}

export interface BusinessChecklistItem {
  label: string;
  detail: string;
  complete: boolean;
}

export interface BusinessHealthSummary {
  verification_coverage_percent: number;
  official_coverage_percent: number;
  visibility_coverage_percent: number;
  active_offer_coverage_percent: number;
  discovery_to_route_percent: number;
  bathrooms_needing_attention: number;
  unresolved_issue_locations: number;
}

function toPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export function getBathroomRouteConversionPercent(
  bathroom: Pick<BusinessDashboardBathroom, 'weekly_navigation_count' | 'weekly_views'>
): number {
  if (bathroom.weekly_views <= 0) {
    return 0;
  }

  return Math.round((bathroom.weekly_navigation_count / bathroom.weekly_views) * 100);
}

export function getBathroomAttentionSummary(
  bathroom: Pick<
    BusinessDashboardBathroom,
    | 'active_offer_count'
    | 'has_verification_badge'
    | 'is_location_verified'
    | 'open_reports'
    | 'weekly_navigation_count'
    | 'weekly_views'
  >
): string[] {
  const notes: string[] = [];

  if (!bathroom.has_verification_badge) {
    notes.push('verification badge missing');
  }

  if (!bathroom.is_location_verified) {
    notes.push('location not confirmed');
  }

  if (bathroom.open_reports > 0) {
    notes.push(`${bathroom.open_reports} open issue${bathroom.open_reports === 1 ? '' : 's'}`);
  }

  if (bathroom.active_offer_count === 0) {
    notes.push('no active offer');
  }

  if (bathroom.weekly_views > 0 && getBathroomRouteConversionPercent(bathroom) < 25) {
    notes.push('route conversion is soft');
  }

  return notes;
}

export function buildManagedBathroomChecklist(
  bathroom: Pick<
    BusinessDashboardBathroom,
    | 'has_verification_badge'
    | 'is_location_verified'
    | 'requires_premium_access'
    | 'show_on_free_map'
    | 'weekly_navigation_count'
  >,
  activeCouponCount: number
): BusinessChecklistItem[] {
  return [
    {
      label: 'Verified badge',
      detail: bathroom.has_verification_badge
        ? 'This location carries an owner-facing trust badge in StallPass.'
        : 'Finish claim review to turn this location into an official listing.',
      complete: bathroom.has_verification_badge,
    },
    {
      label: 'Location confirmed',
      detail: bathroom.is_location_verified
        ? 'Stored entrance coordinates and address are confirmed.'
        : 'Confirm the saved restroom pin so route starts feel dependable.',
      complete: bathroom.is_location_verified,
    },
    {
      label: 'Discovery policy set',
      detail: bathroom.requires_premium_access && !bathroom.show_on_free_map
        ? 'Premium-only access is active.'
        : bathroom.requires_premium_access
          ? 'Premium placement is active, but free users can still find it.'
          : 'This restroom is discoverable on the free map.',
      complete: true,
    },
    {
      label: 'Visit incentive live',
      detail:
        activeCouponCount > 0
          ? `${activeCouponCount} active incentive${activeCouponCount === 1 ? '' : 's'} can convert restroom visits into store visits.`
          : 'Add an offer so restroom discovery can turn into attributable foot traffic.',
      complete: activeCouponCount > 0,
    },
    {
      label: 'Recent route demand',
      detail:
        bathroom.weekly_navigation_count > 0
          ? `${bathroom.weekly_navigation_count} route start${bathroom.weekly_navigation_count === 1 ? '' : 's'} this week.`
          : 'No route starts recorded this week yet.',
      complete: bathroom.weekly_navigation_count > 0,
    },
  ];
}

export function calculateBusinessHealthSummary(
  summary: BusinessDashboardSummary,
  bathrooms: BusinessDashboardBathroom[]
): BusinessHealthSummary {
  const totalBathrooms = Math.max(summary.total_bathrooms, bathrooms.length);
  const officialCoverageCount = bathrooms.filter(
    (bathroom) => bathroom.has_verification_badge && bathroom.is_location_verified
  ).length;
  const visibleCoverageCount = bathrooms.filter((bathroom) => bathroom.show_on_free_map).length;
  const activeOfferCoverageCount = bathrooms.filter((bathroom) => bathroom.active_offer_count > 0).length;
  const bathroomsNeedingAttention = bathrooms.filter(
    (bathroom) => getBathroomAttentionSummary(bathroom).length > 0
  ).length;
  const unresolvedIssueLocations = bathrooms.filter((bathroom) => bathroom.open_reports > 0).length;

  return {
    verification_coverage_percent: toPercent(summary.verified_locations, totalBathrooms),
    official_coverage_percent: toPercent(officialCoverageCount, totalBathrooms),
    visibility_coverage_percent: toPercent(visibleCoverageCount, totalBathrooms),
    active_offer_coverage_percent: toPercent(activeOfferCoverageCount, totalBathrooms),
    discovery_to_route_percent:
      summary.total_weekly_unique_visitors > 0
        ? toPercent(summary.total_weekly_navigation_count, summary.total_weekly_unique_visitors)
        : 0,
    bathrooms_needing_attention: bathroomsNeedingAttention,
    unresolved_issue_locations: unresolvedIssueLocations,
  };
}

export function buildBusinessDashboardInsights(
  summary: BusinessDashboardSummary,
  bathrooms: BusinessDashboardBathroom[]
): BusinessDashboardInsight[] {
  const health = calculateBusinessHealthSummary(summary, bathrooms);
  const insights: BusinessDashboardInsight[] = [];

  if (bathrooms.length === 0) {
    return [
      {
        id: 'awaiting-locations',
        title: 'Waiting on the first managed location',
        body: 'Once a claim is approved, this dashboard will start tracking reach, route starts, and trust coverage.',
        tone: 'neutral',
      },
    ];
  }

  if (health.official_coverage_percent < 100) {
    insights.push({
      id: 'official-coverage',
      title: 'Finish official verification coverage',
      body: `${health.official_coverage_percent}% of managed locations are both badge-verified and location-confirmed.`,
      tone: 'warning',
    });
  }

  if (summary.total_open_reports > 0) {
    insights.push({
      id: 'open-reports',
      title: 'Resolve community complaints quickly',
      body: `${summary.total_open_reports} open report${summary.total_open_reports === 1 ? '' : 's'} are live across ${health.unresolved_issue_locations} location${health.unresolved_issue_locations === 1 ? '' : 's'}.`,
      tone: 'warning',
    });
  }

  if (summary.total_weekly_unique_visitors > 0) {
    insights.push({
      id: 'route-conversion',
      title:
        health.discovery_to_route_percent >= 35
          ? 'Discovery is turning into real visits'
          : 'People see you, but route intent can improve',
      body: `${health.discovery_to_route_percent}% of weekly unique restroom visitors started navigation from StallPass.`,
      tone: health.discovery_to_route_percent >= 35 ? 'positive' : 'warning',
    });
  }

  if (health.active_offer_coverage_percent === 0) {
    insights.push({
      id: 'offers',
      title: 'No active offers are live',
      body: 'Coupons and perks are the clearest way to connect restroom discovery to measurable business value.',
      tone: 'neutral',
    });
  }

  if (!insights.length) {
    insights.push({
      id: 'healthy-portfolio',
      title: 'Trust coverage looks healthy',
      body: 'Verified locations, active offers, and route demand are all moving in the right direction.',
      tone: 'positive',
    });
  }

  return insights.slice(0, 3);
}
