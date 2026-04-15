import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  Bookmark,
  Building2,
  Eye,
  Navigation,
  Star,
  Tag,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  getApprovedLocations,
  type ApprovedLocation,
} from '@/lib/business/queries';
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

  const summary = aggregateSummary(locations);

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Analytics
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Live analytics
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-600">
        Aggregate discovery, engagement, and trust metrics across all your managed locations.
      </p>

      {error ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {error}
        </div>
      ) : null}

      {!error && locations.length === 0 ? <EmptyState /> : null}

      {locations.length > 0 ? (
        <>
          <section className="mt-8">
            <SectionHeader
              eyebrow="Aggregate metrics"
              title="Across all locations"
              description="Totals and averages pulled from the StallPass analytics backend."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Building2 size={18} />}
                label="Total locations"
                value={summary.totalLocations}
                tone="brand"
              />
              <StatCard
                icon={<Eye size={18} />}
                label="Weekly views"
                value={summary.totalWeeklyViews}
                tone="brand"
              />
              <StatCard
                icon={<Users size={18} />}
                label="Weekly unique visitors"
                value={summary.totalWeeklyUnique}
              />
              <StatCard
                icon={<TrendingUp size={18} />}
                label="Monthly unique visitors"
                value={summary.totalMonthlyUnique}
              />
              <StatCard
                icon={<Navigation size={18} />}
                label="Route opens"
                value={summary.totalRouteOpens}
                helper="this week"
              />
              <StatCard
                icon={<Star size={18} />}
                label="Avg cleanliness"
                value={summary.avgCleanliness.toFixed(1)}
                helper={`${summary.totalRatings} total ratings`}
              />
              <StatCard
                icon={<Bookmark size={18} />}
                label="Total map saves"
                value={summary.totalFavorites}
              />
              <StatCard
                icon={<Tag size={18} />}
                label="Active offers"
                value={summary.totalActiveOffers}
              />
            </div>
          </section>

          <section className="mt-10">
            <SectionHeader
              eyebrow="Per location"
              title="Location breakdown"
              description="Weekly views, visitors, and ratings by location."
            />
            <div className="grid grid-cols-1 gap-4">
              {locations.map((location) => (
                <LocationAnalyticsRow key={location.bathroom_id} location={location} />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function LocationAnalyticsRow({ location }: { location: ApprovedLocation }) {
  return (
    <Link
      href={`/locations/${location.bathroom_id}`}
      className="group flex items-center gap-6 rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card transition hover:border-brand-500"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Building2 size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold text-ink-900 group-hover:text-brand-700">
          {location.business_name || location.place_name}
        </div>
        <div className="mt-0.5 text-xs text-ink-500">{location.address}</div>
      </div>
      <div className="hidden flex-wrap gap-6 sm:flex">
        <MiniStat label="Views" value={location.weekly_views} />
        <MiniStat label="Unique" value={location.weekly_unique_visitors} />
        <MiniStat label="Routes" value={location.weekly_navigation_count} />
        <MiniStat label="Rating" value={location.avg_cleanliness.toFixed(1)} />
        <MiniStat label="Saves" value={location.total_favorites} />
      </div>
      <span className="text-ink-400">→</span>
    </Link>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-ink-500">{label}</div>
      <div className="text-sm font-black text-ink-900">{value}</div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        {eyebrow}
      </div>
      <div className="mt-1 text-xl font-black tracking-tight text-ink-900">{title}</div>
      {description ? (
        <div className="mt-1 max-w-xl text-sm text-ink-500">{description}</div>
      ) : null}
    </div>
  );
}

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

function StatCard({
  icon,
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper?: string;
  tone?: Tone;
}) {
  const toneClasses: Record<Tone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    neutral: 'bg-surface-muted text-ink-600',
  };

  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-ink-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-ink-500">{helper}</div> : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <BarChart3 size={22} />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">No analytics yet</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
        Analytics populate once you have at least one approved location. Claim a bathroom through
        the StallPass app to get started.
      </p>
    </div>
  );
}

interface AnalyticsSummary {
  totalLocations: number;
  totalWeeklyViews: number;
  totalWeeklyUnique: number;
  totalMonthlyUnique: number;
  totalRouteOpens: number;
  totalFavorites: number;
  totalRatings: number;
  avgCleanliness: number;
  totalActiveOffers: number;
}

function aggregateSummary(locations: ApprovedLocation[]): AnalyticsSummary {
  let totalWeeklyViews = 0;
  let totalWeeklyUnique = 0;
  let totalMonthlyUnique = 0;
  let totalRouteOpens = 0;
  let totalFavorites = 0;
  let totalRatings = 0;
  let cleanlinessSum = 0;
  let cleanlinessCount = 0;
  let totalActiveOffers = 0;

  for (const location of locations) {
    totalWeeklyViews += location.weekly_views;
    totalWeeklyUnique += location.weekly_unique_visitors;
    totalMonthlyUnique += location.monthly_unique_visitors;
    totalRouteOpens += location.weekly_navigation_count;
    totalFavorites += location.total_favorites;
    totalRatings += location.total_ratings;
    totalActiveOffers += location.active_offer_count;

    if (location.total_ratings > 0) {
      cleanlinessSum += location.avg_cleanliness * location.total_ratings;
      cleanlinessCount += location.total_ratings;
    }
  }

  return {
    totalLocations: locations.length,
    totalWeeklyViews,
    totalWeeklyUnique,
    totalMonthlyUnique,
    totalRouteOpens,
    totalFavorites,
    totalRatings,
    avgCleanliness: cleanlinessCount > 0 ? cleanlinessSum / cleanlinessCount : 0,
    totalActiveOffers,
  };
}
