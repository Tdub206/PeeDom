import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BadgePercent,
  CalendarDays,
  Hash,
  Lock,
  Sparkles,
  Ticket,
} from 'lucide-react';
import {
  getApprovedLocations,
  getBusinessCoupons,
  type ApprovedLocation,
  type BusinessCouponRow,
} from '../../../lib/business/queries';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { CreateCouponForm } from './create-coupon-form';
import { DeactivateCouponButton } from './deactivate-coupon-button';

export const metadata: Metadata = {
  title: 'Coupons',
};

type CouponType = BusinessCouponRow['coupon_type'];

const COUPON_TYPE_LABEL: Record<CouponType, string> = {
  percent_off: '% Off',
  dollar_off: '$ Off',
  bogo: 'Buy one get one',
  free_item: 'Free item',
  custom: 'Custom',
};

export default async function CouponsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ locations, error: locationsError }, { coupons, error: couponsError }] =
    await Promise.all([
      getApprovedLocations(supabase, user.id),
      getBusinessCoupons(supabase, user.id),
    ]);

  const bathroomNameById = new Map(
    locations.map((location) => [location.bathroom_id, location] as const)
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">Coupons</div>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
        Discounts & offers
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-600">
        Create and manage the coupons that appear inside StallPass for guests visiting your
        claimed locations.
      </p>

      {locationsError ? (
        <div className="mt-8 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          {locationsError}
        </div>
      ) : null}

      <section className="mt-8">
        <SectionHeader
          eyebrow="New offer"
          title="Create a coupon"
          description="Choose one of your approved locations, set the discount, and publish it to the StallPass map."
        />

        {locations.length === 0 ? (
          <NoLocationsEmptyState />
        ) : (
          <CreateCouponForm locations={locations.map(toLocationOption)} />
        )}
      </section>

      <section className="mt-12">
        <SectionHeader
          eyebrow="Active & historical"
          title="Your coupons"
          description="Every coupon tied to your account, ordered from newest to oldest."
        />

        {couponsError ? (
          <div className="rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
            {couponsError}
          </div>
        ) : coupons.length === 0 ? (
          <CouponsEmptyState hasLocations={locations.length > 0} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                locationName={bathroomNameById.get(coupon.bathroom_id)?.place_name ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function toLocationOption(location: ApprovedLocation) {
  return {
    bathroom_id: location.bathroom_id,
    place_name: location.place_name,
    business_name: location.business_name,
    address: location.address,
  };
}

function CouponCard({
  coupon,
  locationName,
}: {
  coupon: BusinessCouponRow;
  locationName: string | null;
}) {
  const now = new Date();
  const isExpired = coupon.expires_at !== null && new Date(coupon.expires_at) <= now;
  const isExhausted =
    coupon.max_redemptions !== null && coupon.current_redemptions >= coupon.max_redemptions;
  const isCurrentlyActive = isCouponCurrentlyActive(coupon, now);
  const statusTone = !coupon.is_active || isExpired || isExhausted ? 'warning' : 'success';
  const statusLabel = !coupon.is_active
    ? 'Inactive'
    : isExpired
      ? 'Expired'
      : isExhausted
        ? 'Fully redeemed'
        : 'Active';

  return (
    <article className="flex flex-col gap-5 rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
      <header className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Ticket size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600">
            {COUPON_TYPE_LABEL[coupon.coupon_type]}
            {coupon.value !== null
              ? coupon.coupon_type === 'percent_off'
                ? ` · ${coupon.value}%`
                : coupon.coupon_type === 'dollar_off'
                  ? ` · $${coupon.value}`
                  : ''
              : ''}
          </div>
          <h3 className="mt-1 text-lg font-black tracking-tight text-ink-900">{coupon.title}</h3>
          {coupon.description ? (
            <p className="mt-1 text-sm leading-6 text-ink-600">{coupon.description}</p>
          ) : null}
          {locationName ? (
            <div className="mt-2 text-xs font-semibold text-ink-500">{locationName}</div>
          ) : null}
        </div>
        <StatusPill tone={statusTone}>{statusLabel}</StatusPill>
      </header>

      <dl className="grid grid-cols-2 gap-4 border-t border-surface-strong pt-4">
        <MetaItem icon={<Hash size={14} />} label="Code" value={coupon.coupon_code} />
        <MetaItem
          icon={<BadgePercent size={14} />}
          label="Redemptions"
          value={
            coupon.max_redemptions === null
              ? `${coupon.current_redemptions} / unlimited`
              : `${coupon.current_redemptions} / ${coupon.max_redemptions}`
          }
        />
        <MetaItem
          icon={<CalendarDays size={14} />}
          label="Starts"
          value={formatDate(coupon.starts_at)}
        />
        <MetaItem
          icon={<CalendarDays size={14} />}
          label="Expires"
          value={coupon.expires_at ? formatDate(coupon.expires_at) : 'Never'}
        />
      </dl>

      <footer className="flex flex-col gap-3 border-t border-surface-strong pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Chip icon={<Lock size={12} />} tone={coupon.premium_only ? 'brand' : 'neutral'}>
            {coupon.premium_only ? 'Premium members only' : 'Open to every guest'}
          </Chip>
          {coupon.min_purchase !== null ? (
            <Chip icon={<Sparkles size={12} />} tone="neutral">
              Min purchase ${coupon.min_purchase}
            </Chip>
          ) : null}
        </div>

        {isCurrentlyActive ? <DeactivateCouponButton couponId={coupon.id} /> : null}
      </footer>
    </article>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[1.3px] text-ink-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink-900">{value}</dd>
    </div>
  );
}

type ChipTone = 'brand' | 'neutral';

function Chip({
  icon,
  tone,
  children,
}: {
  icon?: React.ReactNode;
  tone: ChipTone;
  children: React.ReactNode;
}) {
  const toneClasses: Record<ChipTone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    neutral: 'bg-surface-muted text-ink-600',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

function StatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'success' | 'warning';
}) {
  const toneClasses =
    tone === 'success' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning';

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] ${toneClasses}`}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-brand-600">
        {eyebrow}
      </div>
      <div className="mt-1 text-xl font-black tracking-tight text-ink-900">{title}</div>
      {description ? (
        <div className="mt-1 max-w-xl text-sm text-ink-500">{description}</div>
      ) : null}
    </div>
  );
}

function NoLocationsEmptyState() {
  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
      <div className="text-sm text-ink-600">
        You need at least one approved location before you can create a coupon.{' '}
        <Link href="/locations" className="font-bold text-brand-600 hover:text-brand-700">
          Manage locations
        </Link>
      </div>
    </div>
  );
}

function CouponsEmptyState({ hasLocations }: { hasLocations: boolean }) {
  return (
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-8 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Ticket size={22} />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-ink-900">No coupons yet</h2>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-600">
        {hasLocations
          ? 'Use the form above to publish your first offer to the StallPass map.'
          : 'Once an approved location is tied to your account you can publish your first offer.'}
      </p>
    </div>
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isCouponCurrentlyActive(
  coupon: Pick<
    BusinessCouponRow,
    'is_active' | 'expires_at' | 'max_redemptions' | 'current_redemptions'
  >,
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
