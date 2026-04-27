'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createFeaturedCampaign } from './actions';

interface LocationOption {
  bathroom_id: string;
  place_name: string;
  address: string;
}

interface CreateCampaignFormProps {
  locations: LocationOption[];
}

type SaveState = 'idle' | 'saving' | 'success' | 'error';

const PLACEMENT_LABELS: Record<string, string> = {
  search_top: 'Search top — appears first in keyword results',
  map_priority: 'Map priority — pinned above nearby results',
  nearby_featured: 'Nearby featured — highlighted in the "Nearby" feed',
};

export function CreateCampaignForm({ locations }: CreateCampaignFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [bathroomId, setBathroomId] = useState(locations[0]?.bathroom_id ?? '');
  const [placementType, setPlacementType] = useState<string>('map_priority');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setSaveState('saving');
    setMessage('Launching campaign...');

    startTransition(async () => {
      const result = await createFeaturedCampaign({
        bathroom_id: bathroomId,
        placement_type: placementType,
        start_date: startDate,
        end_date: endDate,
      });

      if (!result.ok) {
        setSaveState('error');
        setMessage(result.error);
        return;
      }

      setSaveState('success');
      setMessage('Campaign launched! It will appear in the active list.');
      setStartDate('');
      setEndDate('');
      router.refresh();
    });
  }

  if (locations.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-surface-strong bg-surface-base p-4 text-sm leading-6 text-ink-600">
        No approved locations found on this account. Submit a claim first.
      </div>
    );
  }

  return (
    <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
          Location
        </label>
        <select
          value={bathroomId}
          onChange={(e) => setBathroomId(e.target.value)}
          disabled={isPending}
          className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 disabled:opacity-50"
        >
          {locations.map((loc) => (
            <option key={loc.bathroom_id} value={loc.bathroom_id}>
              {loc.place_name} — {loc.address}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
          Placement type
        </label>
        <select
          value={placementType}
          onChange={(e) => setPlacementType(e.target.value)}
          disabled={isPending}
          className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 disabled:opacity-50"
        >
          {Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            min={today}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isPending}
            required
            className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 disabled:opacity-50"
          />
        </div>
        <div className="grid gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">
            End date
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || today}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isPending}
            required
            className="rounded-2xl border border-surface-strong bg-surface-base px-4 py-2.5 text-sm text-ink-900 outline-none transition focus:border-brand-400 disabled:opacity-50"
          />
        </div>
      </div>

      {message ? (
        <div
          className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${
            saveState === 'success'
              ? 'border-success/20 bg-success/10 text-success'
              : saveState === 'error'
                ? 'border-danger/20 bg-danger/10 text-danger'
                : 'border-brand-200 bg-brand-50 text-brand-700'
          }`}
        >
          {saveState === 'success' ? (
            <CheckCircle2 size={16} className="mt-0.5 flex-none" />
          ) : saveState === 'error' ? (
            <AlertTriangle size={16} className="mt-0.5 flex-none" />
          ) : (
            <Loader2 size={16} className="mt-0.5 flex-none animate-spin" />
          )}
          <span>{message}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !startDate || !endDate}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
      >
        {isPending ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Sparkles size={16} />
        )}
        {isPending ? 'Launching...' : 'Launch campaign'}
      </button>
    </form>
  );
}
