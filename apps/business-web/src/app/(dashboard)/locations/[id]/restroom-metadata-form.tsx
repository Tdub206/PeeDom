'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type {
  BathroomAccessibilityDetails,
  BathroomNeedMetadata,
} from '@mobile/types/index';
import type { UpdateBusinessRestroomMetadataInput } from '@/lib/business/schemas';
import {
  upsertBusinessRestroomMetadata,
  type UpsertBusinessRestroomMetadataResult,
} from './actions';

interface RestroomMetadataFormProps {
  bathroomId: string;
  initialNeedMetadata: BathroomNeedMetadata | null;
  initialAccessibilityDetails: BathroomAccessibilityDetails | null;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';
type BooleanValue = 'unknown' | 'true' | 'false';

const ACCESS_TYPE_OPTIONS: Array<NonNullable<BathroomNeedMetadata['access_type']>> = [
  'unknown',
  'public',
  'customer_only',
  'ask_employee',
  'key_required',
  'code_required',
  'employee_only',
];

const PRIVACY_LEVEL_OPTIONS: Array<NonNullable<BathroomNeedMetadata['privacy_level']>> = [
  'unknown',
  'low',
  'medium',
  'high',
  'single_user',
];

export function RestroomMetadataForm({
  bathroomId,
  initialNeedMetadata,
  initialAccessibilityDetails,
}: RestroomMetadataFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [confirmedState, setConfirmedState] = useState<UpdateBusinessRestroomMetadataInput>(() =>
    buildInitialState(bathroomId, initialNeedMetadata, initialAccessibilityDetails)
  );
  const [draftState, setDraftState] = useState<UpdateBusinessRestroomMetadataInput>(confirmedState);

  useEffect(() => {
    const nextState = buildInitialState(bathroomId, initialNeedMetadata, initialAccessibilityDetails);
    setConfirmedState(nextState);
    setDraftState(nextState);
    setSaveState('idle');
    setMessage(null);
  }, [bathroomId, initialAccessibilityDetails, initialNeedMetadata]);

  const hasChanges = useMemo(
    () => JSON.stringify(draftState) !== JSON.stringify(confirmedState),
    [confirmedState, draftState]
  );

  function updateDraft<Key extends keyof UpdateBusinessRestroomMetadataInput>(
    key: Key,
    value: UpdateBusinessRestroomMetadataInput[Key]
  ) {
    setDraftState((currentState) => ({
      ...currentState,
      [key]: value,
    }));
    setSaveState('idle');
    setMessage(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || !hasChanges) {
      return;
    }

    const nextState = draftState;
    const previousConfirmedState = confirmedState;

    setSaveState('saving');
    setMessage('Saving verified restroom metadata...');

    startTransition(() => {
      void submitMetadata(nextState, previousConfirmedState);
    });
  }

  async function submitMetadata(
    nextState: UpdateBusinessRestroomMetadataInput,
    previousConfirmedState: UpdateBusinessRestroomMetadataInput
  ) {
    try {
      const result = await upsertBusinessRestroomMetadata(nextState);
      applyActionResult(result, nextState, previousConfirmedState);
    } catch {
      setDraftState(previousConfirmedState);
      setSaveState('error');
      setMessage('Unable to save verified restroom metadata right now. Try again in a moment.');
    }
  }

  function applyActionResult(
    result: UpsertBusinessRestroomMetadataResult,
    nextState: UpdateBusinessRestroomMetadataInput,
    previousConfirmedState: UpdateBusinessRestroomMetadataInput
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
    setMessage('Verified metadata saved.');
    router.refresh();
  }

  return (
    <form className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <FieldGroup title="Supplies" description="Keep urgent supply facts fresh for consumer trust.">
          <TriStateSelect label="Toilet paper" value={draftState.has_toilet_paper} onChange={(value) => updateDraft('has_toilet_paper', value)} />
          <TriStateSelect label="Soap" value={draftState.has_soap} onChange={(value) => updateDraft('has_soap', value)} />
          <TriStateSelect label="Hand dryer" value={draftState.has_hand_dryer} onChange={(value) => updateDraft('has_hand_dryer', value)} />
          <TriStateSelect label="Paper towels" value={draftState.has_paper_towels} onChange={(value) => updateDraft('has_paper_towels', value)} />
        </FieldGroup>

        <FieldGroup title="Access and privacy" description="Set practical access constraints before users arrive.">
          <SelectField
            label="Access type"
            value={draftState.access_type ?? 'unknown'}
            options={ACCESS_TYPE_OPTIONS}
            onChange={(value) => updateDraft('access_type', value === 'unknown' ? null : value)}
          />
          <SelectField
            label="Privacy level"
            value={draftState.privacy_level ?? 'unknown'}
            options={PRIVACY_LEVEL_OPTIONS}
            onChange={(value) => updateDraft('privacy_level', value === 'unknown' ? null : value)}
          />
          <TriStateSelect label="Code required" value={draftState.code_required} onChange={(value) => updateDraft('code_required', value)} />
          <TriStateSelect label="Key required" value={draftState.key_required} onChange={(value) => updateDraft('key_required', value)} />
          <TriStateSelect label="Customer-only" value={draftState.customer_only} onChange={(value) => updateDraft('customer_only', value)} />
          <TriStateSelect label="Ask employee" value={draftState.ask_employee} onChange={(value) => updateDraft('ask_employee', value)} />
        </FieldGroup>

        <FieldGroup title="Care and urgency" description="Support parents, caregivers, privacy needs, and medical urgency.">
          <TriStateSelect label="Changing table" value={draftState.has_changing_table} onChange={(value) => updateDraft('has_changing_table', value)} />
          <TriStateSelect label="Family restroom" value={draftState.has_family_restroom} onChange={(value) => updateDraft('has_family_restroom', value)} />
          <TriStateSelect label="Gender neutral" value={draftState.is_gender_neutral} onChange={(value) => updateDraft('is_gender_neutral', value)} />
          <TriStateSelect label="Single-user" value={draftState.is_single_user} onChange={(value) => updateDraft('is_single_user', value)} />
          <TriStateSelect label="Private room" value={draftState.is_private_room} onChange={(value) => updateDraft('is_private_room', value)} />
          <TriStateSelect label="Medical urgency friendly" value={draftState.medical_urgency_friendly} onChange={(value) => updateDraft('medical_urgency_friendly', value)} />
          <TriStateSelect label="Child friendly" value={draftState.child_friendly} onChange={(value) => updateDraft('child_friendly', value)} />
          <TriStateSelect label="Traveler reliable" value={draftState.outdoor_traveler_reliable} onChange={(value) => updateDraft('outdoor_traveler_reliable', value)} />
        </FieldGroup>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FieldGroup title="Accessibility constraints" description="Concrete constraints beat binary accessible/not-accessible labels.">
          <TriStateSelect label="Wheelchair accessible" value={draftState.wheelchair_accessible} onChange={(value) => updateDraft('wheelchair_accessible', value)} />
          <TriStateSelect label="Grab bars" value={draftState.has_grab_bars} onChange={(value) => updateDraft('has_grab_bars', value)} />
          <TriStateSelect label="Accessible sink" value={draftState.has_accessible_sink} onChange={(value) => updateDraft('has_accessible_sink', value)} />
          <TriStateSelect label="Step-free access" value={draftState.has_step_free_access} onChange={(value) => updateDraft('has_step_free_access', value)} />
          <TriStateSelect label="Power door" value={draftState.has_power_door} onChange={(value) => updateDraft('has_power_door', value)} />
        </FieldGroup>

        <FieldGroup title="Measurements" description="Use inches. Leave unknown values blank rather than guessing.">
          <NumberField label="Stall count" value={draftState.stall_count} min={0} onChange={(value) => updateDraft('stall_count', value)} />
          <NumberField label="Door clear width" value={draftState.door_clear_width_inches} min={0.01} onChange={(value) => updateDraft('door_clear_width_inches', value)} />
          <NumberField label="Turning space" value={draftState.turning_space_inches} min={0.01} onChange={(value) => updateDraft('turning_space_inches', value)} />
          <NumberField label="Stall width" value={draftState.stall_width_inches} min={0.01} onChange={(value) => updateDraft('stall_width_inches', value)} />
          <NumberField label="Stall depth" value={draftState.stall_depth_inches} min={0.01} onChange={(value) => updateDraft('stall_depth_inches', value)} />
        </FieldGroup>
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-bold uppercase tracking-[1.5px] text-ink-500">Accessibility notes</span>
        <textarea
          value={draftState.accessibility_notes ?? ''}
          onChange={(event) => updateDraft('accessibility_notes', event.target.value || null)}
          rows={4}
          className="mt-2 w-full rounded-2xl border border-surface-strong bg-white px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          placeholder="Door angle, ramp location, sink height, or other concrete access details."
        />
      </label>

      <div className="mt-5 flex flex-col gap-4 border-t border-surface-strong pt-5 sm:flex-row sm:items-center sm:justify-between">
        <StatusMessage saveState={saveState} message={message} />
        <button
          type="submit"
          disabled={isPending || !hasChanges}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {isPending ? 'Saving...' : hasChanges ? 'Save verified metadata' : 'No changes'}
        </button>
      </div>
    </form>
  );
}

function FieldGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-surface-strong bg-surface-base p-5">
      <div className="text-sm font-black text-ink-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-ink-500">{description}</div>
      <div className="mt-4 grid grid-cols-1 gap-3">{children}</div>
    </div>
  );
}

function TriStateSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[1px] text-ink-500">{label}</span>
      <select
        value={formatBooleanValue(value)}
        onChange={(event) => onChange(parseBooleanValue(event.target.value as BooleanValue))}
        className="mt-1 w-full rounded-xl border border-surface-strong bg-white px-3 py-2 text-sm font-semibold text-ink-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
      >
        <option value="unknown">Unknown</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>
  );
}

function SelectField<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: Value[];
  onChange: (value: Value) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[1px] text-ink-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
        className="mt-1 w-full rounded-xl border border-surface-strong bg-white px-3 py-2 text-sm font-semibold text-ink-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number | null;
  min: number;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[1px] text-ink-500">{label}</span>
      <input
        type="number"
        min={min}
        step={min === 0 ? 1 : 0.01}
        value={value ?? ''}
        onChange={(event) => onChange(parseNumberValue(event.target.value))}
        className="mt-1 w-full rounded-xl border border-surface-strong bg-white px-3 py-2 text-sm font-semibold text-ink-800 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
      />
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
        Saving creates business-verified trust confirmations for the fields you provide.
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

function buildInitialState(
  bathroomId: string,
  needMetadata: BathroomNeedMetadata | null,
  accessibilityDetails: BathroomAccessibilityDetails | null
): UpdateBusinessRestroomMetadataInput {
  return {
    bathroom_id: bathroomId,
    has_toilet_paper: needMetadata?.has_toilet_paper ?? null,
    has_soap: needMetadata?.has_soap ?? null,
    has_hand_dryer: needMetadata?.has_hand_dryer ?? null,
    has_paper_towels: needMetadata?.has_paper_towels ?? null,
    has_changing_table: needMetadata?.has_changing_table ?? null,
    has_family_restroom: needMetadata?.has_family_restroom ?? null,
    is_gender_neutral: needMetadata?.is_gender_neutral ?? null,
    is_single_user: needMetadata?.is_single_user ?? null,
    is_private_room: needMetadata?.is_private_room ?? null,
    stall_count: needMetadata?.stall_count ?? null,
    privacy_level: needMetadata?.privacy_level === 'unknown' ? null : needMetadata?.privacy_level ?? null,
    access_type: needMetadata?.access_type === 'unknown' ? null : needMetadata?.access_type ?? null,
    code_required: needMetadata?.code_required ?? null,
    key_required: needMetadata?.key_required ?? null,
    customer_only: needMetadata?.customer_only ?? null,
    ask_employee: needMetadata?.ask_employee ?? null,
    medical_urgency_friendly: needMetadata?.medical_urgency_friendly ?? null,
    child_friendly: needMetadata?.child_friendly ?? null,
    outdoor_traveler_reliable: needMetadata?.outdoor_traveler_reliable ?? null,
    wheelchair_accessible: accessibilityDetails?.wheelchair_accessible ?? null,
    door_clear_width_inches: accessibilityDetails?.door_clear_width_inches ?? null,
    turning_space_inches: accessibilityDetails?.turning_space_inches ?? null,
    stall_width_inches: accessibilityDetails?.stall_width_inches ?? null,
    stall_depth_inches: accessibilityDetails?.stall_depth_inches ?? null,
    has_grab_bars: accessibilityDetails?.has_grab_bars ?? null,
    has_accessible_sink: accessibilityDetails?.has_accessible_sink ?? null,
    has_step_free_access: accessibilityDetails?.has_step_free_access ?? null,
    has_power_door: accessibilityDetails?.has_power_door ?? null,
    accessibility_notes: accessibilityDetails?.notes ?? null,
  };
}

function formatBooleanValue(value: boolean | null): BooleanValue {
  if (value === true) {
    return 'true';
  }

  if (value === false) {
    return 'false';
  }

  return 'unknown';
}

function parseBooleanValue(value: BooleanValue): boolean | null {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function parseNumberValue(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function formatOptionLabel(value: string): string {
  return value.replace(/_/g, ' ');
}
