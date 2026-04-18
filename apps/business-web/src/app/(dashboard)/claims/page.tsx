import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  FileText,
  XCircle,
} from 'lucide-react';
import {
  getBusinessClaims,
  type BusinessClaimRow,
} from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Claim History',
};

type ReviewStatus = BusinessClaimRow['review_status'];

const STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; tone: 'brand' | 'success' | 'warning' | 'danger'; icon: React.ReactNode }
> = {
  pending: { label: 'Pending', tone: 'warning', icon: <Clock size={14} /> },
  approved: { label: 'Approved', tone: 'success', icon: <CheckCircle2 size={14} /> },
  rejected: { label: 'Rejected', tone: 'danger', icon: <XCircle size={14} /> },
};

export default async function ClaimsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { claims, error } = await getBusinessClaims(supabase, user.id);

  const pending = claims.filter((claim) => claim.review_status === 'pending');
  const approved = claims.filter((claim) => claim.review_status === 'approved');
  const rejected = claims.filter((claim) => claim.review_status === 'rejected');

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Claim history
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Ownership claims
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-600">
        Every ownership claim tied to your account, grouped by review status.
      </p>

      {error ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {error}
        </div>
      ) : null}

      {!error && claims.length === 0 ? <EmptyState /> : null}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Pending" value={pending.length} tone="warning" />
        <SummaryCard label="Approved" value={approved.length} tone="success" />
        <SummaryCard label="Rejected" value={rejected.length} tone="danger" />
      </div>

      {pending.length > 0 ? (
        <ClaimGroup title="Pending review" claims={pending} />
      ) : null}

      {approved.length > 0 ? (
        <ClaimGroup title="Approved" claims={approved} />
      ) : null}

      {rejected.length > 0 ? (
        <ClaimGroup title="Rejected" claims={rejected} />
      ) : null}
    </div>
  );
}

function ClaimGroup({
  title,
  claims,
}: {
  title: string;
  claims: Array<BusinessClaimRow & { place_name: string | null; address: string | null }>;
}) {
  return (
    <section className="mt-8">
      <div className="mb-4 text-lg font-black tracking-tight text-ink-900">{title}</div>
      <div className="grid grid-cols-1 gap-4">
        {claims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>
    </section>
  );
}

function ClaimCard({
  claim,
}: {
  claim: BusinessClaimRow & { place_name: string | null; address: string | null };
}) {
  return (
    <article className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <FileText size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-black tracking-tight text-ink-900">
              {claim.business_name}
            </h3>
            <StatusChip status={claim.review_status} />
          </div>
          {claim.place_name ? (
            <div className="mt-1 text-sm font-semibold text-ink-700">{claim.place_name}</div>
          ) : null}
          {claim.address ? (
            <div className="mt-1 text-sm text-ink-500">{claim.address}</div>
          ) : null}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-surface-strong pt-4 sm:grid-cols-4">
        <MetaItem label="Submitted" value={formatDate(claim.created_at)} />
        <MetaItem label="Contact" value={claim.contact_email} />
        {claim.reviewed_at ? (
          <MetaItem label="Reviewed" value={formatDate(claim.reviewed_at)} />
        ) : (
          <MetaItem label="Reviewed" value="Awaiting review" />
        )}
        <MetaItem
          label="Plan"
          value={claim.is_lifetime_free ? 'Lifetime access' : 'Standard'}
        />
      </dl>

      {claim.evidence_url ? (
        <div className="mt-4 text-xs text-ink-500">
          Evidence: <span className="font-semibold text-ink-700">{claim.evidence_url}</span>
        </div>
      ) : null}
    </article>
  );
}

function StatusChip({ status }: { status: ReviewStatus }) {
  const config = STATUS_CONFIG[status];
  const toneClasses: Record<string, string> = {
    warning: 'bg-warning/10 text-warning',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    brand: 'bg-brand-50 text-brand-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[1px] ${toneClasses[config.tone]}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[1.3px] text-ink-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'success' | 'warning' | 'danger';
}) {
  const toneClasses: Record<string, string> = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</div>
      <div className={`mt-1 text-3xl font-black tracking-tight ${toneClasses[tone].split(' ')[1]}`}>
        {value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <FileText size={22} />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">No claims yet</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
        Once you submit an ownership claim for a bathroom through the StallPass app, it will
        appear here with its review status.
      </p>
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
