import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { getApprovedLocations, type ApprovedLocation } from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Locations',
};

export default async function LocationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { locations, error } = await getApprovedLocations(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">Locations</div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">Your managed bathrooms</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-600">
        Every approved StallPass claim tied to your account, with the same visibility and verification
        settings the mobile business dashboard reads.
      </p>

      {error ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {error}
        </div>
      ) : null}

      {!error && locations.length === 0 ? (
        <EmptyState />
      ) : null}

      {!error && locations.length > 0 ? (
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {locations.map((location) => (
            <LocationCard key={location.bathroom_id} location={location} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Building2 size={22} />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">
        No approved locations yet
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
        Once your bathroom ownership claims are approved, they will appear here automatically.
      </p>
      <Link
        href="/hub"
        className="mt-5 inline-flex items-center rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700"
      >
        Back to hub
      </Link>
    </div>
  );
}

function LocationCard({ location }: { location: ApprovedLocation }) {
  return (
    <Link
      href={`/locations/${location.bathroom_id}`}
      className="group rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-pop"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Building2 size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-lg font-black tracking-tight text-ink-900 group-hover:text-brand-700">
            {location.business_name || 'Business location'}
          </div>
          <div className="mt-1 text-sm font-semibold text-ink-700">{location.place_name}</div>
          <div className="mt-2 text-sm leading-6 text-ink-500">{location.address}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <LocationChip
          label={location.requires_premium_access ? 'Premium access required' : 'Public access'}
          tone={location.requires_premium_access ? 'warning' : 'neutral'}
        />
        <LocationChip
          label={location.show_on_free_map ? 'Visible on free map' : 'Hidden from free map'}
          tone={location.show_on_free_map ? 'brand' : 'neutral'}
        />
        <LocationChip
          label={location.is_location_verified ? 'Location verified' : 'Verification pending'}
          tone={location.is_location_verified ? 'success' : 'neutral'}
        />
      </div>

      <div className="mt-5 text-sm font-semibold text-brand-600">Open location settings →</div>
    </Link>
  );
}

type ChipTone = 'brand' | 'success' | 'warning' | 'neutral';

function LocationChip({ label, tone }: { label: string; tone: ChipTone }) {
  const toneClasses: Record<ChipTone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    neutral: 'bg-surface-muted text-ink-600',
  };

  return (
    <span className={`rounded-full px-3 py-1.5 text-xs font-bold tracking-[0.2px] ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
