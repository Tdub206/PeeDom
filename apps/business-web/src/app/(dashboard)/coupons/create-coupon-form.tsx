'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBusinessCoupon, type CreateBusinessCouponResult } from './actions';

export interface CouponLocationOption {
  bathroom_id: string;
  place_name: string;
  business_name: string | null;
  address: string;
}

interface CreateCouponFormProps {
  locations: CouponLocationOption[];
}

type CouponType = 'percent_off' | 'dollar_off' | 'bogo' | 'free_item' | 'custom';

interface CouponTypeConfig {
  value: CouponType;
  label: string;
  description: string;
  needsValue: boolean;
  valueSymbol?: string;
}

const COUPON_TYPES: CouponTypeConfig[] = [
  {
    value: 'percent_off',
    label: 'Percent off',
    description: 'Discount a percentage off the total purchase.',
    needsValue: true,
    valueSymbol: '%',
  },
  {
    value: 'dollar_off',
    label: 'Dollar off',
    description: 'Knock a flat dollar amount off the purchase.',
    needsValue: true,
    valueSymbol: '$',
  },
  {
    value: 'bogo',
    label: 'Buy one, get one',
    description: 'Offer a free or discounted item with a purchase.',
    needsValue: false,
  },
  {
    value: 'free_item',
    label: 'Free item',
    description: 'Give away a specific item with a visit.',
    needsValue: false,
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Anything that does not fit the standard templates.',
    needsValue: false,
  },
];

const EXPIRY_PRESETS: { label: string; days: number | null }[] = [
  { label: 'No expiration', days: null },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

type SaveState = 'idle' | 'saving' | 'success' | 'error';

interface FormDraft {
  bathroomId: string;
  title: string;
  description: string;
  couponType: CouponType;
  value: string;
  minPurchase: string;
  couponCode: string;
  maxRedemptions: string;
  expiryDays: number | null;
  premiumOnly: boolean;
}

function initialDraft(locations: CouponLocationOption[]): FormDraft {
  return {
    bathroomId: locations[0]?.bathroom_id ?? '',
    title: '',
    description: '',
    couponType: 'percent_off',
    value: '',
    minPurchase: '',
    couponCode: '',
    maxRedemptions: '',
    expiryDays: 30,
    premiumOnly: true,
  };
}

export function CreateCouponForm({ locations }: CreateCouponFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<FormDraft>(() => initialDraft(locations));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedType = useMemo(
    () => COUPON_TYPES.find((entry) => entry.value === draft.couponType) ?? COUPON_TYPES[0],
    [draft.couponType]
  );

  const canSubmit = useMemo(() => {
    if (!draft.bathroomId) return false;
    if (!draft.title.trim()) return false;
    if (selectedType.needsValue) {
      const numeric = Number(draft.value);
      if (!draft.value || Number.isNaN(numeric) || numeric <= 0) return false;
      if (draft.couponType === 'percent_off' && numeric > 100) return false;
    }
    return true;
  }, [draft, selectedType]);

  function updateField<K extends keyof FormDraft>(key: K, value: FormDraft[K]) {
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || isPending) return;

    const now = new Date();
    const expiresAt =
      draft.expiryDays === null
        ? null
        : new Date(now.getTime() + draft.expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      bathroom_id: draft.bathroomId,
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      coupon_type: draft.couponType,
      value: selectedType.needsValue && draft.value ? Number(draft.value) : null,
      min_purchase: draft.minPurchase ? Number(draft.minPurchase) : null,
      coupon_code: draft.couponCode.trim() || undefined,
      max_redemptions: draft.maxRedemptions ? Number(draft.maxRedemptions) : null,
      expires_at: expiresAt,
      premium_only: draft.premiumOnly,
    };

    setSaveState('saving');
    setMessage('Saving your coupon...');
    setFieldErrors({});

    startTransition(async () => {
      const result = await createBusinessCoupon(payload);
      applyResult(result);
    });
  }

  function applyResult(result: CreateBusinessCouponResult) {
    if (!result.ok) {
      setSaveState('error');
      setMessage(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    setSaveState('success');
    setMessage(`Coupon created. Code: ${result.couponCode}`);
    setFieldErrors({});
    setDraft(initialDraft(locations));
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card"
    >
      <FieldRow label="Location" error={fieldErrors.bathroom_id}>
        <select
          className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
          value={draft.bathroomId}
          disabled={isPending}
          onChange={(event) => updateField('bathroomId', event.target.value)}
        >
          {locations.map((location) => (
            <option key={location.bathroom_id} value={location.bathroom_id}>
              {location.business_name
                ? `${location.business_name} — ${location.place_name}`
                : location.place_name}
            </option>
          ))}
        </select>
      </FieldRow>

      <FieldRow label="Title" error={fieldErrors.title}>
        <input
          type="text"
          maxLength={100}
          placeholder="10% off any drink"
          className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
          value={draft.title}
          disabled={isPending}
          onChange={(event) => updateField('title', event.target.value)}
        />
      </FieldRow>

      <FieldRow label="Description" helper="Up to 500 characters." error={fieldErrors.description}>
        <textarea
          rows={3}
          maxLength={500}
          placeholder="Valid during store hours. One per guest."
          className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-brand-500"
          value={draft.description}
          disabled={isPending}
          onChange={(event) => updateField('description', event.target.value)}
        />
      </FieldRow>

      <FieldRow label="Coupon type">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {COUPON_TYPES.map((entry) => {
            const isSelected = entry.value === draft.couponType;
            return (
              <button
                key={entry.value}
                type="button"
                disabled={isPending}
                onClick={() => updateField('couponType', entry.value)}
                className={`rounded-2xl border p-3 text-left transition ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50 text-brand-900'
                    : 'border-surface-strong bg-surface-base text-ink-900 hover:border-brand-200'
                }`}
              >
                <div className="text-sm font-bold">{entry.label}</div>
                <div className="mt-1 text-xs text-ink-500">{entry.description}</div>
              </button>
            );
          })}
        </div>
      </FieldRow>

      {selectedType.needsValue ? (
        <FieldRow
          label={`Discount value (${selectedType.valueSymbol ?? ''})`}
          error={fieldErrors.value}
        >
          <input
            type="number"
            min="0"
            max={draft.couponType === 'percent_off' ? '100' : undefined}
            step="0.01"
            inputMode="decimal"
            placeholder={draft.couponType === 'percent_off' ? '10' : '5.00'}
            className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
            value={draft.value}
            disabled={isPending}
            onChange={(event) => updateField('value', event.target.value)}
          />
        </FieldRow>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldRow
          label="Minimum purchase"
          helper="Optional. Leave blank for no minimum."
          error={fieldErrors.min_purchase}
        >
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
            value={draft.minPurchase}
            disabled={isPending}
            onChange={(event) => updateField('minPurchase', event.target.value)}
          />
        </FieldRow>

        <FieldRow
          label="Redemption limit"
          helper="Optional. Leave blank for unlimited."
          error={fieldErrors.max_redemptions}
        >
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="100"
            className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold text-ink-900 outline-none transition focus:border-brand-500"
            value={draft.maxRedemptions}
            disabled={isPending}
            onChange={(event) => updateField('maxRedemptions', event.target.value)}
          />
        </FieldRow>
      </div>

      <FieldRow
        label="Custom code"
        helper="Optional. Leave blank to auto-generate a code."
        error={fieldErrors.coupon_code}
      >
        <input
          type="text"
          maxLength={30}
          placeholder="SPRING25"
          className="w-full rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-sm font-semibold uppercase tracking-[1.5px] text-ink-900 outline-none transition focus:border-brand-500"
          value={draft.couponCode}
          disabled={isPending}
          onChange={(event) => updateField('couponCode', event.target.value.toUpperCase())}
        />
      </FieldRow>

      <FieldRow label="Expires in">
        <div className="flex flex-wrap gap-2">
          {EXPIRY_PRESETS.map((preset) => {
            const isSelected = draft.expiryDays === preset.days;
            return (
              <button
                key={preset.label}
                type="button"
                disabled={isPending}
                onClick={() => updateField('expiryDays', preset.days)}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] transition ${
                  isSelected
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-surface-strong bg-surface-base text-ink-700 hover:border-brand-200'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </FieldRow>

      <FieldRow label="Audience">
        <button
          type="button"
          disabled={isPending}
          onClick={() => updateField('premiumOnly', !draft.premiumOnly)}
          className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
            draft.premiumOnly
              ? 'border-brand-500 bg-brand-50 text-brand-900'
              : 'border-surface-strong bg-surface-base text-ink-900 hover:border-brand-200'
          }`}
        >
          <div
            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${
              draft.premiumOnly
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-surface-strong bg-surface-base'
            }`}
          >
            {draft.premiumOnly ? <CheckCircle2 size={12} /> : null}
          </div>
          <div>
            <div className="text-sm font-bold">Premium members only</div>
            <div className="mt-1 text-xs text-ink-500">
              When on, only StallPass Premium guests can redeem this coupon. Turn it off to make
              it available to every guest.
            </div>
          </div>
        </button>
      </FieldRow>

      <div className="mt-2 flex flex-col gap-3 border-t border-surface-strong pt-5 sm:flex-row sm:items-center sm:justify-between">
        <StatusMessage saveState={saveState} message={message} />
        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isPending ? 'Saving...' : 'Create coupon'}
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
      <p className="text-sm text-ink-500">
        Coupons save through a server action after ownership is re-checked.
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
    <div className={`inline-flex items-center gap-2 text-sm font-semibold ${toneClass}`}>
      {icon}
      <span>{message}</span>
    </div>
  );
}
