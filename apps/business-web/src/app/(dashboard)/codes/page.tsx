import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  DoorOpen,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import {
  getApprovedLocations,
  getAccessCodesForOwnedLocations,
  type AccessCodeRow,
} from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Access Codes',
};

type LifecycleStatus = AccessCodeRow['lifecycle_status'];

export default async function AccessCodesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { locations, error: locationsError } = await getApprovedLocations(supabase, user.id);
  const bathroomIds = locations.map((location) => location.bathroom_id);
  const { codes, error: codesError } = await getAccessCodesForOwnedLocations(
    supabase,
    user.id,
    bathroomIds
  );

  const error = locationsError || codesError;

  const locationNameById = new Map(
    locations.map((location) => [location.bathroom_id, location] as const)
  );

  const activeCodes = codes.filter(
    (code) => code.lifecycle_status === 'active' && code.visibility_status === 'visible'
  );
  const otherCodes = codes.filter(
    (code) => code.lifecycle_status !== 'active' || code.visibility_status !== 'visible'
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Access codes
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Door & access codes
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-600">
        Community-submitted access codes for your claimed locations. Codes are validated by
        guest up/down votes and confidence scoring.
      </p>

      {error ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {error}
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total codes" value={codes.length} />
        <SummaryCard label="Active & visible" value={activeCodes.length} />
        <SummaryCard label="Locations with codes" value={countLocationsWithCodes(codes)} />
      </div>

      {!error && codes.length === 0 ? <EmptyState hasLocations={locations.length > 0} /> : null}

      {activeCodes.length > 0 ? (
        <section className="mt-8">
          <SectionHeader eyebrow="Live" title="Active codes" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {activeCodes.map((code) => (
              <CodeCard
                key={code.id}
                code={code}
                locationName={locationNameById.get(code.bathroom_id)?.place_name ?? null}
              />
            ))}
          </div>
        </section>
      ) : null}

      {otherCodes.length > 0 ? (
        <section className="mt-10">
          <SectionHeader eyebrow="Inactive" title="Expired, superseded, or under review" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {otherCodes.map((code) => (
              <CodeCard
                key={code.id}
                code={code}
                locationName={locationNameById.get(code.bathroom_id)?.place_name ?? null}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CodeCard({
  code,
  locationName,
}: {
  code: AccessCodeRow;
  locationName: string | null;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <DoorOpen size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl font-black tracking-wider text-ink-900">
              {code.code_value}
            </span>
            <LifecycleChip status={code.lifecycle_status} isVisible={code.visibility_status === 'visible'} />
          </div>
          {locationName ? (
            <div className="mt-1 text-sm font-semibold text-ink-500">{locationName}</div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-surface-strong pt-4">
        <div className="flex items-center gap-1.5 text-sm">
          <ThumbsUp size={14} className="text-success" />
          <span className="font-bold text-success">{code.up_votes}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <ThumbsDown size={14} className="text-danger" />
          <span className="font-bold text-danger">{code.down_votes}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-ink-500">
          <ShieldCheck size={14} />
          <span className="font-semibold">
            {code.confidence_score.toFixed(0)}% confidence
          </span>
        </div>
        {code.last_verified_at ? (
          <div className="text-xs text-ink-500">
            Verified {formatDate(code.last_verified_at)}
          </div>
        ) : null}
        {code.expires_at ? (
          <div className="text-xs text-ink-500">
            Expires {formatDate(code.expires_at)}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function LifecycleChip({
  status,
  isVisible,
}: {
  status: LifecycleStatus;
  isVisible: boolean;
}) {
  if (status === 'active' && isVisible) {
    return (
      <span className="rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[1px] text-success">
        Active
      </span>
    );
  }

  if (status === 'expired') {
    return (
      <span className="rounded-full bg-surface-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[1px] text-ink-500">
        Expired
      </span>
    );
  }

  if (status === 'superseded') {
    return (
      <span className="rounded-full bg-surface-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[1px] text-ink-500">
        Superseded
      </span>
    );
  }

  return (
    <span className="rounded-full bg-warning/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[1px] text-warning">
      Under review
    </span>
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

function SummaryCard({ label, value }: { label: string; value: number }) {
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
        <DoorOpen size={22} />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">No access codes</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
        {hasLocations
          ? 'No community-submitted access codes exist for your locations yet. Codes appear here once guests contribute them through the StallPass app.'
          : 'Claim a location first, then access codes submitted by guests will appear here.'}
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

function countLocationsWithCodes(codes: AccessCodeRow[]): number {
  return new Set(codes.map((code) => code.bathroom_id)).size;
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
