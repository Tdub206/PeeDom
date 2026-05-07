'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  upsertBusinessBathroomSettings,
  type UpsertBusinessBathroomSettingsResult,
} from './actions';

interface VisibilitySettingsFormProps {
  bathroomId: string;
  requiresPremiumAccess: boolean;
  showOnFreeMap: boolean;
  isLocationVerified: boolean;
  isLocked: boolean;
}

interface VisibilitySettingsState {
  bathroom_id: string;
  requires_premium_access: boolean;
  show_on_free_map: boolean;
  is_location_verified: boolean;
  is_locked: boolean;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';
type RowTone = 'brand' | 'success';

export function VisibilitySettingsForm({
  bathroomId,
  requiresPremiumAccess,
  showOnFreeMap,
  isLocationVerified,
  isLocked,
}: VisibilitySettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmedState, setConfirmedState] = useState<VisibilitySettingsState>(() =>
    normalizeState({
      bathroom_id: bathroomId,
      requires_premium_access: requiresPremiumAccess,
      show_on_free_map: showOnFreeMap,
      is_location_verified: isLocationVerified,
      is_locked: isLocked,
    })
  );
  const [draftState, setDraftState] = useState<VisibilitySettingsState>(confirmedState);

  useEffect(() => {
    const nextState = normalizeState({
      bathroom_id: bathroomId,
      requires_premium_access: requiresPremiumAccess,
      show_on_free_map: showOnFreeMap,
      is_location_verified: isLocationVerified,
      is_locked: isLocked,
    });

    setConfirmedState(nextState);
    setDraftState(nextState);
    setSaveState('idle');
    setMessage(null);
  }, [bathroomId, isLocationVerified, isLocked, requiresPremiumAccess, showOnFreeMap]);

  const hasChanges = useMemo(
    () =>
      draftState.requires_premium_access !== confirmedState.requires_premium_access ||
      draftState.show_on_free_map !== confirmedState.show_on_free_map ||
      draftState.is_location_verified !== confirmedState.is_location_verified ||
      draftState.is_locked !== confirmedState.is_locked,
    [confirmedState, draftState]
  );

  function updateDraftState(
    key: keyof Pick<
      VisibilitySettingsState,
      'requires_premium_access' | 'show_on_free_map' | 'is_location_verified' | 'is_locked'
    >,
    value: boolean
  ) {
    setDraftState((currentState) => normalizeState({ ...currentState, [key]: value }));
    setSaveState('idle');
    setMessage(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || !hasChanges) {
      return;
    }

    const nextState = normalizeState(draftState);
    const previousConfirmedState = confirmedState;

    setDraftState(nextState);
    setSaveState('saving');
    setMessage('Saving StallPass settings...');

    startTransition(() => {
      void submitSettings(nextState, previousConfirmedState);
    });
  }

  async function submitSettings(
    nextState: VisibilitySettingsState,
    previousConfirmedState: VisibilitySettingsState
  ) {
    try {
      const result = await upsertBusinessBathroomSettings(nextState);
      applyActionResult(result, nextState, previousConfirmedState);
    } catch {
      setDraftState(previousConfirmedState);
      setSaveState('error');
      setMessage('Unable to save StallPass settings right now. Try again in a moment.');
    }
  }

  function applyActionResult(
    result: UpsertBusinessBathroomSettingsResult,
    nextState: VisibilitySettingsState,
    previousConfirmedState: VisibilitySettingsState
  ) {
    if (!result.ok) {
      setDraftState(previousConfirmedState);
      setSaveState('error');
      setMessage(result.error);
      return;
    }

    setConfirmedState(nextState);
    setDraftState(nextState);
    setSaveState('success');
    setMessage('Settings saved.');
    router.refresh();
  }

  return (
    <form className="grid grid-cols-1 gap-3" onSubmit={handleSubmit}>
      <SettingRow
        label="Premium-only listing"
        description="When on, this bathroom stays premium-gated. Turning it off keeps the location visible on the free map."
        value={draftState.requires_premium_access}
        disabled={isPending}
        tone="brand"
        onChange={(value) => updateDraftState('requires_premium_access', value)}
      />
      <SettingRow
        label="Also show on free map"
        description={
          draftState.requires_premium_access
            ? 'Control whether premium-gated locations also appear on the free map.'
            : 'Public locations must stay visible on the free map.'
        }
        value={draftState.show_on_free_map}
        disabled={isPending || !draftState.requires_premium_access}
        tone="brand"
        onChange={(value) => updateDraftState('show_on_free_map', value)}
      />
      <SettingRow
        label="Location verified"
        description="Confirms the saved address and pin coordinates are accurate."
        value={draftState.is_location_verified}
        disabled={isPending}
        tone="success"
        onChange={(value) => updateDraftState('is_location_verified', value)}
      />
      <SettingRow
        label="Require access code"
        description="When on, users must enter a valid access code to unlock this bathroom in the app."
        value={draftState.is_locked}
        disabled={isPending}
        tone="brand"
        onChange={(value) => updateDraftState('is_locked', value)}
      />

      <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <StatusMessage saveState={saveState} message={message} />
          <button
            type="submit"
            disabled={isPending || !hasChanges}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isPending ? 'Saving...' : hasChanges ? 'Save changes' : 'No changes'}
          </button>
        </div>
      </div>
    </form>
  );
}

function SettingRow({
  label,
  description,
  value,
  disabled,
  tone,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled: boolean;
  tone: RowTone;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      className={`flex items-start gap-4 rounded-4xl border p-5 shadow-card ${
        value ? 'border-brand-200 bg-brand-50' : 'border-surface-strong bg-surface-card'
      } ${disabled ? 'opacity-70' : ''}`}
    >
      <div className="flex-1">
        <div className={`text-base font-bold ${value ? 'text-brand-900' : 'text-ink-900'}`}>
          {label}
        </div>
        <div className="mt-1 text-xs leading-5 text-ink-600">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full border transition disabled:cursor-not-allowed ${
          value
            ? tone === 'success'
              ? 'border-success bg-success'
              : 'border-brand-600 bg-brand-600'
            : 'border-surface-strong bg-surface-muted'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
            value ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
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
        Changes save through a server action after ownership is re-checked.
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

function normalizeState(state: VisibilitySettingsState): VisibilitySettingsState {
  if (!state.requires_premium_access) {
    return { ...state, show_on_free_map: true };
  }

  return state;
}
