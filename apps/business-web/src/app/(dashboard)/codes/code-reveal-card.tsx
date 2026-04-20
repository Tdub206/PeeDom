'use client';

import { useState } from 'react';
import { CalendarClock, Copy, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import type { BusinessLocationCodeRow } from '@/lib/business/queries';

interface CodeRevealCardProps {
  activeCode: BusinessLocationCodeRow | null;
}

export function CodeRevealCard({ activeCode }: CodeRevealCardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  if (!activeCode) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-surface-strong bg-surface-muted px-4 py-3 text-sm font-semibold text-ink-600">
        <ShieldAlert size={16} className="text-warning" />
        No active code set for this location. Guests see the community code (if any) until you
        publish an authoritative one.
      </div>
    );
  }

  const lastVerified = activeCode.last_verified_at ?? activeCode.created_at;

  async function handleCopy() {
    if (!activeCode) return;
    try {
      await navigator.clipboard.writeText(activeCode.code_value);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 1800);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-surface-strong bg-surface-muted px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`font-mono text-2xl font-bold tracking-[0.24em] ${
            isRevealed ? 'text-ink-900' : 'text-ink-500'
          }`}
        >
          {isRevealed ? activeCode.code_value : '••••'}
        </span>
        <button
          type="button"
          onClick={() => setIsRevealed((value) => !value)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface-card text-ink-600 shadow-card transition hover:text-ink-900"
          aria-label={isRevealed ? 'Hide code' : 'Reveal code'}
        >
          {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        {isRevealed ? (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-ink-700 shadow-card transition hover:text-brand-700"
          >
            <Copy size={12} />
            {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy'}
          </button>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-ink-500">
        <CalendarClock size={12} />
        Updated {formatRelative(lastVerified)}
      </div>
    </div>
  );
}

function formatRelative(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
