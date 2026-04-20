export interface DashboardMetricLocation {
  weekly_views: number;
  weekly_unique_visitors: number;
  weekly_navigation_count: number;
  monthly_unique_visitors: number;
  avg_cleanliness: number;
  total_ratings: number;
  active_offer_count: number;
  open_reports: number;
}

export interface DashboardTotals {
  totalViews: number;
  totalUniqueVisitors: number;
  totalRouteOpens: number;
  totalMonthlyReach: number;
  totalOpenReports: number;
  totalActiveOffers: number;
  averageCleanliness: number;
}

export function calculateDashboardTotals(locations: DashboardMetricLocation[]): DashboardTotals {
  const totals = locations.reduce(
    (summary, location) => {
      summary.totalViews += location.weekly_views;
      summary.totalUniqueVisitors += location.weekly_unique_visitors;
      summary.totalRouteOpens += location.weekly_navigation_count;
      summary.totalMonthlyReach += location.monthly_unique_visitors;
      summary.totalOpenReports += location.open_reports;
      summary.totalActiveOffers += location.active_offer_count;
      summary.totalRatings += location.total_ratings;
      summary.weightedCleanliness += location.avg_cleanliness * location.total_ratings;
      summary.unweightedCleanliness += location.avg_cleanliness;
      return summary;
    },
    {
      totalViews: 0,
      totalUniqueVisitors: 0,
      totalRouteOpens: 0,
      totalMonthlyReach: 0,
      totalOpenReports: 0,
      totalActiveOffers: 0,
      totalRatings: 0,
      weightedCleanliness: 0,
      unweightedCleanliness: 0,
    }
  );

  const averageCleanliness =
    totals.totalRatings > 0
      ? totals.weightedCleanliness / totals.totalRatings
      : locations.length > 0
        ? totals.unweightedCleanliness / locations.length
        : 0;

  return {
    totalViews: totals.totalViews,
    totalUniqueVisitors: totals.totalUniqueVisitors,
    totalRouteOpens: totals.totalRouteOpens,
    totalMonthlyReach: totals.totalMonthlyReach,
    totalOpenReports: totals.totalOpenReports,
    totalActiveOffers: totals.totalActiveOffers,
    averageCleanliness,
  };
}

export function calculateFeaturedPlacementCtr(impressions: number, clicks: number): number {
  if (impressions <= 0) {
    return 0;
  }

  return (clicks / impressions) * 100;
}
