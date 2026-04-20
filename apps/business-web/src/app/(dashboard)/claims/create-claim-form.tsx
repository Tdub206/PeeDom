'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Plus, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ClaimableBathroomOption } from '@/lib/business/queries';
import { createBusinessClaim, type CreateBusinessClaimResult } from './actions';

interface CreateClaimFormProps {
  bathrooms: ClaimableBathroomOption[];
  defaultEmail: string;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

interface ClaimDraft {
  bathroomId: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  evidenceUrl: string;
}

function buildInitialDraft(bathrooms: ClaimableBathroomOption[], defaultEmail: string): ClaimDraft {
  return {
    bathroomId: bathrooms[0]?.id ?? '',
    businessName: '',
    contactEmail: defaultEmail,
    contactPhone: '',
    evidenceUrl: '',
  };
}

export function CreateClaimForm({ bathrooms, defaultEmail }: CreateClaimFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<ClaimDraft>(() => buildInitialDraft(bathrooms, defaultEmail));

  const canSubmit = useMemo(() => {
    return (
      draft.bathroomId.length > 0 &&
      draft.businessName.trim().length > 0 &&
      draft.contactEmail.trim().length > 0
    );
  }, [draft]);

  function updateField<K extends keyof ClaimDraft>(key: K, value: ClaimDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key as string]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[key as string];
        return next;
      });
    }
    setSaveState('idle');
    setMessage(null);
  }

  function resetForm() {
    setDraft(buildInitialDraft(bathrooms, defaultEmail));
    setSaveState('idle');
    setMessage(null);
    setFieldErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || isPending) {
      return;
    }

    setSaveState('saving');
    setMessage('Submitting your ownership claim...');
    setFieldErrors({});

    startTransition(async () => {
      const result = await createBusinessClaim({
        bathroom_id: draft.bathroomId,
        business_name: draft.businessName.trim(),
        contact_email: draft.contactEmail.trim().toLowerCase(),
        contact_phone: draft.contactPhone.trim() || undefined,
        evidence_url: draft.evidenceUrl.trim() || undefined,
      });

      applyResult(result);
    });
  }

  function applyResult(result: CreateBusinessClaimResult) {
    if (!result.ok) {
      setSaveState('error');
      setMessage(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    setSaveState('success');
    setMessage('Claim submitted. We will email you once it is reviewed.');
    setIsOpen(false);
    resetForm();
    router.refresh();
  }

  if (!isOpen) {
    return (
      <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
              New claim
            </div>
            <div className="mt-1 text-sm leading-6 text-ink-600">
              Submit a fresh ownership claim for a bathroom already in the StallPass directory.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={bathrooms.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            <Plus size={16} />
            New claim
          </button>
        </div>

        <StatusMessage saveState={saveState} message={message} />

        {bathrooms.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-ink-600">
            There are no claimable locations in the current shortlist. If your location is missing,
            add it in the mobile app first, then return here to submit the claim.
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            New claim
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">
            Submit an ownership review
          </div>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setIsOpen(false);
            resetForm();
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-strong bg-surface-card text-ink-500 transition hover:border-brand-200 hover:text-brand-700"
          aria-label="Cancel claim form"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-sm leading-6 text-ink-600">
        Choose a location already in StallPass. If your business is not listed yet, add it in the
        mobile app first so there is a bathroom record to claim.
      </div>

      <div className="mt-5 grid gap-4">
        <FieldRow label="Location" error={fieldErrors.bathroom_id}>
          <select
            className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
            value={draft.bathroomId}
            disabled={isPending}
            onChange={(event) => updateField('bathroomId', event.target.value)}
          >
            {bathrooms.map((bathroom) => (
              <option key={bathroom.id} value={bathroom.id}>
                {bathroom.place_name} - {bathroom.address}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="Business name" error={fieldErrors.business_name}>
          <input
            type="text"
            maxLength={120}
            placeholder="Corner Cafe"
            className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
            value={draft.businessName}
            disabled={isPending}
            onChange={(event) => updateField('businessName', event.target.value)}
          />
        </FieldRow>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldRow label="Contact email" error={fieldErrors.contact_email}>
            <input
              type="email"
              className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
              value={draft.contactEmail}
              disabled={isPending}
              onChange={(event) => updateField('contactEmail', event.target.value)}
            />
          </FieldRow>

          <FieldRow label="Contact phone" helper="Optional." error={fieldErrors.contact_phone}>
            <input
              type="tel"
              maxLength={30}
              placeholder="(555) 555-5555"
              className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
              value={draft.contactPhone}
              disabled={isPending}
              onChange={(event) => updateField('contactPhone', event.target.value)}
            />
          </FieldRow>
        </div>

        <FieldRow
          label="Proof URL"
          helper="Optional. Link to a business license, invoice, or ownership proof."
          error={fieldErrors.evidence_url}
        >
          <input
            type="url"
            placeholder="https://example.com/proof"
            className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
            value={draft.evidenceUrl}
            disabled={isPending}
            onChange={(event) => updateField('evidenceUrl', event.target.value)}
          />
        </FieldRow>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-surface-strong pt-5 sm:flex-row sm:items-center sm:justify-between">
        <StatusMessage saveState={saveState} message={message} />
        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isPending ? 'Submitting...' : 'Submit claim'}
        </button>
      </div>
    </form>
  );
}

function FieldRow({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</span>
      {children}
      {error ? (
        <span className="text-xs font-semibold text-danger">{error}</span>
      ) : helper ? (
        <span className="text-xs text-ink-500">{helper}</span>
      ) : null}
    </label>
  );
}

function StatusMessage({
  saveState,
  message,
}: {
  saveState: SaveState;
  message: string | null;
}) {
  if (!message) {
    return (
      <p className="mt-4 text-sm text-ink-500">
        Claim submissions use the same ownership-review RPC as the mobile app.
      </p>
    );
  }

  const icon =
    saveState === 'error' ? (
      <AlertTriangle size={16} />
    ) : saveState === 'success' ? (
      <CheckCircle2 size={16} />
    ) : (
      <Loader2 size={16} className="animate-spin" />
    );

  const toneClass =
    saveState === 'error'
      ? 'text-danger'
      : saveState === 'success'
        ? 'text-success'
        : 'text-ink-600';

  return (
    <div className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${toneClass}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}
