import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Eye,
  MousePointerClick,
  Sparkles,
} from 'lucide-react';
import {
  getApprovedLocations,
  getFeaturedPlacements,
  type FeaturedPlacementRow,
} from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Featured Placements',
};

type PlacementType = FeaturedPlacementRow['placement_type'];
type PlacementStatus = FeaturedPlacementRow['status'];

const PLACEMENT_TYPE_LABEL: Record<PlacementType, string> = {
  search_top: 'Search top',
  map_priority: 'Map priority',
  nearby_featured: 'Nearby featured',
};

const STATUS_TONE: Record<PlacementStatus, { label: string; tone: string }> = {
  active: { label: 'Active', tone: 'bg-success/10 text-success' },
  paused: { label: 'Paused', tone: 'bg-warning/10 text-warning' },
  expired: { label: 'Expired', tone: 'bg-surface-muted text-ink-500' },
  cancelled: { label: 'Cancelled', tone: 'bg-danger/10 text-danger' },
};

export default async function FeaturedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ locations }, { placements, error }] = await Promise.all([
    getApprovedLocations(supabase, user.id),
    getFeaturedPlacements(supabase, user.id),
  ]);

  const locationNameById = new Map(
    locations.map((location) => [location.bathroom_id, location.place_name] as const)
  );

  const activePlacements = placements.filter((placement) => placement.status === 'active');
  const inactivePlacements = placements.filter((placement) => placement.status !== 'active');

  const totalImpressions = placements.reduce(
    (total, placement) => total + placement.impressions_count,
    0
  );
  const totalClicks = placements.reduce(
    (total, placement) => total + placement.clicks_count,
    0
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Featured
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Featured placements
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-600">
        Boost your locations on the StallPass map with search priority, map pins, and nearby
        featured slots.
      </p>

      {error ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {error}
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <SummaryCard label="Active" value={activePlacements.length} />
        <SummaryCard label="Total placements" value={placements.length} />
        <SummaryCard label="Total impressions" value={totalImpressions.toLocaleString()} />
        <SummaryCard label="Total clicks" value={totalClicks.toLocaleString()} />
      </div>

      {!error && placements.length === 0 ? (
        <EmptyState hasLocations={locations.length > 0} />
      ) : null}

      {activePlacements.length > 0 ? (
        <section className="mt-8">
          <SectionHeader eyebrow="Live" title="Active placements" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activePlacements.map((placement) => (
              <PlacementCard
                key={placement.id}
                placement={placement}
                locationName={locationNameById.get(placement.bathroom_id) ?? null}
              />
            ))}
          </div>
        </section>
      ) : null}

      {inactivePlacements.length > 0 ? (
        <section className="mt-10">
          <SectionHeader eyebrow="Historical" title="Past placements" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {inactivePlacements.map((placement) => (
              <PlacementCard
                key={placement.id}
                placement={placement}
                locationName={locationNameById.get(placement.bathroom_id) ?? null}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PlacementCard({
  placement,
  locationName,
}: {
  placement: FeaturedPlacementRow;
  locationName: string | null;
}) {
  const statusConfig = STATUS_TONE[placement.status];
  const ctr =
    placement.impressions_count > 0
      ? ((placement.clicks_count / placement.impressions_count) * 100).toFixed(1)
      : '0.0';

  return (
    <article className="flex flex-col gap-5 rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
      <header className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Sparkles size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            {PLACEMENT_TYPE_LABEL[placement.placement_type]}
          </div>
          {locationName ? (
            <h3 className="mt-1 text-lg font-black tracking-tight text-ink-900">
              {locationName}
            </h3>
          ) : null}
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[1px] ${statusConfig.tone}`}
        >
          {statusConfig.label}
        </span>
      </header>

      <dl className="grid grid-cols-2 gap-4 border-t border-surface-strong pt-4 sm:grid-cols-4">
        <MetaItem icon={<Eye size={14} />} label="Impressions" value={placement.impressions_count.toLocaleString()} />
        <MetaItem icon={<MousePointerClick size={14} />} label="Clicks" value={placement.clicks_count.toLocaleString()} />
        <MetaItem label="CTR" value={`${ctr}%`} />
        <MetaItem label="Duration" value={`${formatDate(placement.start_date)} — ${formatDate(placement.end_date)}`} />
      </dl>
    </article>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1.3px] text-ink-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        {eyebrow}
      </div>
      <div className="mt-1 text-xl font-black tracking-tight text-ink-900">{title}</div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-ink-900">{value}</div>
    </div>
  );
}

function EmptyState({ hasLocations }: { hasLocations: boolean }) {
  return (
    <div className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Sparkles size={22} />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">
        No featured placements
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
        {hasLocations
          ? 'Request a featured placement through the StallPass app to boost your location at the top of search results and the map.'
          : 'Claim a location first, then you can request a featured placement to boost visibility on the map.'}
      </p>
      {!hasLocations ? (
        <Link
          href="/locations"
          className="mt-5 inline-flex items-center rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700"
        >
          Manage locations
        </Link>
      ) : null}
    </div>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
