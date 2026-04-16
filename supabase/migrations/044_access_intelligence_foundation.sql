-- ============================================================================
-- 044_access_intelligence_foundation.sql
-- StallPass Implementation Guide — Access Intelligence foundation.
--
-- Surgical extension on top of the existing schema. This migration adds only
-- the structures that do not already exist:
--   * access_type / integration_status enums
--   * Extensions to public.bathrooms (access_type, hardware_ready, dwell_time,
--     peak_usage, business_id, partner_lock_vendor_id)
--   * public.businesses (first-class business entity, distinct from
--     existing business_claims which remain bathroom-scoped)
--   * public.hardware_partners (NFC/smart-lock preparation)
--   * public.code_verifications (append-only confirm/deny/update ledger
--     capturing device fingerprint + geo — data that public.code_votes
--     cannot hold)
--   * public.device_fingerprints (anti-sybil identity, per-user hashes)
--   * public.access_intelligence_events (monthly-partitioned generic event
--     log for the 17 whitelisted event types not captured by existing
--     bathroom_views / bathroom_navigation_events / point_events)
--   * Shadow-ban columns on existing public.contributor_reputation_profiles
--     (we extend rather than create a parallel user_trust table)
--
-- RLS applied to every new table. No existing table or policy is replaced;
-- only additive ALTERs and ADD COLUMN IF NOT EXISTS.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'access_type_enum') then
    create type public.access_type_enum as enum (
      'public',
      'code',
      'purchase_required',
      'key',
      'nfc_future'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'integration_status_enum') then
    create type public.integration_status_enum as enum (
      'planned',
      'testing',
      'live'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'code_verification_action_enum') then
    create type public.code_verification_action_enum as enum (
      'confirm',
      'deny',
      'update'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Hardware partners (Section 7 — NFC preparation). Declared before bathrooms
-- ALTER so the FK on bathrooms.partner_lock_vendor_id can resolve immediately.
-- ---------------------------------------------------------------------------
create table if not exists public.hardware_partners (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null,
  api_endpoint text not null default 'TBD',
  integration_status public.integration_status_enum not null default 'planned',
  contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hardware_partners_status
  on public.hardware_partners(integration_status);

alter table public.hardware_partners enable row level security;

drop policy if exists "hardware_partners_select_authenticated" on public.hardware_partners;
create policy "hardware_partners_select_authenticated"
  on public.hardware_partners for select
  using (auth.uid() is not null);

insert into public.hardware_partners (vendor_name, api_endpoint, integration_status, notes)
select
  'Reserved - Future NFC Partner',
  'TBD',
  'planned'::public.integration_status_enum,
  'Schema prepared for future smart lock integration. No hardware deployed yet.'
where not exists (
  select 1
  from public.hardware_partners
  where vendor_name = 'Reserved - Future NFC Partner'
);

comment on table public.hardware_partners is
  'Future-proofing: hardware vendor partnerships for NFC/smart-lock integration. Schema only.';

-- ---------------------------------------------------------------------------
-- Businesses (Section 6). First-class business entity. Distinct from
-- public.business_claims which remains bathroom-scoped. Existing business_*
-- scaffolding continues to work unmodified.
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  geom geography(point, 4326) generated always as (
    case
      when latitude is not null and longitude is not null
      then ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      else null
    end
  ) stored,
  category text,
  hours jsonb not null default '{}'::jsonb,
  policies jsonb not null default '{}'::jsonb,
  phone text,
  website text,
  claimed boolean not null default false,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  claim_verification_method text,
  verified boolean not null default false,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'basic', 'premium')),
  source text not null default 'user_submitted'
    check (source in ('user_submitted', 'osm', 'google_places', 'admin_imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_businesses_geom on public.businesses using gist(geom);
create index if not exists idx_businesses_claimed on public.businesses(claimed) where claimed = true;
create index if not exists idx_businesses_verified on public.businesses(verified) where verified = true;
create index if not exists idx_businesses_claimed_by on public.businesses(claimed_by);

alter table public.businesses enable row level security;

drop policy if exists "businesses_select_public" on public.businesses;
create policy "businesses_select_public"
  on public.businesses for select
  using (true);

drop policy if exists "businesses_insert_authenticated" on public.businesses;
create policy "businesses_insert_authenticated"
  on public.businesses for insert
  with check (auth.uid() is not null);

drop policy if exists "businesses_update_owner" on public.businesses;
create policy "businesses_update_owner"
  on public.businesses for update
  using (claimed = true and claimed_by = auth.uid())
  with check (claimed = true and claimed_by = auth.uid());

-- ---------------------------------------------------------------------------
-- bathrooms table extensions (Section 1).
-- access_code / code_confidence columns intentionally SKIPPED — codes live in
-- public.bathroom_access_codes with confidence_score already. We add only
-- the columns with no existing home.
-- ---------------------------------------------------------------------------
alter table public.bathrooms
  add column if not exists access_type public.access_type_enum not null default 'public';

alter table public.bathrooms
  add column if not exists hardware_ready boolean not null default false;

alter table public.bathrooms
  add column if not exists partner_lock_vendor_id uuid
    references public.hardware_partners(id) on delete set null;

alter table public.bathrooms
  add column if not exists dwell_time_avg_seconds integer
    check (dwell_time_avg_seconds is null or dwell_time_avg_seconds >= 0);

alter table public.bathrooms
  add column if not exists peak_usage_jsonb jsonb not null default '{}'::jsonb;

alter table public.bathrooms
  add column if not exists business_id uuid
    references public.businesses(id) on delete set null;

-- Back-fill access_type from the existing is_locked / is_customer_only booleans
-- so bathrooms already in the system classify correctly on first query.
update public.bathrooms
set access_type = case
  when is_locked is true then 'code'::public.access_type_enum
  when is_customer_only is true then 'purchase_required'::public.access_type_enum
  else 'public'::public.access_type_enum
end
where access_type = 'public'
  and (is_locked is true or is_customer_only is true);

create index if not exists idx_bathrooms_access_type on public.bathrooms(access_type);
create index if not exists idx_bathrooms_business_id
  on public.bathrooms(business_id) where business_id is not null;
create index if not exists idx_bathrooms_hardware_ready
  on public.bathrooms(hardware_ready) where hardware_ready = true;

comment on column public.bathrooms.access_type is
  'Classification of access method: public, code, purchase_required, key, nfc_future';
comment on column public.bathrooms.hardware_ready is
  'Future NFC/smart-lock readiness flag (Section 7).';
comment on column public.bathrooms.partner_lock_vendor_id is
  'FK to hardware_partners for future smart-lock integration.';
comment on column public.bathrooms.peak_usage_jsonb is
  'Hourly usage histogram: {"0":5,"1":2,...,"23":18}. Populated by access_intelligence_events aggregation.';

-- ---------------------------------------------------------------------------
-- Extend existing public.contributor_reputation_profiles with shadow-ban
-- (Section 3). We extend — never duplicate — the existing trust surface.
-- ---------------------------------------------------------------------------
alter table public.contributor_reputation_profiles
  add column if not exists shadow_banned boolean not null default false;

alter table public.contributor_reputation_profiles
  add column if not exists shadow_banned_reason text;

alter table public.contributor_reputation_profiles
  add column if not exists shadow_banned_at timestamptz;

create index if not exists idx_contributor_reputation_shadow
  on public.contributor_reputation_profiles(shadow_banned) where shadow_banned = true;

-- Back-fill reputation rows for existing users so the trust surface is
-- consistent for anyone created before this migration.
insert into public.contributor_reputation_profiles (user_id)
select profiles.id
from public.profiles
where not exists (
  select 1
  from public.contributor_reputation_profiles reputation
  where reputation.user_id = profiles.id
);

-- Ensure every future profile gets a reputation row automatically.
create or replace function public.initialize_contributor_reputation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.contributor_reputation_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_initialize_contributor_reputation on public.profiles;
create trigger trg_initialize_contributor_reputation
  after insert on public.profiles
  for each row execute function public.initialize_contributor_reputation();

-- ---------------------------------------------------------------------------
-- Device fingerprints (Section 3). One row per (user, fingerprint) pair.
-- First_seen / last_seen let us detect device-sharing and velocity.
-- ---------------------------------------------------------------------------
create table if not exists public.device_fingerprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  fingerprint_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_latitude double precision,
  last_longitude double precision,
  contributions_10min integer not null default 0,
  unique (user_id, fingerprint_hash)
);

create index if not exists idx_device_fingerprints_hash
  on public.device_fingerprints(fingerprint_hash);
create index if not exists idx_device_fingerprints_user
  on public.device_fingerprints(user_id, last_seen_at desc);

alter table public.device_fingerprints enable row level security;

drop policy if exists "device_fingerprints_select_self" on public.device_fingerprints;
create policy "device_fingerprints_select_self"
  on public.device_fingerprints for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies — all writes happen via security-definer RPC.

-- ---------------------------------------------------------------------------
-- Code verifications ledger (Section 2). Append-only. Lives alongside
-- public.code_votes: code_votes captures the -1/+1 semantics and drives the
-- existing confidence trigger; code_verifications captures the richer
-- confirm/deny/update semantics with device + geo for the anti-sybil layer.
-- ---------------------------------------------------------------------------
create table if not exists public.code_verifications (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  code_id uuid references public.bathroom_access_codes(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action public.code_verification_action_enum not null,
  reported_code text,
  device_fingerprint text,
  geo_point geography(point, 4326),
  trust_weight numeric(5, 2) not null default 1.00
    check (trust_weight >= 0 and trust_weight <= 4.00),
  effective_weight numeric(5, 2) not null default 1.00
    check (effective_weight >= 0 and effective_weight <= 4.00),
  shadow_banned_at_time boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_code_verifications_bathroom
  on public.code_verifications(bathroom_id, created_at desc);
create index if not exists idx_code_verifications_user
  on public.code_verifications(user_id, created_at desc);
create index if not exists idx_code_verifications_code
  on public.code_verifications(code_id, created_at desc) where code_id is not null;
create index if not exists idx_code_verifications_geo
  on public.code_verifications using gist(geo_point) where geo_point is not null;
create index if not exists idx_code_verifications_fingerprint
  on public.code_verifications(device_fingerprint) where device_fingerprint is not null;

alter table public.code_verifications enable row level security;

drop policy if exists "code_verifications_select_self" on public.code_verifications;
create policy "code_verifications_select_self"
  on public.code_verifications for select
  using (auth.uid() = user_id);

-- All inserts happen through the verify_access_code security-definer RPC.

-- ---------------------------------------------------------------------------
-- Access Intelligence Events (Section 4). Monthly partitioned.
-- Covers the 17 guide-specified event types that have no existing home.
-- Narrow existing tables (bathroom_views, bathroom_navigation_events,
-- point_events) are left untouched.
-- ---------------------------------------------------------------------------
create table if not exists public.access_intelligence_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'bathroom_viewed',
      'bathroom_searched',
      'code_viewed',
      'code_confirmed',
      'code_denied',
      'code_submitted',
      'check_in',
      'check_out',
      'prediction_shown',
      'prediction_correct',
      'user_override',
      'review_submitted',
      'photo_uploaded',
      'report_submitted',
      'app_opened',
      'app_backgrounded',
      'urgency_session'
    )
  ),
  bathroom_id uuid references public.bathrooms(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  device_fingerprint text,
  geo_point geography(point, 4326),
  session_id text,
  created_at timestamptz not null default now(),
  primary key (id, created_at)
) partition by range (created_at);

-- Create 12 monthly partitions beginning with the current month.
do $$
declare
  v_start date := date_trunc('month', current_date)::date;
  v_end date;
  v_name text;
begin
  for v_offset in 0..11 loop
    v_start := (date_trunc('month', current_date) + (v_offset || ' months')::interval)::date;
    v_end := (v_start + interval '1 month')::date;
    v_name := 'access_intelligence_events_' || to_char(v_start, 'YYYY_MM');
    execute format(
      'create table if not exists public.%I partition of public.access_intelligence_events for values from (%L) to (%L)',
      v_name, v_start, v_end
    );
  end loop;
end
$$;

create index if not exists idx_aie_user_type
  on public.access_intelligence_events(user_id, event_type, created_at desc);
create index if not exists idx_aie_bathroom_type
  on public.access_intelligence_events(bathroom_id, event_type, created_at desc)
  where bathroom_id is not null;
create index if not exists idx_aie_type_time
  on public.access_intelligence_events(event_type, created_at desc);
create index if not exists idx_aie_session
  on public.access_intelligence_events(session_id, created_at)
  where session_id is not null;
create index if not exists idx_aie_fingerprint
  on public.access_intelligence_events(device_fingerprint, created_at desc)
  where device_fingerprint is not null;

alter table public.access_intelligence_events enable row level security;

drop policy if exists "aie_select_self" on public.access_intelligence_events;
create policy "aie_select_self"
  on public.access_intelligence_events for select
  using (auth.uid() = user_id);

-- All inserts flow through log_access_intelligence_event / _batch security-definer RPCs.

-- ---------------------------------------------------------------------------
-- Extend public.business_claims (existing table) with email-verification
-- columns for the Section 6 claim flow. Original rows remain valid; new
-- columns are all nullable.
-- ---------------------------------------------------------------------------
alter table public.business_claims
  add column if not exists business_id uuid references public.businesses(id) on delete cascade;

alter table public.business_claims
  add column if not exists email_domain text;

alter table public.business_claims
  add column if not exists verification_code text;

alter table public.business_claims
  add column if not exists verification_sent_at timestamptz;

alter table public.business_claims
  add column if not exists verification_expires_at timestamptz;

create index if not exists idx_business_claims_business_id
  on public.business_claims(business_id) where business_id is not null;

-- ---------------------------------------------------------------------------
-- Grants. Read-only views where authenticated users need visibility through
-- RLS. Tables themselves are locked down; RPCs bypass RLS with security
-- definer where needed.
-- ---------------------------------------------------------------------------
grant select on public.hardware_partners to authenticated;
grant select on public.businesses to anon, authenticated;
grant select on public.code_verifications to authenticated;
grant select on public.access_intelligence_events to authenticated;
grant select on public.device_fingerprints to authenticated;

-- End of 044.
