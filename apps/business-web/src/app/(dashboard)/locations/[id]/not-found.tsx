import Link from 'next/link';

// Rendered when getApprovedLocationById returns null — either the
// bathroom doesn't exist or the signed-in user has no approved
// claim for it. We intentionally don't distinguish the two so
// ownership can't be inferred from the response.
export default function LocationNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-10 py-16">
      <div className="rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
        <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
          Location not found
        </div>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-ink-900">
          We couldn&apos;t find that location
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-600">
          It may have been removed, or you don&apos;t have an approved ownership claim for it yet.
          Head back to your locations list to manage one you own.
        </p>
        <Link
          href="/locations"
          className="mt-6 inline-flex items-center rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-pop transition hover:bg-brand-700"
        >
          Back to locations
        </Link>
      </div>
    </div>
  );
}
