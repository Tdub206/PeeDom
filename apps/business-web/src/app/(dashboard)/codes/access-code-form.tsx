'use client';

import { useMemo, useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCw, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { submitBusinessOwnerCode, type SubmitBusinessOwnerCodeResult } from './actions';

interface AccessCodeFormProps {
  bathroomId: string;
  hasActiveCode: boolean;
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export function AccessCodeForm({ bathroomId, hasActiveCode }: AccessCodeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canSubmit = useMemo(() => draft.trim().length >= 1 && draft.trim().length <= 20, [draft]);

  function handleOpen() {
    setIsEditing(true);
    setDraft('');
    setSaveState('idle');
    setMessage(null);
    setFieldErrors({});
  }

  function handleCancel() {
    setIsEditing(false);
    setDraft('');
    setSaveState('idle');
    setMessage(null);
    setFieldErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit || isPending) return;

    const payload = {
      bathroom_id: bathroomId,
      code_value: draft.trim(),
    };

    setSaveState('saving');
    setMessage('Publishing the new code...');
    setFieldErrors({});

    startTransition(async () => {
      const result = await submitBusinessOwnerCode(payload);
      applyResult(result);
    });
  }

  function applyResult(result: SubmitBusinessOwnerCodeResult) {
    if (!result.ok) {
      setSaveState('error');
      setMessage(result.error);
      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }
      return;
    }

    setSaveState('success');
    setMessage('Code published. Prior codes marked superseded.');
    setFieldErrors({});
    setIsEditing(false);
    setDraft('');
    router.refresh();
  }

  if (!isEditing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusMessage saveState={saveState} message={message} />
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700"
        >
          <RotateCw size={16} />
          {hasActiveCode ? 'Rotate code' : 'Set code'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="rounded-2xl border border-warning/30 bg-warning/10 p-3 text-xs font-semibold text-warning">
        Submitting a new code supersedes all existing codes for this location and becomes visible
        to guests immediately.
      </div>

      <label className="grid gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
          New code
        </span>
        <input
          type="text"
          maxLength={20}
          autoFocus
          placeholder="e.g. 4829"
          className="w-full max-w-xs rounded-2xl border border-surface-strong bg-surface-base px-4 py-3 text-lg font-bold tracking-[0.24em] text-ink-900 outline-none transition focus:border-brand-500"
          value={draft}
          disabled={isPending}
          onChange={(event) => {
            setDraft(event.target.value);
            if (fieldErrors.code_value) {
              setFieldErrors((current) => {
                const next = { ...current };
                delete next.code_value;
                return next;
              });
            }
            setSaveState('idle');
            setMessage(null);
          }}
        />
        {fieldErrors.code_value ? (
          <span className="text-xs font-semibold text-danger">{fieldErrors.code_value}</span>
        ) : (
          <span className="text-xs text-ink-500">1–20 characters. Numbers, letters, or symbols.</span>
        )}
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusMessage saveState={saveState} message={message} />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleCancel}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-surface-strong bg-surface-card px-4 py-2.5 text-sm font-bold text-ink-700 transition hover:border-brand-200 disabled:cursor-not-allowed"
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isPending ? 'Saving...' : 'Save code'}
          </button>
        </div>
      </div>
    </form>
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
        Codes save through a server action after ownership is re-checked.
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
