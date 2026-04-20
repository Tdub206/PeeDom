import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarClock,
  FileText,
  MapPin,
  Sparkles,
  Tag,
  ThumbsUp,
  TrendingUp,
} from 'lucide-react';
import { calculateDashboardTotals } from '@/lib/business/dashboard-metrics';
import { getApprovedLocations, getPendingClaimsCount, type ApprovedLocation } from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Hub',
};

const RECENT_ACTIVITY: Array<{
  text: string;
  time: string;
  tone: 'brand' | 'success' | 'warning';
}> = [
  {
    text: 'Coupon performance is now live in the dashboard and locations pages.',
    time: 'Today',
    tone: 'brand',
  },
  {
    text: 'Business-owner access codes now publish straight into the shared code feed.',
    time: 'Today',
    tone: 'success',
  },
  {
    text: 'Claim review updates still arrive by email while the in-app notification feed is being wired.',
    time: 'This week',
    tone: 'warning',
  },
];

export default async function BusinessHubPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { locations, error } = await getApprovedLocations(supabase, user.id);
  const { count: pendingClaimsCount, error: pendingClaimsError } = await getPendingClaimsCount(
    supabase,
    user.id
  );
  const totals = calculateDashboardTotals(locations);
  const locationCount = locations.length;
  const pageError = error ?? pendingClaimsError;

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <Hero name={user.email ?? 'there'} locationCount={locationCount} />
      {pageError ? (
        <div className="mt-6 rounded-4xl border border-danger/20 bg-danger/10 px-5 py-4 text-sm text-danger">
          {pageError}
        </div>
      ) : null}

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Locations"
          value={locationCount}
          tone="brand"
          icon={<Building2 size={18} />}
        />
        <StatCard
          label="Weekly reach"
          value={formatMetricValue(totals.totalUniqueVisitors)}
          helper="unique visitors"
          icon={<TrendingUp size={18} />}
          tone="success"
        />
        <StatCard
          label="Active coupons"
          value={formatMetricValue(totals.totalActiveOffers)}
          helper="live offers"
          icon={<Tag size={18} />}
          tone="warning"
        />
        <StatCard
          label="Pending claims"
          value={formatMetricValue(pendingClaimsCount)}
          helper="awaiting review"
          icon={<FileText size={18} />}
          tone={pendingClaimsCount > 0 ? 'danger' : 'neutral'}
        />
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section>
          <SectionHeader eyebrow="Quick actions" title="Jump straight in" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ActionTile
              href="/locations"
              icon={<Building2 size={20} />}
              title="Locations"
              subtitle="Hours, visibility, and listing controls"
              tone="brand"
            />
            <ActionTile
              href="/coupons"
              icon={<Tag size={20} />}
              title="Coupons"
              subtitle="Create and manage live discounts"
              tone="success"
            />
            <ActionTile
              href="/codes"
              icon={<ArrowRight size={20} />}
              title="Access codes"
              subtitle="Publish and rotate authoritative door codes"
              tone="neutral"
            />
            <ActionTile
              href="/featured"
              icon={<Sparkles size={20} />}
              title="Featured"
              subtitle="Review promotional placements and campaign status"
              tone="warning"
            />
          </div>
        </section>

        <section>
          <SectionHeader eyebrow="Activity" title="Recent updates" />
          <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
            <div className="grid gap-4">
              {RECENT_ACTIVITY.map((activity) => (
                <div key={activity.text} className="flex items-start gap-3">
                  <span
                    className={`mt-2 h-2.5 w-2.5 rounded-full ${
                      activity.tone === 'success'
                        ? 'bg-success'
                        : activity.tone === 'warning'
                          ? 'bg-warning'
                          : 'bg-brand-600'
                    }`}
                  />
                  <div>
                    <div className="text-sm font-semibold leading-6 text-ink-900">{activity.text}</div>
                    <div className="mt-1 text-xs text-ink-500">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-10">
        <SectionHeader
          eyebrow="Your locations"
          title="Managed bathroom summary"
          description="Discovery and trust metrics for every approved location on your account."
        />
        {locations.length === 0 ? (
          <div className="rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Building2 size={22} />
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">
              No approved locations yet
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
              Once your ownership claims are approved they will appear here automatically.
            </p>
            <Link
              href="/claims"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700"
            >
              Review claim history
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {locations.map((location) => (
              <LocationSummaryCard key={location.bathroom_id} location={location} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Hero({ name, locationCount }: { name: string; locationCount: number }) {
  return (
    <div className="rounded-4xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 text-white shadow-pop">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-white/80">
        Business Hub
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        {locationCount === 0
          ? `Welcome, ${name}`
          : `${locationCount} location${locationCount === 1 ? '' : 's'} under your management`}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
        Direct controls for everything StallPass customers see. Any change you make here syncs
        instantly to the iOS and Android app.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/locations"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/15 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
        >
          Manage locations
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/analytics"
          className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
        >
          View analytics
          <BarChart3 size={16} />
        </Link>
      </div>
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
      {description ? <div className="mt-1 max-w-2xl text-sm text-ink-500">{description}</div> : null}
    </div>
  );
}

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

function StatCard({
  label,
  value,
  helper,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: Tone;
  icon?: React.ReactNode;
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
      {icon ? (
        <div
          className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
          {icon}
        </div>
      ) : null}
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-ink-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-ink-500">{helper}</div> : null}
    </div>
  );
}

function ActionTile({
  href,
  icon,
  title,
  subtitle,
  tone = 'neutral',
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
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
    <Link
      href={href}
      className="group rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div className="text-lg font-black tracking-tight text-ink-900 group-hover:text-brand-700">
        {title}
      </div>
      <div className="mt-1 text-xs text-ink-500">{subtitle}</div>
    </Link>
  );
}

function LocationSummaryCard({ location }: { location: ApprovedLocation }) {
  return (
    <Link
      href={`/locations/${location.bathroom_id}`}
      className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-pop"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Building2 size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            {location.business_name ?? 'Managed location'}
          </div>
          <div className="mt-1 text-lg font-black tracking-tight text-ink-900">
            {location.place_name}
          </div>
          <div className="mt-2 flex items-start gap-2 text-sm text-ink-500">
            <MapPin size={14} className="mt-0.5 flex-none" />
            <span>{location.address}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <SummaryChip tone={location.is_location_verified ? 'success' : 'warning'}>
              {location.is_location_verified ? 'Verified' : 'Verification pending'}
            </SummaryChip>
            <SummaryChip tone={location.show_on_free_map ? 'brand' : 'neutral'}>
              {location.show_on_free_map ? 'Live on free map' : 'Premium-only visibility'}
            </SummaryChip>
            <SummaryChip tone="neutral">
              {location.active_offer_count} active offer{location.active_offer_count === 1 ? '' : 's'}
            </SummaryChip>
          </div>
        </div>

        <div className="min-w-[160px] rounded-3xl bg-surface-base px-4 py-3">
          <div className="text-[11px] font-bold uppercase tracking-[1px] text-ink-500">
            This week
          </div>
          <div className="mt-3 grid gap-3 text-sm text-ink-600">
            <MetricRow icon={<TrendingUp size={14} />} label="Views" value={location.weekly_views} />
            <MetricRow
              icon={<ThumbsUp size={14} />}
              label="Reach"
              value={location.weekly_unique_visitors}
            />
            <MetricRow
              icon={<CalendarClock size={14} />}
              label="Routes"
              value={location.weekly_navigation_count}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function SummaryChip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: Tone;
}) {
  const toneClasses: Record<Tone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    neutral: 'bg-surface-muted text-ink-600',
  };

  return (
    <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold tracking-[0.1px] ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-ink-500">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-bold text-ink-900">{formatMetricValue(value)}</span>
    </div>
  );
}

function formatMetricValue(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
