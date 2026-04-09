import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Locations',
};

// Intentional stub — Codex is asked to build the real implementation
// in the first TO CODEX handoff. Leaving a clear "not built yet"
// marker so the sidebar link doesn't 404 during development.
export default function LocationsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        Locations
      </div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Your managed bathrooms
      </h1>
      <p className="mt-2 max-w-xl text-sm text-ink-600">
        Not built yet. See <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs">TO CODEX #1</code> in the latest collaboration message.
      </p>
    </div>
  );
}
