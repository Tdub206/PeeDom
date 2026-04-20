'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Settings, Sparkles, X } from 'lucide-react';

interface DashboardTopbarProps {
  initials: string;
  pendingClaimsCount: number;
}

const PAGE_TITLES: Record<string, string> = {
  '/hub': 'Overview',
  '/locations': 'Locations',
  '/analytics': 'Analytics',
  '/coupons': 'Coupons',
  '/codes': 'Access codes',
  '/featured': 'Featured',
  '/claims': 'Claim history',
  '/settings': 'Settings',
};

export function DashboardTopbar({ initials, pendingClaimsCount }: DashboardTopbarProps) {
  const pathname = usePathname();
  const [openPanel, setOpenPanel] = useState<'ai' | 'notifications' | null>(null);
  const title = getPageTitle(pathname);

  return (
    <div className="sticky top-0 z-20 border-b border-surface-strong bg-surface-base/95 backdrop-blur">
      <div className="relative flex items-center gap-4 px-8 py-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            StallPass Business
          </div>
          <div className="mt-1 text-xl font-black tracking-tight text-ink-900">{title}</div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenPanel((current) => (current === 'ai' ? null : 'ai'))}
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
              openPanel === 'ai'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-surface-strong bg-surface-card text-ink-700 hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            <Sparkles size={16} />
            AI
          </button>

          <button
            type="button"
            onClick={() => setOpenPanel((current) => (current === 'notifications' ? null : 'notifications'))}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition ${
              openPanel === 'notifications'
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-surface-strong bg-surface-card text-ink-700 hover:border-brand-200 hover:text-brand-700'
            }`}
            aria-label="Notifications"
          >
            <Bell size={16} />
            {pendingClaimsCount > 0 && openPanel !== 'notifications' ? (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-brand-600" />
            ) : null}
          </button>

          <Link
            href="/settings"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-surface-strong bg-surface-card text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
            aria-label="Settings"
          >
            <Settings size={16} />
          </Link>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-black text-white">
            {initials}
          </div>
        </div>

        {openPanel === 'ai' ? <AiPanel onClose={() => setOpenPanel(null)} /> : null}
        {openPanel === 'notifications' ? (
          <NotificationsPanel
            pendingClaimsCount={pendingClaimsCount}
            onClose={() => setOpenPanel(null)}
          />
        ) : null}
      </div>
    </div>
  );
}

function AiPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute right-8 top-full mt-3 w-full max-w-md rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-pop">
      <PanelHeader title="StallPass AI" onClose={onClose} />
      <p className="mt-4 text-sm leading-6 text-ink-600">
        The prototype&apos;s AI assistant still needs a production route handler and Anthropic
        credentials before it can go live here. The dashboard pages below are wired directly to
        Supabase today.
      </p>
      <div className="mt-4 rounded-2xl border border-surface-strong bg-surface-base p-4 text-sm text-ink-600">
        Use Analytics for live discovery metrics, Claims for review status, and Locations for
        visibility controls while the assistant backend is being finished.
      </div>
    </div>
  );
}

function NotificationsPanel({
  pendingClaimsCount,
  onClose,
}: {
  pendingClaimsCount: number;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-8 top-full mt-3 w-full max-w-md rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-pop">
      <PanelHeader title="Notifications" onClose={onClose} />

      <div className="mt-4 grid gap-3">
        {pendingClaimsCount > 0 ? (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
            <div className="text-sm font-bold text-ink-900">
              {pendingClaimsCount} pending claim{pendingClaimsCount === 1 ? '' : 's'}
            </div>
            <div className="mt-1 text-sm leading-6 text-ink-600">
              Claim review updates still arrive by email while the real-time notification feed is
              being wired into the business dashboard.
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-surface-strong bg-surface-base p-4 text-sm leading-6 text-ink-600">
            No new claim alerts right now.
          </div>
        )}

        <div className="rounded-2xl border border-surface-strong bg-surface-base p-4 text-sm leading-6 text-ink-600">
          Real-time in-app notifications are the next step after the table-backed notification feed
          is added to the schema.
        </div>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
          Dashboard panel
        </div>
        <div className="mt-1 text-lg font-black tracking-tight text-ink-900">{title}</div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-surface-strong bg-surface-card text-ink-500 transition hover:border-brand-200 hover:text-brand-700"
        aria-label={`Close ${title}`}
      >
        <X size={16} />
      </button>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const directMatch = PAGE_TITLES[pathname];
  if (directMatch) {
    return directMatch;
  }

  const entry = Object.entries(PAGE_TITLES).find(([prefix]) => pathname.startsWith(`${prefix}/`));
  return entry?.[1] ?? 'Business Hub';
}
