import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { calculateFeaturedPlacementCtr } from '../../../lib/business/dashboard-metrics';
import {
  getApprovedLocations,
  getBusinessFeaturedPlacements,
  type BusinessFeaturedPlacementSummary,
} from '../../../lib/business/queries';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { CreateCampaignForm } from './create-campaign-form';

export const metadata: Metadata = {
  title: 'Featured',
};

export default async function FeaturedPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ placements, error }, { locations }] = await Promise.all([
    getBusinessFeaturedPlacements(supabase, user.id),
    getApprovedLocations(supabase, user.id),
  ]);

  const activePlacements = placements.filter((placement) => placement.status === 'active');
  const inactivePlacements = placements.filter((placement) => placement.status !== 'active');

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">Featured</div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">Boost on the map</h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-600">
        Launch and monitor featured placement campaigns for your locations. Pick a placement type,
        set your campaign window, and your listing moves to the top of search and map results.
      </p>

      {error ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {error}
        </div>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <ExplainerCard
          step="1"
          title="Pick a location"
          description="Choose the bathroom listing you want to promote in search and nearby map results."
        />
        <ExplainerCard
          step="2"
          title="Set your window"
          description="Choose a placement type and campaign start and end dates, then launch."
        />
        <ExplainerCard
          step="3"
          title="Track performance"
          description="Impressions, taps, and CTR update in the active campaigns panel below."
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            Active campaigns
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">Running now</div>

          {activePlacements.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-surface-strong bg-surface-base p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Sparkles size={22} />
              </div>
              <div className="mt-4 text-xl font-black tracking-tight text-ink-900">
                No active featured placements
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Campaign reporting is live. Launch controls will appear here once the business
                placement creation flow is wired.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-4">
              {activePlacements.map((placement) => (
                <CampaignCard key={placement.id} placement={placement} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            Launch campaign
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">
            New featured placement
          </div>
          <CreateCampaignForm
            locations={locations.map((loc) => ({
              bathroom_id: loc.bathroom_id,
              place_name: loc.place_name,
              address: loc.address,
            }))}
          />
        </section>
      </div>

      {inactivePlacements.length > 0 ? (
        <section className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            Past campaigns
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">
            Paused, expired, or cancelled
          </div>

          <div className="mt-5 grid gap-4">
            {inactivePlacements.map((placement) => (
              <CampaignCard key={placement.id} placement={placement} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ExplainerCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-sm font-black text-white">
        {step}
      </div>
      <div className="mt-4 text-lg font-black tracking-tight text-ink-900">{title}</div>
      <div className="mt-2 text-sm leading-6 text-ink-600">{description}</div>
    </div>
  );
}

function CampaignCard({ placement }: { placement: BusinessFeaturedPlacementSummary }) {
  const ctr = calculateFeaturedPlacementCtr(placement.impressions_count, placement.clicks_count);

  return (
    <div className="rounded-3xl border border-surface-strong bg-surface-base p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black tracking-tight text-ink-900">{placement.location_name}</div>
          <div className="mt-1 text-sm text-ink-500">{placement.address}</div>
          <div className="mt-2 text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            {formatPlacementType(placement.placement_type)}
          </div>
        </div>

        <span
          className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] ${
            placement.status === 'active'
              ? 'bg-success/10 text-success'
              : 'bg-surface-card text-ink-600'
          }`}
        >
          {placement.status}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricTile label="Impressions" value={placement.impressions_count} />
        <MetricTile label="Taps" value={placement.clicks_count} tone="brand" />
        <MetricTile label="CTR" value={`${ctr.toFixed(1)}%`} tone="success" />
      </div>

      <div className="mt-4 text-sm text-ink-500">
        {formatDate(placement.start_date)} {'->'} {formatDate(placement.end_date)}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  tone?: 'brand' | 'success' | 'neutral';
}) {
  const toneClasses: Record<typeof tone, string> = {
    brand: 'text-brand-700',
    success: 'text-success',
    neutral: 'text-ink-900',
  };

  return (
    <div className="rounded-2xl border border-surface-strong bg-surface-card px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-black tracking-tight ${toneClasses[tone]}`}>{value}</div>
    </div>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPlacementType(value: BusinessFeaturedPlacementSummary['placement_type']): string {
  if (value === 'map_priority') {
    return 'Map priority';
  }

  if (value === 'nearby_featured') {
    return 'Nearby featured';
  }

  return 'Search top';
}
