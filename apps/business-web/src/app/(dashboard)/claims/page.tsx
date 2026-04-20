import type { Metadata } from 'next';
import { Bell, CheckCircle2, Clock3, FileText, XCircle } from 'lucide-react';
import { redirect } from 'next/navigation';
import {
  getBusinessClaims,
  getClaimableBathrooms,
  type BusinessClaimListItem,
} from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CreateClaimForm } from './create-claim-form';

export const metadata: Metadata = {
  title: 'Claim history',
};

export default async function ClaimsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ claims, error }, { bathrooms, error: bathroomsError }] = await Promise.all([
    getBusinessClaims(supabase, user.id),
    getClaimableBathrooms(supabase, user.id),
  ]);

  const pendingClaims = claims.filter((claim) => claim.review_status === 'pending');

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Claim history
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Ownership claims
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-600">
        Track every ownership verification tied to your account. Approved claims flow straight into
        Locations, while pending claims stay visible here until review is complete.
      </p>

      {error ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {error}
        </div>
      ) : null}

      {bathroomsError ? (
        <div className="mt-4 rounded-4xl border border-warning/20 bg-warning/10 px-6 py-5 text-sm text-warning shadow-card">
          {bathroomsError}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="grid gap-4">
          <StatusKey />
          <CreateClaimForm bathrooms={bathrooms} defaultEmail={user.email ?? ''} />
        </div>

        <div className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            Review queue
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">
            Current status
          </div>

          {pendingClaims.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <Bell size={16} className="mt-1 flex-none text-warning" />
                <div className="text-sm leading-6 text-ink-600">
                  <span className="font-bold text-ink-900">
                    You have {pendingClaims.length} pending claim{pendingClaims.length === 1 ? '' : 's'}.
                  </span>{' '}
                  The review team usually responds within 1 to 3 business days. You will still get
                  an email when the status changes.
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-surface-strong bg-surface-base p-4 text-sm leading-6 text-ink-600">
              No claims are currently waiting on review.
            </div>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
              Submitted claims
            </div>
            <div className="mt-1 text-xl font-black tracking-tight text-ink-900">
              Claim table
            </div>
          </div>

          <div className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm text-ink-600">
            Total claims: <span className="font-bold text-ink-900">{claims.length}</span>
          </div>
        </div>

        {claims.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-surface-strong bg-surface-base p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <FileText size={22} />
            </div>
            <div className="mt-4 text-xl font-black tracking-tight text-ink-900">
              No claims submitted yet
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              Use the form above to send your first ownership review request.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Address</th>
                  <th className="px-4 py-2">Submitted</th>
                  <th className="px-4 py-2">Reviewed</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <ClaimRow key={claim.id} claim={claim} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusKey() {
  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
        Status guide
      </div>
      <div className="mt-4 grid gap-3">
        <StatusKeyRow
          badge={<StatusBadge status="approved" />}
          text="Approved claims are live in your Locations dashboard."
        />
        <StatusKeyRow
          badge={<StatusBadge status="pending" />}
          text="Pending claims are under manual review."
        />
        <StatusKeyRow
          badge={<StatusBadge status="rejected" />}
          text="Rejected claims need updated proof or business details before retrying."
        />
      </div>
    </div>
  );
}

function StatusKeyRow({
  badge,
  text,
}: {
  badge: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      {badge}
      <div className="text-sm leading-6 text-ink-600">{text}</div>
    </div>
  );
}

function ClaimRow({ claim }: { claim: BusinessClaimListItem }) {
  return (
    <tr className="rounded-2xl bg-surface-base text-sm text-ink-600">
      <td className="rounded-l-2xl px-4 py-4">
        <div className="font-bold text-ink-900">{claim.location_name}</div>
        <div className="mt-1 text-xs text-ink-500">{claim.business_name}</div>
      </td>
      <td className="px-4 py-4">{claim.address}</td>
      <td className="px-4 py-4">{formatDate(claim.created_at)}</td>
      <td className="px-4 py-4">
        {claim.reviewed_at ? (
          formatDate(claim.reviewed_at)
        ) : (
          <span className="text-ink-500">Pending</span>
        )}
      </td>
      <td className="rounded-r-2xl px-4 py-4">
        <StatusBadge status={claim.review_status} />
      </td>
    </tr>
  );
}

function StatusBadge({
  status,
}: {
  status: BusinessClaimListItem['review_status'];
}) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[1px] text-success">
        <CheckCircle2 size={12} />
        Approved
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[1px] text-danger">
        <XCircle size={12} />
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[1px] text-warning">
      <Clock3 size={12} />
      Under review
    </span>
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
