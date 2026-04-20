import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BarChart3, Eye, Navigation, Star, Users } from 'lucide-react';
import { calculateDashboardTotals } from '@/lib/business/dashboard-metrics';
import { getApprovedLocations } from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Analytics',
};

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { locations, error } = await getApprovedLocations(supabase, user.id);
  const totals = calculateDashboardTotals(locations);

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Analytics
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Discovery and engagement
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-600">
        These metrics are pulled from the same StallPass analytics RPC used across the business
        dashboard. The charted 7/30/90 day time-series from the prototype still needs its own RPC,
        so this MVP focuses on the live totals and per-location breakdown that are already wired.
      </p>

      {error ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {error}
        </div>
      ) : null}

      {!error && locations.length === 0 ? (
        <div className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <BarChart3 size={22} />
          </div>
          <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">
            Analytics will appear once locations are approved
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
            Claim approvals unlock the per-location metrics shown on this page.
          </p>
          <Link
            href="/claims"
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700"
          >
            Review claim history
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}

      {!error && locations.length > 0 ? (
        <>
          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total views"
              value={totals.totalViews}
              helper="this week"
              icon={<Eye size={18} />}
              tone="brand"
            />
            <StatCard
              label="Unique visitors"
              value={totals.totalUniqueVisitors}
              helper="weekly reach"
              icon={<Users size={18} />}
              tone="success"
            />
            <StatCard
              label="Route opens"
              value={totals.totalRouteOpens}
              helper="navigation starts"
              icon={<Navigation size={18} />}
              tone="warning"
            />
            <StatCard
              label="Avg cleanliness"
              value={formatDecimal(totals.averageCleanliness)}
              helper={`${locations.reduce((sum, location) => sum + location.total_ratings, 0)} total ratings`}
              icon={<Star size={18} />}
              tone="neutral"
            />
          </section>

          <section className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
                  By location
                </div>
                <div className="mt-1 text-xl font-black tracking-tight text-ink-900">
                  Location breakdown
                </div>
              </div>

              <div className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm text-ink-600">
                Monthly reach across all locations:{' '}
                <span className="font-bold text-ink-900">{formatNumber(totals.totalMonthlyReach)}</span>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">Weekly views</th>
                    <th className="px-4 py-2">Route opens</th>
                    <th className="px-4 py-2">Cleanliness</th>
                    <th className="px-4 py-2">Open issues</th>
                    <th className="px-4 py-2">Monthly reach</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr key={location.bathroom_id} className="rounded-2xl bg-surface-base text-sm text-ink-600">
                      <td className="rounded-l-2xl px-4 py-4">
                        <div className="font-bold text-ink-900">{location.place_name}</div>
                        <div className="mt-1 text-xs text-ink-500">{location.address}</div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-ink-900">
                        {formatNumber(location.weekly_views)}
                      </td>
                      <td className="px-4 py-4 font-semibold text-ink-900">
                        {formatNumber(location.weekly_navigation_count)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-surface-card px-3 py-1.5 font-semibold text-ink-900">
                          <Star size={12} className="text-warning" />
                          {formatDecimal(location.avg_cleanliness)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[1px] ${
                            location.open_reports > 0
                              ? 'bg-danger/10 text-danger'
                              : 'bg-success/10 text-success'
                          }`}
                        >
                          {location.open_reports}
                        </span>
                      </td>
                      <td className="rounded-r-2xl px-4 py-4 font-semibold text-ink-900">
                        {formatNumber(location.monthly_unique_visitors)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

type Tone = 'brand' | 'success' | 'warning' | 'neutral';

function StatCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: React.ReactNode;
  tone: Tone;
}) {
  const toneClasses: Record<Tone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    neutral: 'bg-surface-muted text-ink-600',
  };

  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-ink-900">{value}</div>
      <div className="mt-1 text-xs text-ink-500">{helper}</div>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.0';
  }

  return value.toFixed(1);
}
