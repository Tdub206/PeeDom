import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  DoorOpen,
  Lock,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import {
  getApprovedLocations,
  getBusinessLocationCodes,
  type ApprovedLocation,
  type BusinessLocationCodeRow,
} from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CodeRevealCard } from './code-reveal-card';
import { AccessCodeForm } from './access-code-form';

export const metadata: Metadata = {
  title: 'Access codes',
};

export default async function AccessCodesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { locations, error: locationsError } = await getApprovedLocations(supabase, user.id);

  const codesByLocation = await Promise.all(
    locations.map(async (location) => {
      const { codes, error } = await getBusinessLocationCodes(
        supabase,
        user.id,
        location.bathroom_id
      );
      return { location, codes, error };
    })
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Access codes
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Door &amp; entry codes
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-600">
        Publish authoritative codes for each claimed location. Owner-submitted codes bypass the
        community reveal paywall and immediately supersede older community entries.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-4xl border border-brand-200 bg-brand-50 px-5 py-4 shadow-card">
        <ShieldCheck size={18} className="mt-0.5 flex-none text-brand-700" />
        <div className="text-sm leading-6 text-ink-600">
          <span className="font-bold text-ink-900">Codes stay inside StallPass.</span> Only verified
          guests with the app can reveal them. We never display your codes on public surfaces.
        </div>
      </div>

      {locationsError ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {locationsError}
        </div>
      ) : null}

      {!locationsError && locations.length === 0 ? (
        <NoLocationsEmptyState />
      ) : (
        <section className="mt-8 grid gap-6">
          {codesByLocation.map(({ location, codes, error }) => (
            <LocationCodeCard
              key={location.bathroom_id}
              location={location}
              codes={codes}
              loadError={error}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function LocationCodeCard({
  location,
  codes,
  loadError,
}: {
  location: ApprovedLocation;
  codes: BusinessLocationCodeRow[];
  loadError: string | null;
}) {
  const activeCode = codes.find(
    (code) => code.lifecycle_status === 'active' && code.visibility_status === 'visible'
  );
  const historicalCodes = codes.filter((code) => code.id !== activeCode?.id);

  return (
    <article className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
      <header className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Building2 size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            {location.business_name ?? 'Managed location'}
          </div>
          <h3 className="mt-1 text-lg font-black tracking-tight text-ink-900">
            {location.place_name}
          </h3>
          <div className="mt-1 text-xs text-ink-500">{location.address}</div>
        </div>
        <Link
          href={`/locations/${location.bathroom_id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-ink-700 transition hover:bg-surface-strong"
        >
          Location detail
          <ArrowRight size={12} />
        </Link>
      </header>

      <div className="mt-5 border-t border-surface-strong pt-5">
        {loadError ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {loadError}
          </div>
        ) : (
          <div className="grid gap-5">
            <CodeRevealCard activeCode={activeCode ?? null} />
            <AccessCodeForm
              bathroomId={location.bathroom_id}
              hasActiveCode={Boolean(activeCode)}
            />
            {historicalCodes.length > 0 ? (
              <HistoricalCodes codes={historicalCodes} />
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

function HistoricalCodes({ codes }: { codes: BusinessLocationCodeRow[] }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
        History
      </div>
      <ul className="grid gap-2">
        {codes.map((code) => (
          <li
            key={code.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-surface-strong bg-surface-base px-4 py-3"
          >
            <span className="font-mono text-sm font-bold tracking-[0.2em] text-ink-900">
              {maskCode(code.code_value)}
            </span>
            <LifecycleBadge status={code.lifecycle_status} />
            <VisibilityBadge status={code.visibility_status} />
            <div className="flex items-center gap-1 text-xs font-semibold text-success">
              <ThumbsUp size={12} />
              {code.up_votes}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-danger">
              <ThumbsDown size={12} />
              {code.down_votes}
            </div>
            <div className="flex items-center gap-1 text-xs text-ink-500">
              <CalendarClock size={12} />
              {formatDate(code.created_at)}
            </div>
            <div className="ml-auto text-[11px] font-bold uppercase tracking-[1px] text-ink-500">
              Confidence {formatConfidence(code.confidence_score)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LifecycleBadge({ status }: { status: BusinessLocationCodeRow['lifecycle_status'] }) {
  const toneClass =
    status === 'active'
      ? 'bg-success/10 text-success'
      : status === 'superseded'
        ? 'bg-surface-muted text-ink-600'
        : 'bg-warning/10 text-warning';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1px] ${toneClass}`}
    >
      {status}
    </span>
  );
}

function VisibilityBadge({ status }: { status: BusinessLocationCodeRow['visibility_status'] }) {
  if (status === 'visible') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1px] text-brand-700">
        <CheckCircle2 size={10} />
        Visible
      </span>
    );
  }

  const toneClass =
    status === 'needs_review' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[1px] ${toneClass}`}
    >
      <Lock size={10} />
      {status.replace('_', ' ')}
    </span>
  );
}

function NoLocationsEmptyState() {
  return (
    <div className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <DoorOpen size={22} />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">
        No approved locations yet
      </h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
        Once a claim is approved you can publish authoritative access codes for that location.
      </p>
      <Link
        href="/locations"
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700"
      >
        Manage locations
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

function maskCode(value: string): string {
  if (value.length <= 2) return '••';
  return `${value.slice(0, 1)}••${value.slice(-1)}`;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatConfidence(score: number): string {
  if (!Number.isFinite(score)) return '—';
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
