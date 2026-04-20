import {
  calculateDashboardTotals,
  calculateFeaturedPlacementCtr,
} from '../apps/business-web/src/lib/business/dashboard-metrics';

describe('business web dashboard metrics', () => {
  it('aggregates dashboard totals with weighted cleanliness', () => {
    const totals = calculateDashboardTotals([
      {
        weekly_views: 120,
        weekly_unique_visitors: 90,
        weekly_navigation_count: 24,
        monthly_unique_visitors: 300,
        avg_cleanliness: 4.5,
        total_ratings: 10,
        active_offer_count: 2,
        open_reports: 1,
      },
      {
        weekly_views: 80,
        weekly_unique_visitors: 50,
        weekly_navigation_count: 12,
        monthly_unique_visitors: 210,
        avg_cleanliness: 3.0,
        total_ratings: 2,
        active_offer_count: 1,
        open_reports: 0,
      },
    ]);

    expect(totals).toEqual({
      totalViews: 200,
      totalUniqueVisitors: 140,
      totalRouteOpens: 36,
      totalMonthlyReach: 510,
      totalOpenReports: 1,
      totalActiveOffers: 3,
      averageCleanliness: 4.25,
    });
  });

  it('returns zero ctr when a placement has no impressions', () => {
    expect(calculateFeaturedPlacementCtr(0, 12)).toBe(0);
  });
});
