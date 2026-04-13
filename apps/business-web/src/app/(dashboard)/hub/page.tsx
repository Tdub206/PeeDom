import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BarChart3,
  Building2,
  DoorOpen,
  FileText,
  Sparkles,
  Tag,
  TrendingUp,
} from 'lucide-react';
import { getApprovedLocations, getBusinessCoupons } from '@/lib/business/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Hub',
};

export default async function BusinessHubPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const now = new Date();
  const [{ locations, error: locationsError }, { coupons, error: couponsError }] =
    await Promise.all([
      getApprovedLocations(supabase, user.id),
      getBusinessCoupons(supabase, user.id),
    ]);

  const locationCount = locations.length;
  const totalWeeklyUnique = locations.reduce(
    (sum, location) => sum + location.weekly_unique_visitors,
    0
  );
  const activeCouponCount = coupons.filter((coupon) => isCouponCurrentlyActive(coupon, now)).length;
  const openIssueCount = locations.reduce((sum, location) => sum + location.open_reports, 0);
  const errorMessage = locationsError ?? couponsError;

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <Hero
        name={user.email ?? 'there'}
        locationCount={locationCount}
        totalWeeklyUnique={totalWeeklyUnique}
      />

      {errorMessage ? (
        <div className="mt-6 rounded-4xl border border-danger/20 bg-danger/10 px-5 py-4 text-sm text-danger">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Locations" value={locationCount} tone="brand" icon={<Building2 size={18} />} />
        <StatCard
          label="Weekly reach"
          value={totalWeeklyUnique}
          helper="unique viewers"
          icon={<TrendingUp size={18} />}
        />
        <StatCard label="Active coupons" value={activeCouponCount} icon={<Tag size={18} />} />
        <StatCard
          label="Open issues"
          value={openIssueCount}
          tone={openIssueCount > 0 ? 'danger' : 'success'}
          icon={<BarChart3 size={18} />}
        />
      </section>

      <section className="mt-10">
        <SectionHeader eyebrow="Quick actions" title="Jump straight in" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ActionTile
            href="/locations"
            icon={<Building2 size={20} />}
            title="Locations"
            subtitle="Hours, photos, visibility"
            tone="brand"
          />
          <ActionTile
            href="/coupons"
            icon={<Tag size={20} />}
            title="Coupons"
            subtitle="Create & manage discounts"
            tone="success"
          />
          <ActionTile
            href="/codes"
            icon={<DoorOpen size={20} />}
            title="Access codes"
            subtitle="Set or rotate door codes"
            tone="neutral"
          />
          <ActionTile
            href="/featured"
            icon={<Sparkles size={20} />}
            title="Featured"
            subtitle="Boost on the map"
            tone="warning"
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader eyebrow="Manage" title="Everything in one place" />
        <div className="grid grid-cols-1 gap-3">
          <NavCard
            href="/analytics"
            icon={<BarChart3 size={20} />}
            title="Live analytics"
            description="Discovery, routes, visits, trust metrics."
          />
          <NavCard
            href="/claims"
            icon={<FileText size={20} />}
            title="Ownership claims"
            description="Submit and track ownership verification."
          />
          <NavCard
            href="/featured"
            icon={<Sparkles size={20} />}
            title="Featured placements"
            description="Boost a location at the top of the map."
          />
        </div>
      </section>
    </div>
  );
}

function Hero({
  name,
  locationCount,
  totalWeeklyUnique,
}: {
  name: string;
  locationCount: number;
  totalWeeklyUnique: number;
}) {
  return (
    <div className="rounded-4xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 text-white shadow-pop">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-white/80">
        Business Hub
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        {locationCount === 0
          ? `Welcome, ${name}`
          : `${locationCount} location${locationCount === 1 ? '' : 's'} under your management`}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">
        {totalWeeklyUnique > 0
          ? `${totalWeeklyUnique} unique visitors reached your locations this week.`
          : 'Direct controls for everything StallPass customers see. Any change you make here syncs instantly to the iOS and Android app.'}
      </p>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        {eyebrow}
      </div>
      <div className="mt-1 text-xl font-black tracking-tight text-ink-900">{title}</div>
    </div>
  );
}

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

function StatCard({
  label,
  value,
  helper,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: Tone;
  icon?: React.ReactNode;
}) {
  const toneClasses: Record<Tone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    neutral: 'bg-surface-muted text-ink-600',
  };

  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
      {icon ? (
        <div
          className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}
        >
          {icon}
        </div>
      ) : null}
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-ink-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-ink-500">{helper}</div> : null}
    </div>
  );
}

function ActionTile({
  href,
  icon,
  title,
  subtitle,
  tone = 'neutral',
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone?: Tone;
}) {
  const toneClasses: Record<Tone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    neutral: 'bg-surface-muted text-ink-600',
  };

  return (
    <Link
      href={href}
      className="group rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div className="text-lg font-black tracking-tight text-ink-900 group-hover:text-brand-700">
        {title}
      </div>
      <div className="mt-1 text-xs text-ink-500">{subtitle}</div>
    </Link>
  );
}

function NavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card transition hover:border-brand-500"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-ink-600">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-base font-bold text-ink-900">{title}</div>
        <div className="mt-0.5 text-xs text-ink-500">{description}</div>
      </div>
      <span className="text-ink-400">{'->'}</span>
    </Link>
  );
}

function isCouponCurrentlyActive(
  coupon: {
    is_active: boolean;
    expires_at: string | null;
    max_redemptions: number | null;
    current_redemptions: number;
  },
  now: Date
): boolean {
  if (!coupon.is_active) {
    return false;
  }

  if (coupon.expires_at !== null) {
    const expirationDate = new Date(coupon.expires_at);
    if (!Number.isNaN(expirationDate.getTime()) && expirationDate <= now) {
      return false;
    }
  }

  if (
    coupon.max_redemptions !== null &&
    coupon.current_redemptions >= coupon.max_redemptions
  ) {
    return false;
  }

  return true;
}
