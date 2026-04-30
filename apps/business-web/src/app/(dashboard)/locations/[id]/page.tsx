import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  CheckCircle2,
  Eye,
  MapPin,
  Navigation,
  Sparkles,
  Star,
  Tag,
  Users,
} from 'lucide-react';
import { getApprovedLocationById, type ApprovedLocation } from '../../../../lib/business/queries';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { PhotoUploadForm } from './photo-upload-form';
import { VisibilitySettingsForm } from './visibility-settings-form';

type PageParams = { id: string };

// Minimal shape we project from bathroom_photos for the photo strip.
// `overrideTypes` below tells the Supabase client what the selected columns resolve to.
type BathroomPhotoRow = {
  id: string;
  storage_path: string;
  moderation_status: 'approved' | 'pending' | 'rejected';
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { title: 'Location' };
  }

  const { location } = await getApprovedLocationById(supabase, user.id, id);

  if (!location) {
    return { title: 'Location not found' };
  }

  return {
    title: location.business_name
      ? `${location.business_name} - ${location.place_name}`
      : location.place_name,
  };
}

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { location, error } = await getApprovedLocationById(supabase, user.id, id);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl px-10 py-10">
        <BackLink />
        <div className="mt-6 rounded-4xl border border-danger/20 bg-danger/10 px-6 py-5 text-sm text-danger shadow-card">
          We could not load this location right now. Try again in a moment.
        </div>
      </div>
    );
  }

  // Ownership guard: `getApprovedLocationById` only returns a row if
  // the caller has an approved claim for this bathroom. A `null`
  // result here means either the bathroom does not exist or the user
  // does not own it, so we always render the same not-found surface.
  if (!location) {
    notFound();
  }

  const { data: photosData, error: photosError } = await supabase
    .from('bathroom_photos')
    .select('id, storage_path, moderation_status')
    .eq('bathroom_id', location.bathroom_id)
    .neq('moderation_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(30)
    .overrideTypes<BathroomPhotoRow[]>();

  const existingPhotos = (photosData ?? []).map((row) => ({
    id: row.id,
    storage_path: row.storage_path,
    moderation_status: row.moderation_status as 'approved' | 'pending' | 'rejected',
    url: supabase.storage.from('bathroom-photos').getPublicUrl(row.storage_path).data.publicUrl,
  }));

  const photoLoadError = photosError
    ? 'Existing photos are temporarily unavailable. You can still upload new ones.'
    : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-10 py-10">
      <BackLink />
      <Hero location={location} />

      <section className="mt-8">
        <SectionHeader
          eyebrow="This week"
          title="Performance"
          description="Discovery, engagement, and trust metrics pulled from StallPass."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Eye size={18} />}
            label="Weekly views"
            value={location.weekly_views}
            tone="brand"
          />
          <StatCard
            icon={<Users size={18} />}
            label="Unique visitors"
            value={location.weekly_unique_visitors}
            helper="this week"
          />
          <StatCard
            icon={<Navigation size={18} />}
            label="Route opens"
            value={location.weekly_navigation_count}
          />
          <StatCard
            icon={<AlertTriangle size={18} />}
            label="Open issues"
            value={location.open_reports}
            tone={location.open_reports > 0 ? 'danger' : 'success'}
          />
          <StatCard
            icon={<Star size={18} />}
            label="Cleanliness"
            value={location.avg_cleanliness.toFixed(1)}
            helper={`${location.total_ratings} rating${location.total_ratings === 1 ? '' : 's'}`}
          />
          <StatCard
            icon={<Bookmark size={18} />}
            label="Map saves"
            value={location.total_favorites}
          />
          <StatCard
            icon={<Tag size={18} />}
            label="Active offers"
            value={location.active_offer_count}
          />
          <StatCard
            icon={<BarChart3 size={18} />}
            label="Monthly reach"
            value={location.monthly_unique_visitors}
            helper="unique visitors"
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          eyebrow="StallPass parameters"
          title="Visibility & verification"
          description="Manage how this location appears across the StallPass map and business dashboard."
        />
        <VisibilitySettingsForm
          bathroomId={location.bathroom_id}
          requiresPremiumAccess={location.requires_premium_access}
          showOnFreeMap={location.show_on_free_map}
          isLocationVerified={location.is_location_verified}
          isLocked={location.is_locked ?? false}
        />
      </section>

      <section className="mt-10">
        <SectionHeader
          eyebrow="Media"
          title="Photos"
          description="Upload photos of the exterior, interior, or entry keypad. Images go into moderation review before appearing publicly."
        />
        <div className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
          {photoLoadError ? (
            <div className="mb-4 rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
              {photoLoadError}
            </div>
          ) : null}
          <PhotoUploadForm
            bathroomId={location.bathroom_id}
            initialPhotos={existingPhotos}
          />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader
          eyebrow="Identity"
          title="Business card"
          description="How customers see this bathroom in StallPass."
        />
        <div className="rounded-4xl border border-surface-strong bg-surface-card p-6 shadow-card">
          <div className="flex items-center gap-3 text-ink-500">
            <MapPin size={16} />
            <div className="text-sm">{location.address}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {location.verification_badge_type ? (
              <Badge tone="success" icon={<CheckCircle2 size={12} />}>
                {location.verification_badge_type} verified
              </Badge>
            ) : null}
            {location.has_active_featured_placement ? (
              <Badge tone="warning" icon={<Sparkles size={12} />}>
                {location.active_featured_placements} featured
              </Badge>
            ) : null}
            <Badge tone="brand">
              {location.pricing_plan === 'lifetime' ? 'Lifetime access' : 'Standard plan'}
            </Badge>
          </div>
        </div>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/locations"
      className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1.5px] text-brand-600 hover:text-brand-700"
    >
      {'<-'} All locations
    </Link>
  );
}

function Hero({ location }: { location: ApprovedLocation }) {
  return (
    <div className="mt-4 rounded-4xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 text-white shadow-pop">
      <div className="text-[11px] font-bold uppercase tracking-[2px] text-white/80">
        {location.business_name ?? 'Managed location'}
      </div>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{location.place_name}</h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-white/80">
        <MapPin size={14} />
        <span>{location.address}</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <HeroChip>
          {location.requires_premium_access && !location.show_on_free_map
            ? 'Premium map only'
            : location.requires_premium_access
              ? 'Premium + free'
              : 'Public map'}
        </HeroChip>
        {location.is_location_verified ? <HeroChip>Location verified</HeroChip> : null}
        {location.pricing_plan === 'lifetime' ? <HeroChip>Lifetime access</HeroChip> : null}
      </div>
    </div>
  );
}

function HeroChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1px] text-white">
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
      {description ? <div className="mt-1 max-w-xl text-sm text-ink-500">{description}</div> : null}
    </div>
  );
}

type Tone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

function StatCard({
  icon,
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper?: string;
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
    <div className="rounded-4xl border border-surface-strong bg-surface-card p-5 shadow-card">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-[1.5px] text-ink-500">{label}</div>
      <div className="mt-1 text-3xl font-black tracking-tight text-ink-900">{value}</div>
      {helper ? <div className="mt-1 text-xs text-ink-500">{helper}</div> : null}
    </div>
  );
}

function Badge({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode;
  tone: 'brand' | 'success' | 'warning';
  icon?: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
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
