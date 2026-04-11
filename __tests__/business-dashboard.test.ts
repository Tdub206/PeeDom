import { describe, expect, it } from '@jest/globals';

import type { BusinessDashboardBathroom, BusinessDashboardSummary } from '@/types';
import {
  buildBusinessDashboardInsights,
  buildManagedBathroomChecklist,
  calculateBusinessHealthSummary,
  getBathroomAttentionSummary,
  getBathroomRouteConversionPercent,
} from '@/utils/business-dashboard';

const baseBathroom: BusinessDashboardBathroom = {
  bathroom_id: 'bathroom-1',
  claim_id: 'claim-1',
  place_name: 'Central Cafe Restroom',
  business_name: 'Central Cafe',
  total_favorites: 18,
  open_reports: 2,
  avg_cleanliness: 4.5,
  total_ratings: 12,
  weekly_views: 40,
  weekly_unique_visitors: 18,
  monthly_unique_visitors: 55,
  weekly_navigation_count: 10,
  verification_badge_type: 'featured',
  has_verification_badge: true,
  has_active_featured_placement: true,
  active_featured_placements: 1,
  active_offer_count: 1,
  requires_premium_access: false,
  show_on_free_map: true,
  is_location_verified: true,
  location_verified_at: '2026-04-01T10:00:00.000Z',
  pricing_plan: 'standard',
  last_updated: '2026-04-05T10:00:00.000Z',
};

const summary: BusinessDashboardSummary = {
  total_bathrooms: 2,
  total_favorites_across_all: 22,
  total_open_reports: 3,
  avg_rating_across_all: 4.3,
  active_featured_placements: 1,
  verified_locations: 1,
  total_weekly_unique_visitors: 20,
  total_monthly_unique_visitors: 60,
  total_weekly_navigation_count: 10,
  active_offers: 1,
  premium_only_locations: 0,
  lifetime_locations: 0,
};

describe('business dashboard utilities', () => {
  it('derives business health coverage and conversion metrics', () => {
    const health = calculateBusinessHealthSummary(summary, [
      baseBathroom,
      {
        ...baseBathroom,
        bathroom_id: 'bathroom-2',
        place_name: 'North Station',
        has_verification_badge: false,
        is_location_verified: false,
        show_on_free_map: false,
        active_offer_count: 0,
        open_reports: 1,
      },
    ]);

    expect(health.official_coverage_percent).toBe(50);
    expect(health.visibility_coverage_percent).toBe(50);
    expect(health.active_offer_coverage_percent).toBe(50);
    expect(health.discovery_to_route_percent).toBe(50);
    expect(health.bathrooms_needing_attention).toBe(2);
    expect(health.unresolved_issue_locations).toBe(2);
  });

  it('builds actionable insights from weak trust and conversion signals', () => {
    const insights = buildBusinessDashboardInsights(summary, [
      baseBathroom,
      {
        ...baseBathroom,
        bathroom_id: 'bathroom-2',
        place_name: 'North Station',
        has_verification_badge: false,
        is_location_verified: false,
        active_offer_count: 0,
        open_reports: 1,
      },
    ]);

    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some((insight) => insight.title.includes('official verification'))).toBe(true);
    expect(insights.some((insight) => insight.title.includes('community complaints'))).toBe(true);
  });

  it('describes per-location attention gaps and route conversion', () => {
    expect(getBathroomRouteConversionPercent(baseBathroom)).toBe(25);
    expect(
      getBathroomAttentionSummary({
        ...baseBathroom,
        has_verification_badge: false,
        is_location_verified: false,
        active_offer_count: 0,
        weekly_navigation_count: 2,
        weekly_views: 20,
      })
    ).toEqual([
      'verification badge missing',
      'location not confirmed',
      '2 open issues',
      'no active offer',
      'route conversion is soft',
    ]);
  });

  it('builds a verified program checklist for managed locations', () => {
    const checklist = buildManagedBathroomChecklist(
      {
        ...baseBathroom,
        has_verification_badge: false,
        is_location_verified: false,
        requires_premium_access: true,
        show_on_free_map: false,
        weekly_navigation_count: 0,
      },
      0
    );

    expect(checklist[0]?.complete).toBe(false);
    expect(checklist[1]?.complete).toBe(false);
    expect(checklist[2]?.complete).toBe(true);
    expect(checklist[3]?.complete).toBe(false);
    expect(checklist[4]?.complete).toBe(false);
  });
});
