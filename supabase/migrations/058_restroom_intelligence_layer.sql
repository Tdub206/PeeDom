-- ============================================================================
-- StallPass Restroom Intelligence Layer
-- 058_restroom_intelligence_layer.sql
-- Adds field-level trust, need metadata, richer live status events,
-- and saved need profiles as additive schema.
-- ============================================================================

-- Keep table updated_at columns consistent without duplicating per-table logic.
create or replace function public.set_restroom_intelligence_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- Field-level attribute confirmations
-- ============================================================================

create table if not exists public.bathroom_attribute_confirmations (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  field_name text not null,
  field_value_snapshot jsonb not null default '{}'::jsonb,
  source_type text not null check (
    source_type in (
      'user_report',
      'business_verified',
      'admin_verified',
      'municipal_verified',
      'system_import',
      'photo_evidence',
      'live_status'
    )
  ),
  source_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  business_id uuid null references public.businesses(id) on delete set null,
  confidence_score numeric(5,4) not null default 0.5000 check (
    confidence_score >= 0
    and confidence_score <= 1
  ),
  last_confirmed_at timestamptz not null default now(),
  evidence_photo_url text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bathroom_attribute_confirmations_field_name_non_empty
    check (length(trim(field_name)) > 0)
);

create index if not exists idx_bathroom_attribute_confirmations_bathroom_field_recent
  on public.bathroom_attribute_confirmations(bathroom_id, field_name, last_confirmed_at desc);
create index if not exists idx_bathroom_attribute_confirmations_field_name
  on public.bathroom_attribute_confirmations(field_name);
create index if not exists idx_bathroom_attribute_confirmations_source_type
  on public.bathroom_attribute_confirmations(source_type);
create index if not exists idx_bathroom_attribute_confirmations_confidence
  on public.bathroom_attribute_confirmations(confidence_score desc);

drop trigger if exists set_bathroom_attribute_confirmations_updated_at on public.bathroom_attribute_confirmations;
create trigger set_bathroom_attribute_confirmations_updated_at
  before update on public.bathroom_attribute_confirmations
  for each row execute function public.set_restroom_intelligence_updated_at();

alter table public.bathroom_attribute_confirmations enable row level security;

drop policy if exists "bathroom_attribute_confirmations_select_public" on public.bathroom_attribute_confirmations;
create policy "bathroom_attribute_confirmations_select_public"
  on public.bathroom_attribute_confirmations for select
  using (
    exists (
      select 1
      from public.bathrooms bathrooms
      where bathrooms.id = bathroom_attribute_confirmations.bathroom_id
        and bathrooms.moderation_status = 'active'
    )
  );

drop policy if exists "bathroom_attribute_confirmations_insert_authenticated" on public.bathroom_attribute_confirmations;
create policy "bathroom_attribute_confirmations_insert_authenticated"
  on public.bathroom_attribute_confirmations for insert
  to authenticated
  with check (
    auth.uid() is not null
    and (
      source_user_id is null
      or source_user_id = auth.uid()
      or public.is_admin_user(auth.uid())
    )
    and (
      source_type in ('user_report', 'photo_evidence', 'live_status')
      or (
        source_type = 'business_verified'
        and (
          public.is_admin_user(auth.uid())
          or exists (
            select 1
            from public.business_claims claims
            where claims.bathroom_id = bathroom_attribute_confirmations.bathroom_id
              and claims.claimant_user_id = auth.uid()
              and claims.review_status = 'approved'
          )
        )
      )
      or (
        source_type in ('admin_verified', 'municipal_verified', 'system_import')
        and public.is_admin_user(auth.uid())
      )
    )
  );

-- ============================================================================
-- Need-based restroom metadata
-- ============================================================================

create table if not exists public.bathroom_need_metadata (
  bathroom_id uuid primary key references public.bathrooms(id) on delete cascade,
  has_toilet_paper boolean null,
  has_soap boolean null,
  has_hand_dryer boolean null,
  has_paper_towels boolean null,
  has_changing_table boolean null,
  has_family_restroom boolean null,
  is_gender_neutral boolean null,
  is_single_user boolean null,
  is_private_room boolean null,
  stall_count integer null check (stall_count >= 0),
  privacy_level text null check (
    privacy_level in ('unknown', 'low', 'medium', 'high', 'single_user')
  ),
  access_type text null check (
    access_type in (
      'unknown',
      'public',
      'customer_only',
      'ask_employee',
      'key_required',
      'code_required',
      'employee_only'
    )
  ),
  code_required boolean null,
  key_required boolean null,
  customer_only boolean null,
  ask_employee boolean null,
  medical_urgency_friendly boolean null,
  child_friendly boolean null,
  outdoor_traveler_reliable boolean null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bathroom_need_metadata_has_changing_table
  on public.bathroom_need_metadata(has_changing_table);
create index if not exists idx_bathroom_need_metadata_has_family_restroom
  on public.bathroom_need_metadata(has_family_restroom);
create index if not exists idx_bathroom_need_metadata_is_gender_neutral
  on public.bathroom_need_metadata(is_gender_neutral);
create index if not exists idx_bathroom_need_metadata_is_single_user
  on public.bathroom_need_metadata(is_single_user);
create index if not exists idx_bathroom_need_metadata_access_type
  on public.bathroom_need_metadata(access_type);
create index if not exists idx_bathroom_need_metadata_medical_urgency
  on public.bathroom_need_metadata(medical_urgency_friendly);

drop trigger if exists set_bathroom_need_metadata_updated_at on public.bathroom_need_metadata;
create trigger set_bathroom_need_metadata_updated_at
  before update on public.bathroom_need_metadata
  for each row execute function public.set_restroom_intelligence_updated_at();

alter table public.bathroom_need_metadata enable row level security;

drop policy if exists "bathroom_need_metadata_select_public" on public.bathroom_need_metadata;
create policy "bathroom_need_metadata_select_public"
  on public.bathroom_need_metadata for select
  using (
    exists (
      select 1
      from public.bathrooms bathrooms
      where bathrooms.id = bathroom_need_metadata.bathroom_id
        and bathrooms.moderation_status = 'active'
    )
  );

-- Writes stay RPC/service-driven to keep confidence and freshness controls centralized.

-- ============================================================================
-- Detailed accessibility metadata
-- ============================================================================

create table if not exists public.bathroom_accessibility_details (
  bathroom_id uuid primary key references public.bathrooms(id) on delete cascade,
  wheelchair_accessible boolean null,
  door_clear_width_inches numeric(5,2) null check (door_clear_width_inches is null or door_clear_width_inches > 0),
  turning_space_inches numeric(5,2) null check (turning_space_inches is null or turning_space_inches > 0),
  stall_width_inches numeric(5,2) null check (stall_width_inches is null or stall_width_inches > 0),
  stall_depth_inches numeric(5,2) null check (stall_depth_inches is null or stall_depth_inches > 0),
  has_grab_bars boolean null,
  has_accessible_sink boolean null,
  has_step_free_access boolean null,
  has_power_door boolean null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bathroom_accessibility_details_wheelchair_accessible
  on public.bathroom_accessibility_details(wheelchair_accessible);
create index if not exists idx_bathroom_accessibility_details_has_grab_bars
  on public.bathroom_accessibility_details(has_grab_bars);
create index if not exists idx_bathroom_accessibility_details_has_step_free_access
  on public.bathroom_accessibility_details(has_step_free_access);

drop trigger if exists set_bathroom_accessibility_details_updated_at on public.bathroom_accessibility_details;
create trigger set_bathroom_accessibility_details_updated_at
  before update on public.bathroom_accessibility_details
  for each row execute function public.set_restroom_intelligence_updated_at();

alter table public.bathroom_accessibility_details enable row level security;

drop policy if exists "bathroom_accessibility_details_select_public" on public.bathroom_accessibility_details;
create policy "bathroom_accessibility_details_select_public"
  on public.bathroom_accessibility_details for select
  using (
    exists (
      select 1
      from public.bathrooms bathrooms
      where bathrooms.id = bathroom_accessibility_details.bathroom_id
        and bathrooms.moderation_status = 'active'
    )
  );

-- Writes stay RPC/service-driven to preserve consistency with trust/freshness workflows.

-- ============================================================================
-- Rich live status events
-- ============================================================================

create table if not exists public.bathroom_live_status_events (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  status_type text not null check (
    status_type in (
      'cleanliness',
      'line',
      'occupancy',
      'supplies',
      'access',
      'closed',
      'open',
      'safety'
    )
  ),
  status_value text not null check (length(trim(status_value)) > 0),
  wait_minutes integer null check (wait_minutes >= 0 and wait_minutes <= 180),
  occupancy_level text null check (
    occupancy_level in ('unknown', 'empty', 'low', 'medium', 'high', 'full')
  ),
  supplies_missing text[] not null default '{}'::text[],
  reported_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  confidence_score numeric(5,4) not null default 0.5000 check (
    confidence_score >= 0
    and confidence_score <= 1
  ),
  constraint bathroom_live_status_events_status_value_valid
    check (
      case status_type
        when 'closed' then status_value in ('closed', 'temporarily_closed', 'closed_reported')
        when 'open' then status_value in ('open', 'reopened', 'open_reported')
        when 'line' then status_value in ('line', 'none', 'short', 'moderate', 'long', 'line_reported')
        when 'occupancy' then status_value in ('empty', 'low', 'medium', 'high', 'full', 'occupied')
        else true
      end
    ),
  evidence_photo_url text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bathroom_live_status_events_bathroom_reported
  on public.bathroom_live_status_events(bathroom_id, reported_at desc);
create index if not exists idx_bathroom_live_status_events_bathroom_expires
  on public.bathroom_live_status_events(bathroom_id, expires_at);
create index if not exists idx_bathroom_live_status_events_type_reported
  on public.bathroom_live_status_events(status_type, reported_at desc);

alter table public.bathroom_live_status_events enable row level security;

drop policy if exists "bathroom_live_status_events_select_non_expired" on public.bathroom_live_status_events;
create policy "bathroom_live_status_events_select_non_expired"
  on public.bathroom_live_status_events for select
  using (
    expires_at > now()
    and exists (
      select 1
      from public.bathrooms bathrooms
      where bathrooms.id = bathroom_live_status_events.bathroom_id
        and bathrooms.moderation_status = 'active'
    )
  );

drop policy if exists "bathroom_live_status_events_insert_authenticated" on public.bathroom_live_status_events;
create policy "bathroom_live_status_events_insert_authenticated"
  on public.bathroom_live_status_events for insert
  to authenticated
  with check (
    auth.uid() is not null
    and (
      user_id is null
      or user_id = auth.uid()
      or public.is_admin_user(auth.uid())
    )
  );

create or replace view public.get_current_bathroom_live_status as
with latest as (
  select distinct on (events.bathroom_id, events.status_type)
    events.id,
    events.bathroom_id,
    events.user_id,
    events.status_type,
    events.status_value,
    events.wait_minutes,
    events.occupancy_level,
    events.supplies_missing,
    events.reported_at,
    events.expires_at,
    events.confidence_score,
    events.evidence_photo_url,
    events.created_at
  from public.bathroom_live_status_events events
  where events.expires_at > now()
    and exists (
      select 1
      from public.bathrooms bathrooms
      where bathrooms.id = events.bathroom_id
        and bathrooms.moderation_status = 'active'
    )
  order by events.bathroom_id, events.status_type, events.reported_at desc, events.created_at desc
)
select
  latest.id,
  latest.bathroom_id,
  latest.user_id,
  latest.status_type,
  latest.status_value,
  latest.wait_minutes,
  latest.occupancy_level,
  latest.supplies_missing,
  latest.reported_at,
  latest.expires_at,
  latest.confidence_score,
  latest.evidence_photo_url,
  latest.created_at,
  greatest(0, floor(extract(epoch from (now() - latest.reported_at)) / 60))::integer as minutes_since_report,
  case
    when latest.status_type = 'line' then
      format('%s reported %s minutes ago', coalesce(nullif(latest.status_value, ''), 'line'), greatest(0, floor(extract(epoch from (now() - latest.reported_at)) / 60))::integer)
    when latest.status_type = 'supplies' then
      format('supplies missing %s minutes ago', greatest(0, floor(extract(epoch from (now() - latest.reported_at)) / 60))::integer)
    else
      format('%s %s minutes ago', coalesce(nullif(latest.status_value, ''), latest.status_type), greatest(0, floor(extract(epoch from (now() - latest.reported_at)) / 60))::integer)
  end as summary_text
from latest;

-- ============================================================================
-- Saved need profiles
-- ============================================================================

create table if not exists public.saved_need_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 64),
  preset_key text null check (
    preset_key in (
      'wheelchair',
      'family_with_child',
      'ibd_urgency',
      'no_code',
      'single_user_privacy',
      'custom'
    )
  ),
  filters jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_need_profiles_user_id
  on public.saved_need_profiles(user_id);
create unique index if not exists idx_saved_need_profiles_one_default_per_user
  on public.saved_need_profiles(user_id)
  where is_default = true;

drop trigger if exists set_saved_need_profiles_updated_at on public.saved_need_profiles;
create trigger set_saved_need_profiles_updated_at
  before update on public.saved_need_profiles
  for each row execute function public.set_restroom_intelligence_updated_at();

alter table public.saved_need_profiles enable row level security;

drop policy if exists "saved_need_profiles_select_own" on public.saved_need_profiles;
create policy "saved_need_profiles_select_own"
  on public.saved_need_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "saved_need_profiles_insert_own" on public.saved_need_profiles;
create policy "saved_need_profiles_insert_own"
  on public.saved_need_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "saved_need_profiles_update_own" on public.saved_need_profiles;
create policy "saved_need_profiles_update_own"
  on public.saved_need_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_need_profiles_delete_own" on public.saved_need_profiles;
create policy "saved_need_profiles_delete_own"
  on public.saved_need_profiles for delete
  to authenticated
  using (auth.uid() = user_id);

do $$
begin
  begin
    alter publication supabase_realtime add table public.bathroom_live_status_events;
  exception
    when duplicate_object then null;
  end;
end;
$$;
