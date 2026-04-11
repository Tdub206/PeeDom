-- ============================================================================
-- Server capabilities foundation
-- 041_server_capabilities_foundation.sql
-- Adds contributor reputation, duplicate moderation workflows, restroom
-- archetypes, and business-managed code policy primitives.
-- ============================================================================

create extension if not exists pg_trgm;

create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profiles
    where profiles.id = p_user_id
      and profiles.role = 'admin'
      and profiles.is_suspended = false
      and coalesce(profiles.is_deactivated, false) = false
  );
$$;

revoke all on function public.is_admin_user(uuid) from public;
grant execute on function public.is_admin_user(uuid) to authenticated, service_role;

create or replace function public.normalize_bathroom_name(p_value text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      lower(coalesce(p_value, '')),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

alter table public.bathrooms
  add column if not exists location_archetype text not null default 'general',
  add column if not exists archetype_metadata jsonb not null default '{}'::jsonb,
  add column if not exists merged_into_bathroom_id uuid references public.bathrooms(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bathrooms_location_archetype_check'
  ) then
    alter table public.bathrooms
      add constraint bathrooms_location_archetype_check
      check (
        location_archetype in (
          'general',
          'park',
          'store',
          'restaurant',
          'transit',
          'event_portable',
          'medical',
          'campus',
          'library',
          'mall',
          'airport',
          'hotel'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bathrooms_archetype_metadata_object_check'
  ) then
    alter table public.bathrooms
      add constraint bathrooms_archetype_metadata_object_check
      check (jsonb_typeof(archetype_metadata) = 'object');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bathrooms_merged_into_self_check'
  ) then
    alter table public.bathrooms
      add constraint bathrooms_merged_into_self_check
      check (merged_into_bathroom_id is null or merged_into_bathroom_id <> id);
  end if;
end
$$;

create index if not exists idx_bathrooms_location_archetype
  on public.bathrooms (location_archetype, updated_at desc);

create index if not exists idx_bathrooms_merged_into
  on public.bathrooms (merged_into_bathroom_id)
  where merged_into_bathroom_id is not null;

create index if not exists idx_bathrooms_place_name_trgm
  on public.bathrooms
  using gin (lower(place_name) gin_trgm_ops);

alter table public.business_bathroom_settings
  add column if not exists code_policy text not null default 'community',
  add column if not exists allow_user_code_submissions boolean not null default true,
  add column if not exists owner_supplied_code text,
  add column if not exists owner_code_last_verified_at timestamptz,
  add column if not exists owner_code_notes text,
  add column if not exists official_access_instructions text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_bathroom_settings_code_policy_check'
  ) then
    alter table public.business_bathroom_settings
      add constraint business_bathroom_settings_code_policy_check
      check (code_policy in ('community', 'owner_shared', 'owner_private', 'staff_only'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_bathroom_settings_owner_supplied_code_length_check'
  ) then
    alter table public.business_bathroom_settings
      add constraint business_bathroom_settings_owner_supplied_code_length_check
      check (
        owner_supplied_code is null
        or char_length(trim(owner_supplied_code)) between 2 and 32
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_bathroom_settings_owner_code_notes_length_check'
  ) then
    alter table public.business_bathroom_settings
      add constraint business_bathroom_settings_owner_code_notes_length_check
      check (
        owner_code_notes is null
        or char_length(owner_code_notes) <= 280
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_bathroom_settings_official_access_instructions_length_check'
  ) then
    alter table public.business_bathroom_settings
      add constraint business_bathroom_settings_official_access_instructions_length_check
      check (
        official_access_instructions is null
        or char_length(official_access_instructions) <= 500
      );
  end if;
end
$$;

create index if not exists idx_business_bathroom_settings_code_policy
  on public.business_bathroom_settings (code_policy, updated_at desc);

create table if not exists public.contributor_reputation_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  trust_tier text not null default 'brand_new' check (
    trust_tier in (
      'brand_new',
      'lightly_trusted',
      'verified_contributor',
      'highly_reliable_local',
      'business_verified_manager',
      'flagged_low_trust'
    )
  ),
  trust_score numeric(5, 2) not null default 25 check (trust_score >= 0 and trust_score <= 100),
  trust_weight numeric(5, 2) not null default 1.00 check (trust_weight >= 0.25 and trust_weight <= 4.00),
  accepted_contributions integer not null default 0,
  rejected_contributions integer not null default 0,
  reports_resolved integer not null default 0,
  reports_dismissed integer not null default 0,
  approved_photos integer not null default 0,
  rejected_photos integer not null default 0,
  active_codes integer not null default 0,
  removed_codes integer not null default 0,
  bathrooms_added integer not null default 0,
  approved_claims integer not null default 0,
  moderation_flag_count integer not null default 0,
  code_success_ratio numeric(5, 2) not null default 0 check (code_success_ratio >= 0 and code_success_ratio <= 1),
  primary_city text,
  primary_state text,
  last_contribution_at timestamptz,
  last_calculated_at timestamptz not null default now()
);

create index if not exists idx_contributor_reputation_tier
  on public.contributor_reputation_profiles (trust_tier, trust_score desc);

alter table public.contributor_reputation_profiles enable row level security;

drop policy if exists "contributor_reputation_select_self_or_admin" on public.contributor_reputation_profiles;
create policy "contributor_reputation_select_self_or_admin"
  on public.contributor_reputation_profiles for select
  using (auth.uid() = user_id or public.is_admin_user(auth.uid()));

create table if not exists public.bathroom_duplicate_cases (
  id uuid primary key default gen_random_uuid(),
  bathroom_a_id uuid not null references public.bathrooms(id) on delete cascade,
  bathroom_b_id uuid not null references public.bathrooms(id) on delete cascade,
  reported_by uuid references public.profiles(id) on delete set null,
  status text not null default 'open' check (
    status in ('open', 'under_review', 'merged', 'dismissed', 'quarantined')
  ),
  similarity_score numeric(6, 4) not null default 0 check (
    similarity_score >= 0 and similarity_score <= 1
  ),
  distance_meters numeric(10, 2),
  suggested_merge_target_id uuid references public.bathrooms(id) on delete set null,
  merge_into_bathroom_id uuid references public.bathrooms(id) on delete set null,
  reason text,
  auto_flagged boolean not null default false,
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bathroom_duplicate_cases_pair_order_check check (
    bathroom_a_id <> bathroom_b_id
    and bathroom_a_id::text < bathroom_b_id::text
  )
);

create unique index if not exists idx_bathroom_duplicate_cases_unique_pair
  on public.bathroom_duplicate_cases (bathroom_a_id, bathroom_b_id);

create index if not exists idx_bathroom_duplicate_cases_status
  on public.bathroom_duplicate_cases (status, created_at asc);

create table if not exists public.bathroom_quarantine_events (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  duplicate_case_id uuid references public.bathroom_duplicate_cases(id) on delete set null,
  action text not null check (action in ('quarantined', 'restored')),
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bathroom_quarantine_events_bathroom
  on public.bathroom_quarantine_events (bathroom_id, created_at desc);

alter table public.bathroom_duplicate_cases enable row level security;
alter table public.bathroom_quarantine_events enable row level security;

drop policy if exists "bathroom_duplicate_cases_admin_only" on public.bathroom_duplicate_cases;
create policy "bathroom_duplicate_cases_admin_only"
  on public.bathroom_duplicate_cases for select
  using (public.is_admin_user(auth.uid()));

drop policy if exists "bathroom_quarantine_events_admin_only" on public.bathroom_quarantine_events;
create policy "bathroom_quarantine_events_admin_only"
  on public.bathroom_quarantine_events for select
  using (public.is_admin_user(auth.uid()));

create or replace function public.set_server_capability_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bathroom_duplicate_cases_updated_at on public.bathroom_duplicate_cases;
create trigger set_bathroom_duplicate_cases_updated_at
  before update on public.bathroom_duplicate_cases
  for each row
  execute function public.set_server_capability_updated_at();

create or replace function public.business_code_policy_rank(p_policy text)
returns integer
language sql
immutable
as $$
  select case coalesce(p_policy, 'community')
    when 'staff_only' then 4
    when 'owner_private' then 3
    when 'owner_shared' then 2
    else 1
  end;
$$;

create or replace function public.business_badge_priority_rank(p_badge_type text)
returns integer
language sql
immutable
as $$
  select case coalesce(p_badge_type, 'standard')
    when 'featured' then 3
    when 'premium' then 2
    else 1
  end;
$$;

create or replace function public.get_bathroom_archetype_template(
  p_location_archetype text
)
returns jsonb
language sql
stable
as $$
  select case coalesce(p_location_archetype, 'general')
    when 'park' then jsonb_build_object(
      'seasonal_closure', null,
      'has_lighting', null,
      'building_context', 'standalone',
      'water_fountain_nearby', null
    )
    when 'store' then jsonb_build_object(
      'purchase_expected', null,
      'floor_hint', null,
      'located_inside', true,
      'security_gate_present', null
    )
    when 'restaurant' then jsonb_build_object(
      'customer_only_policy', null,
      'host_stand_required', null,
      'separate_restroom_key', null
    )
    when 'transit' then jsonb_build_object(
      'fare_gate_required', null,
      'platform_access_required', null,
      'operator_name', null
    )
    when 'event_portable' then jsonb_build_object(
      'event_name', null,
      'event_end_date', null,
      'portable_unit_count', null,
      'washing_station_present', null
    )
    when 'medical' then jsonb_build_object(
      'security_desk_required', null,
      'patient_only', null,
      'elevator_required', null
    )
    when 'campus' then jsonb_build_object(
      'building_name', null,
      'floor_hint', null,
      'requires_badge_access', null
    )
    when 'library' then jsonb_build_object(
      'floor_hint', null,
      'public_desk_confirmation_needed', null
    )
    when 'mall' then jsonb_build_object(
      'nearest_anchor_store', null,
      'floor_hint', null,
      'food_court_nearby', null
    )
    when 'airport' then jsonb_build_object(
      'terminal', null,
      'post_security', null,
      'nearest_gate', null
    )
    when 'hotel' then jsonb_build_object(
      'lobby_only', null,
      'floor_hint', null,
      'valet_or_front_desk_required', null
    )
    else jsonb_build_object(
      'entry_hint', null,
      'notes', null
    )
  end;
$$;

grant execute on function public.get_bathroom_archetype_template(text) to authenticated, anon, service_role;

create or replace function public.upsert_bathroom_archetype(
  p_bathroom_id uuid,
  p_location_archetype text,
  p_archetype_metadata jsonb default '{}'::jsonb
)
returns setof public.bathrooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.assert_active_user();
  v_target public.bathrooms%rowtype;
  v_archetype text := lower(trim(coalesce(p_location_archetype, 'general')));
  v_metadata jsonb := coalesce(p_archetype_metadata, '{}'::jsonb);
begin
  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'INVALID_ARCHETYPE_METADATA' using errcode = 'P0001';
  end if;

  if v_archetype not in (
    'general',
    'park',
    'store',
    'restaurant',
    'transit',
    'event_portable',
    'medical',
    'campus',
    'library',
    'mall',
    'airport',
    'hotel'
  ) then
    raise exception 'INVALID_BATHROOM_ARCHETYPE' using errcode = 'P0001';
  end if;

  select *
  into v_target
  from public.bathrooms bathrooms
  where bathrooms.id = p_bathroom_id
  for update;

  if v_target.id is null then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not (
    public.is_admin_user(v_user_id)
    or public.user_can_manage_business_bathroom(v_user_id, p_bathroom_id)
    or v_target.created_by = v_user_id
  ) then
    raise exception 'BATHROOM_EDIT_FORBIDDEN' using errcode = 'P0001';
  end if;

  update public.bathrooms
  set
    location_archetype = v_archetype,
    archetype_metadata = public.get_bathroom_archetype_template(v_archetype) || v_metadata,
    updated_at = now()
  where id = p_bathroom_id;

  return query
  select bathrooms.*
  from public.bathrooms bathrooms
  where bathrooms.id = p_bathroom_id;
end;
$$;

revoke all on function public.upsert_bathroom_archetype(uuid, text, jsonb) from public;
grant execute on function public.upsert_bathroom_archetype(uuid, text, jsonb) to authenticated, service_role;

create or replace function public.refresh_contributor_reputation(
  p_user_id uuid
)
returns setof public.contributor_reputation_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_active_codes integer := 0;
  v_removed_codes integer := 0;
  v_bathrooms_added integer := 0;
  v_approved_photos integer := 0;
  v_rejected_photos integer := 0;
  v_reports_resolved integer := 0;
  v_reports_dismissed integer := 0;
  v_approved_claims integer := 0;
  v_moderation_flag_count integer := 0;
  v_accepted integer := 0;
  v_rejected integer := 0;
  v_code_success_ratio numeric(5, 2) := 0;
  v_trust_score numeric(5, 2) := 25;
  v_trust_weight numeric(5, 2) := 1.00;
  v_trust_tier text := 'brand_new';
  v_last_contribution_at timestamptz;
  v_primary_city text;
  v_primary_state text;
begin
  if p_user_id is null then
    raise exception 'INVALID_USER_ID' using errcode = 'P0001';
  end if;

  select *
  into v_profile
  from public.profiles profiles
  where profiles.id = p_user_id;

  if v_profile.id is null then
    return;
  end if;

  select count(*)
  into v_bathrooms_added
  from public.bathrooms bathrooms
  where bathrooms.created_by = p_user_id
    and bathrooms.moderation_status = 'active';

  select count(*)
  into v_active_codes
  from public.bathroom_access_codes codes
  where codes.submitted_by = p_user_id
    and codes.lifecycle_status = 'active'
    and codes.visibility_status = 'visible';

  select count(*)
  into v_removed_codes
  from public.bathroom_access_codes codes
  where codes.submitted_by = p_user_id
    and codes.visibility_status in ('needs_review', 'removed');

  select
    count(*) filter (where photos.moderation_status = 'approved'),
    count(*) filter (where photos.moderation_status = 'rejected')
  into v_approved_photos, v_rejected_photos
  from public.bathroom_photos photos
  where photos.uploaded_by = p_user_id;

  select
    count(*) filter (where reports.status = 'resolved'),
    count(*) filter (where reports.status = 'dismissed')
  into v_reports_resolved, v_reports_dismissed
  from public.bathroom_reports reports
  where reports.reported_by = p_user_id;

  select count(*)
  into v_approved_claims
  from public.business_claims claims
  where claims.claimant_user_id = p_user_id
    and claims.review_status = 'approved';

  select count(*)
  into v_moderation_flag_count
  from public.user_reports reports
  where reports.reported_user_id = p_user_id
    and reports.status in ('pending', 'reviewed', 'actioned');

  v_accepted := greatest(
    v_bathrooms_added
    + v_active_codes
    + v_approved_photos
    + v_reports_resolved
    + v_approved_claims,
    0
  );

  v_rejected := greatest(
    v_removed_codes
    + v_rejected_photos
    + v_reports_dismissed,
    0
  );

  v_code_success_ratio := case
    when v_active_codes + v_removed_codes = 0 then 0
    else round(
      v_active_codes::numeric
      / greatest(v_active_codes + v_removed_codes, 1),
      2
    )
  end;

  select max(contributed_at)
  into v_last_contribution_at
  from (
    select bathrooms.created_at as contributed_at
    from public.bathrooms bathrooms
    where bathrooms.created_by = p_user_id

    union all

    select codes.created_at
    from public.bathroom_access_codes codes
    where codes.submitted_by = p_user_id

    union all

    select photos.created_at
    from public.bathroom_photos photos
    where photos.uploaded_by = p_user_id

    union all

    select reports.created_at
    from public.bathroom_reports reports
    where reports.reported_by = p_user_id
  ) contributions;

  select region.city, region.state
  into v_primary_city, v_primary_state
  from (
    select
      contributions.city,
      contributions.state,
      count(*) as contribution_count,
      max(contributions.created_at) as last_activity
    from (
      select bathrooms.city, bathrooms.state, bathrooms.created_at
      from public.bathrooms bathrooms
      where bathrooms.created_by = p_user_id

      union all

      select bathrooms.city, bathrooms.state, codes.created_at
      from public.bathroom_access_codes codes
      join public.bathrooms bathrooms
        on bathrooms.id = codes.bathroom_id
      where codes.submitted_by = p_user_id

      union all

      select bathrooms.city, bathrooms.state, photos.created_at
      from public.bathroom_photos photos
      join public.bathrooms bathrooms
        on bathrooms.id = photos.bathroom_id
      where photos.uploaded_by = p_user_id

      union all

      select bathrooms.city, bathrooms.state, reports.created_at
      from public.bathroom_reports reports
      join public.bathrooms bathrooms
        on bathrooms.id = reports.bathroom_id
      where reports.reported_by = p_user_id
    ) contributions
    where contributions.city is not null
      or contributions.state is not null
    group by contributions.city, contributions.state
    order by contribution_count desc, last_activity desc
    limit 1
  ) region;

  v_trust_score := 25
    + least(v_bathrooms_added, 6) * 4
    + least(v_active_codes, 8) * 4
    + least(v_approved_photos, 5) * 3
    + least(v_reports_resolved, 5) * 2
    + least(v_approved_claims, 2) * 8
    + (v_code_success_ratio * 16)
    - least(v_rejected, 10) * 4
    - least(v_moderation_flag_count, 5) * 10;

  if v_profile.is_suspended = true or coalesce(v_profile.is_deactivated, false) = true then
    v_trust_score := 10;
    v_trust_tier := 'flagged_low_trust';
  elsif v_moderation_flag_count >= 3 or v_trust_score < 25 then
    v_trust_tier := 'flagged_low_trust';
  elsif v_profile.role = 'business' and v_approved_claims > 0 and v_trust_score >= 45 then
    v_trust_tier := 'business_verified_manager';
  elsif v_trust_score >= 85 and v_accepted >= 12 and (v_primary_city is not null or v_primary_state is not null) then
    v_trust_tier := 'highly_reliable_local';
  elsif v_trust_score >= 65 and v_accepted >= 6 then
    v_trust_tier := 'verified_contributor';
  elsif v_trust_score >= 35 or v_accepted >= 2 then
    v_trust_tier := 'lightly_trusted';
  else
    v_trust_tier := 'brand_new';
  end if;

  v_trust_score := greatest(0, least(100, round(v_trust_score, 2)));

  v_trust_weight := case v_trust_tier
    when 'flagged_low_trust' then 0.35
    when 'business_verified_manager' then 2.20
    when 'highly_reliable_local' then 1.90
    when 'verified_contributor' then 1.55
    when 'lightly_trusted' then 1.20
    else 1.00
  end;

  insert into public.contributor_reputation_profiles (
    user_id,
    trust_tier,
    trust_score,
    trust_weight,
    accepted_contributions,
    rejected_contributions,
    reports_resolved,
    reports_dismissed,
    approved_photos,
    rejected_photos,
    active_codes,
    removed_codes,
    bathrooms_added,
    approved_claims,
    moderation_flag_count,
    code_success_ratio,
    primary_city,
    primary_state,
    last_contribution_at,
    last_calculated_at
  )
  values (
    p_user_id,
    v_trust_tier,
    v_trust_score,
    v_trust_weight,
    v_accepted,
    v_rejected,
    v_reports_resolved,
    v_reports_dismissed,
    v_approved_photos,
    v_rejected_photos,
    v_active_codes,
    v_removed_codes,
    v_bathrooms_added,
    v_approved_claims,
    v_moderation_flag_count,
    v_code_success_ratio,
    v_primary_city,
    v_primary_state,
    v_last_contribution_at,
    now()
  )
  on conflict (user_id) do update
  set
    trust_tier = excluded.trust_tier,
    trust_score = excluded.trust_score,
    trust_weight = excluded.trust_weight,
    accepted_contributions = excluded.accepted_contributions,
    rejected_contributions = excluded.rejected_contributions,
    reports_resolved = excluded.reports_resolved,
    reports_dismissed = excluded.reports_dismissed,
    approved_photos = excluded.approved_photos,
    rejected_photos = excluded.rejected_photos,
    active_codes = excluded.active_codes,
    removed_codes = excluded.removed_codes,
    bathrooms_added = excluded.bathrooms_added,
    approved_claims = excluded.approved_claims,
    moderation_flag_count = excluded.moderation_flag_count,
    code_success_ratio = excluded.code_success_ratio,
    primary_city = excluded.primary_city,
    primary_state = excluded.primary_state,
    last_contribution_at = excluded.last_contribution_at,
    last_calculated_at = excluded.last_calculated_at;

  return query
  select reputation.*
  from public.contributor_reputation_profiles reputation
  where reputation.user_id = p_user_id;
end;
$$;

create or replace function public.get_contributor_reputation(
  p_user_id uuid default null
)
returns table (
  user_id uuid,
  trust_tier text,
  trust_score numeric,
  trust_weight numeric,
  accepted_contributions integer,
  rejected_contributions integer,
  reports_resolved integer,
  reports_dismissed integer,
  approved_photos integer,
  rejected_photos integer,
  active_codes integer,
  removed_codes integer,
  bathrooms_added integer,
  approved_claims integer,
  moderation_flag_count integer,
  code_success_ratio numeric,
  primary_city text,
  primary_state text,
  last_contribution_at timestamptz,
  last_calculated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_user_id uuid := coalesce(p_user_id, auth.uid());
begin
  if v_request_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if v_request_user_id <> auth.uid() and not public.is_admin_user(auth.uid()) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.contributor_reputation_profiles reputation
    where reputation.user_id = v_request_user_id
  ) then
    perform public.refresh_contributor_reputation(v_request_user_id);
  end if;

  return query
  select
    reputation.user_id,
    reputation.trust_tier,
    reputation.trust_score,
    reputation.trust_weight,
    reputation.accepted_contributions,
    reputation.rejected_contributions,
    reputation.reports_resolved,
    reputation.reports_dismissed,
    reputation.approved_photos,
    reputation.rejected_photos,
    reputation.active_codes,
    reputation.removed_codes,
    reputation.bathrooms_added,
    reputation.approved_claims,
    reputation.moderation_flag_count,
    reputation.code_success_ratio,
    reputation.primary_city,
    reputation.primary_state,
    reputation.last_contribution_at,
    reputation.last_calculated_at
  from public.contributor_reputation_profiles reputation
  where reputation.user_id = v_request_user_id;
end;
$$;

create or replace function public.get_contributor_trust_weight(
  p_user_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_weight numeric := 1.00;
begin
  if p_user_id is null then
    return v_weight;
  end if;

  if not exists (
    select 1
    from public.contributor_reputation_profiles reputation
    where reputation.user_id = p_user_id
  ) then
    perform public.refresh_contributor_reputation(p_user_id);
  end if;

  select reputation.trust_weight
  into v_weight
  from public.contributor_reputation_profiles reputation
  where reputation.user_id = p_user_id;

  return coalesce(v_weight, 1.00);
end;
$$;

revoke all on function public.refresh_contributor_reputation(uuid) from public;
revoke all on function public.get_contributor_reputation(uuid) from public;
revoke all on function public.get_contributor_trust_weight(uuid) from public;
grant execute on function public.refresh_contributor_reputation(uuid) to authenticated, service_role;
grant execute on function public.get_contributor_reputation(uuid) to authenticated, service_role;
grant execute on function public.get_contributor_trust_weight(uuid) to authenticated, service_role;

create or replace function public.refresh_contributor_reputation_from_user_column()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if tg_op <> 'DELETE' then
    v_user_id := nullif(to_jsonb(new) ->> tg_argv[0], '')::uuid;
  end if;

  if v_user_id is null and tg_op <> 'INSERT' then
    v_user_id := nullif(to_jsonb(old) ->> tg_argv[0], '')::uuid;
  end if;

  if v_user_id is not null then
    perform public.refresh_contributor_reputation(v_user_id);
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_contributor_reputation_from_code_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submitter_id uuid;
  v_code_id uuid := coalesce(new.code_id, old.code_id);
begin
  select codes.submitted_by
  into v_submitter_id
  from public.bathroom_access_codes codes
  where codes.id = v_code_id;

  if v_submitter_id is not null then
    perform public.refresh_contributor_reputation(v_submitter_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_contributor_reputation_on_profile_insert on public.profiles;
create trigger refresh_contributor_reputation_on_profile_insert
  after insert on public.profiles
  for each row
  execute function public.refresh_contributor_reputation_from_user_column('id');

drop trigger if exists refresh_contributor_reputation_on_bathroom_change on public.bathrooms;
create trigger refresh_contributor_reputation_on_bathroom_change
  after insert or update or delete on public.bathrooms
  for each row
  execute function public.refresh_contributor_reputation_from_user_column('created_by');

drop trigger if exists refresh_contributor_reputation_on_code_change on public.bathroom_access_codes;
create trigger refresh_contributor_reputation_on_code_change
  after insert or update or delete on public.bathroom_access_codes
  for each row
  execute function public.refresh_contributor_reputation_from_user_column('submitted_by');

drop trigger if exists refresh_contributor_reputation_on_photo_change on public.bathroom_photos;
create trigger refresh_contributor_reputation_on_photo_change
  after insert or update or delete on public.bathroom_photos
  for each row
  execute function public.refresh_contributor_reputation_from_user_column('uploaded_by');

drop trigger if exists refresh_contributor_reputation_on_report_change on public.bathroom_reports;
create trigger refresh_contributor_reputation_on_report_change
  after insert or update or delete on public.bathroom_reports
  for each row
  execute function public.refresh_contributor_reputation_from_user_column('reported_by');

drop trigger if exists refresh_contributor_reputation_on_claim_change on public.business_claims;
create trigger refresh_contributor_reputation_on_claim_change
  after insert or update or delete on public.business_claims
  for each row
  execute function public.refresh_contributor_reputation_from_user_column('claimant_user_id');

drop trigger if exists refresh_contributor_reputation_on_user_report_target_change on public.user_reports;
create trigger refresh_contributor_reputation_on_user_report_target_change
  after insert or update or delete on public.user_reports
  for each row
  execute function public.refresh_contributor_reputation_from_user_column('reported_user_id');

drop trigger if exists refresh_contributor_reputation_on_code_vote_change on public.code_votes;
create trigger refresh_contributor_reputation_on_code_vote_change
  after insert or update or delete on public.code_votes
  for each row
  execute function public.refresh_contributor_reputation_from_code_vote();

create or replace function public.upsert_business_bathroom_settings_v2(
  p_bathroom_id uuid,
  p_requires_premium_access boolean default false,
  p_show_on_free_map boolean default false,
  p_is_location_verified boolean default false,
  p_code_policy text default 'community',
  p_allow_user_code_submissions boolean default true,
  p_owner_supplied_code text default null,
  p_owner_code_notes text default null,
  p_official_access_instructions text default null,
  p_owner_code_last_verified_at timestamptz default null
)
returns setof public.business_bathroom_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.assert_active_user();
  v_existing_verified_at timestamptz;
  v_existing_owner_verified_at timestamptz;
  v_code_policy text := lower(trim(coalesce(p_code_policy, 'community')));
  v_owner_supplied_code text := nullif(trim(coalesce(p_owner_supplied_code, '')), '');
  v_owner_code_notes text := nullif(trim(coalesce(p_owner_code_notes, '')), '');
  v_official_access_instructions text := nullif(trim(coalesce(p_official_access_instructions, '')), '');
  v_allow_user_code_submissions boolean := p_allow_user_code_submissions;
begin
  if not public.user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'BUSINESS_ACCESS_REQUIRED' using errcode = 'P0001';
  end if;

  if v_code_policy not in ('community', 'owner_shared', 'owner_private', 'staff_only') then
    raise exception 'INVALID_CODE_POLICY' using errcode = 'P0001';
  end if;

  if v_owner_supplied_code is not null and v_code_policy = 'community' then
    raise exception 'OWNER_CODE_POLICY_REQUIRED' using errcode = 'P0001';
  end if;

  if v_code_policy in ('owner_private', 'staff_only') then
    v_allow_user_code_submissions := false;
  end if;

  select
    settings.location_verified_at,
    settings.owner_code_last_verified_at
  into
    v_existing_verified_at,
    v_existing_owner_verified_at
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;

  insert into public.business_bathroom_settings (
    bathroom_id,
    requires_premium_access,
    show_on_free_map,
    is_location_verified,
    location_verified_at,
    updated_by,
    code_policy,
    allow_user_code_submissions,
    owner_supplied_code,
    owner_code_last_verified_at,
    owner_code_notes,
    official_access_instructions
  )
  values (
    p_bathroom_id,
    p_requires_premium_access,
    case when p_requires_premium_access then p_show_on_free_map else true end,
    p_is_location_verified,
    case
      when p_is_location_verified then coalesce(v_existing_verified_at, now())
      else null
    end,
    v_user_id,
    v_code_policy,
    v_allow_user_code_submissions,
    v_owner_supplied_code,
    case
      when v_owner_supplied_code is null then null
      else coalesce(p_owner_code_last_verified_at, v_existing_owner_verified_at, now())
    end,
    v_owner_code_notes,
    v_official_access_instructions
  )
  on conflict (bathroom_id) do update
  set
    requires_premium_access = excluded.requires_premium_access,
    show_on_free_map = excluded.show_on_free_map,
    is_location_verified = excluded.is_location_verified,
    location_verified_at = excluded.location_verified_at,
    updated_by = excluded.updated_by,
    code_policy = excluded.code_policy,
    allow_user_code_submissions = excluded.allow_user_code_submissions,
    owner_supplied_code = excluded.owner_supplied_code,
    owner_code_last_verified_at = excluded.owner_code_last_verified_at,
    owner_code_notes = excluded.owner_code_notes,
    official_access_instructions = excluded.official_access_instructions;

  perform public.sync_business_verification_badge_state(p_bathroom_id);

  return query
  select settings.*
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;
end;
$$;

create or replace function public.get_bathroom_code_policy(
  p_bathroom_id uuid
)
returns table (
  bathroom_id uuid,
  code_policy text,
  allow_user_code_submissions boolean,
  has_official_code boolean,
  owner_code_last_verified_at timestamptz,
  owner_code_notes text,
  official_access_instructions text,
  can_manager_view_official_code boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  return query
  select
    p_bathroom_id,
    coalesce(settings.code_policy, 'community'),
    coalesce(settings.allow_user_code_submissions, true),
    settings.owner_supplied_code is not null,
    settings.owner_code_last_verified_at,
    settings.owner_code_notes,
    settings.official_access_instructions,
    public.user_can_manage_business_bathroom(auth.uid(), p_bathroom_id)
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id

  union all

  select
    p_bathroom_id,
    'community',
    true,
    false,
    null,
    null,
    null,
    false
  where not exists (
    select 1
    from public.business_bathroom_settings settings
    where settings.bathroom_id = p_bathroom_id
  );
end;
$$;

create or replace function public.get_business_managed_code(
  p_bathroom_id uuid
)
returns table (
  bathroom_id uuid,
  code_policy text,
  owner_supplied_code text,
  owner_code_last_verified_at timestamptz,
  owner_code_notes text,
  official_access_instructions text,
  allow_user_code_submissions boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.user_can_manage_business_bathroom(public.assert_active_user(), p_bathroom_id) then
    raise exception 'BUSINESS_ACCESS_REQUIRED' using errcode = 'P0001';
  end if;

  return query
  select
    settings.bathroom_id,
    settings.code_policy,
    settings.owner_supplied_code,
    settings.owner_code_last_verified_at,
    settings.owner_code_notes,
    settings.official_access_instructions,
    settings.allow_user_code_submissions,
    settings.updated_at
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;
end;
$$;

revoke all on function public.upsert_business_bathroom_settings_v2(uuid, boolean, boolean, boolean, text, boolean, text, text, text, timestamptz) from public;
revoke all on function public.get_bathroom_code_policy(uuid) from public;
revoke all on function public.get_business_managed_code(uuid) from public;
grant execute on function public.upsert_business_bathroom_settings_v2(uuid, boolean, boolean, boolean, text, boolean, text, text, text, timestamptz) to authenticated, service_role;
grant execute on function public.get_bathroom_code_policy(uuid) to authenticated, service_role;
grant execute on function public.get_business_managed_code(uuid) to authenticated, service_role;

create or replace function public.refresh_bathroom_access_code_aggregates(
  p_code_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  vote_summary record;
  current_code record;
  effective_last_verified_at timestamptz;
  approval_ratio numeric := 0.50;
  weighted_approval_ratio numeric := 0.50;
  submitter_weight numeric := 1.00;
  base_confidence numeric := 0;
  final_confidence numeric := 0;
begin
  select
    count(*) filter (where vote = 1)::integer as up_votes,
    count(*) filter (where vote = -1)::integer as down_votes,
    max(case when vote = 1 then created_at end) as last_positive_vote_at,
    coalesce(sum(
      case when vote = 1 then public.get_contributor_trust_weight(user_id) else 0 end
    ), 0)::numeric as weighted_up_votes,
    coalesce(sum(
      case when vote = -1 then public.get_contributor_trust_weight(user_id) else 0 end
    ), 0)::numeric as weighted_down_votes
  into vote_summary
  from public.code_votes
  where code_id = p_code_id;

  select
    id,
    last_verified_at,
    submitted_by
  into current_code
  from public.bathroom_access_codes codes
  where codes.id = p_code_id;

  if current_code.id is null then
    return;
  end if;

  effective_last_verified_at := coalesce(vote_summary.last_positive_vote_at, current_code.last_verified_at);

  if coalesce(vote_summary.up_votes, 0) + coalesce(vote_summary.down_votes, 0) > 0 then
    approval_ratio := coalesce(vote_summary.up_votes, 0)::numeric
      / greatest(coalesce(vote_summary.up_votes, 0) + coalesce(vote_summary.down_votes, 0), 1);
  end if;

  if coalesce(vote_summary.weighted_up_votes, 0) + coalesce(vote_summary.weighted_down_votes, 0) > 0 then
    weighted_approval_ratio := coalesce(vote_summary.weighted_up_votes, 0)
      / greatest(coalesce(vote_summary.weighted_up_votes, 0) + coalesce(vote_summary.weighted_down_votes, 0), 1);
  else
    weighted_approval_ratio := approval_ratio;
  end if;

  submitter_weight := public.get_contributor_trust_weight(current_code.submitted_by);
  base_confidence := public.calculate_code_confidence(
    coalesce(vote_summary.up_votes, 0),
    coalesce(vote_summary.down_votes, 0),
    effective_last_verified_at
  );

  final_confidence := greatest(
    0,
    least(
      100,
      round(
        base_confidence
        + ((weighted_approval_ratio - approval_ratio) * 18)
        + (least(greatest(submitter_weight - 1, 0), 2.5) * 4),
        2
      )
    )
  );

  update public.bathroom_access_codes codes
  set
    up_votes = coalesce(vote_summary.up_votes, 0),
    down_votes = coalesce(vote_summary.down_votes, 0),
    last_verified_at = effective_last_verified_at,
    confidence_score = final_confidence,
    updated_at = now()
  where codes.id = p_code_id;
end;
$$;

create or replace function public.submit_bathroom_access_code(
  p_bathroom_id uuid,
  p_code_value text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_code_value text;
  v_code_id uuid;
  v_trust_tier text := 'brand_new';
  v_initial_visibility text := 'visible';
  v_initial_confidence numeric := 40;
  v_code_policy text := 'community';
  v_allow_user_code_submissions boolean := true;
begin
  v_user_id := public.assert_active_user();
  v_code_value := trim(coalesce(p_code_value, ''));

  if char_length(v_code_value) < 2 or char_length(v_code_value) > 32 then
    raise exception 'INVALID_CODE_VALUE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  select
    coalesce(settings.code_policy, 'community'),
    coalesce(settings.allow_user_code_submissions, true)
  into
    v_code_policy,
    v_allow_user_code_submissions
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;

  if v_code_policy in ('owner_private', 'staff_only') or v_allow_user_code_submissions = false then
    raise exception 'CODE_SUBMISSION_DISABLED' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bathroom_access_codes codes
    where codes.submitted_by = v_user_id
      and codes.bathroom_id = p_bathroom_id
      and codes.created_at >= now() - interval '7 days'
  ) then
    raise exception 'CODE_SUBMISSION_COOLDOWN' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.contributor_reputation_profiles reputation
    where reputation.user_id = v_user_id
  ) then
    perform public.refresh_contributor_reputation(v_user_id);
  end if;

  select reputation.trust_tier
  into v_trust_tier
  from public.contributor_reputation_profiles reputation
  where reputation.user_id = v_user_id;

  if v_trust_tier = 'flagged_low_trust' then
    v_initial_visibility := 'needs_review';
    v_initial_confidence := 24;
  elsif v_trust_tier = 'business_verified_manager' then
    v_initial_confidence := 82;
  elsif v_trust_tier = 'highly_reliable_local' then
    v_initial_confidence := 74;
  elsif v_trust_tier = 'verified_contributor' then
    v_initial_confidence := 64;
  elsif v_trust_tier = 'lightly_trusted' then
    v_initial_confidence := 52;
  end if;

  update public.bathroom_access_codes codes
  set
    lifecycle_status = 'superseded',
    updated_at = timezone('utc', now())
  where codes.submitted_by = v_user_id
    and codes.bathroom_id = p_bathroom_id
    and codes.lifecycle_status = 'active';

  insert into public.bathroom_access_codes (
    bathroom_id,
    submitted_by,
    code_value,
    confidence_score,
    visibility_status,
    last_verified_at
  )
  values (
    p_bathroom_id,
    v_user_id,
    v_code_value,
    v_initial_confidence,
    v_initial_visibility,
    timezone('utc', now())
  )
  returning id into v_code_id;

  return jsonb_build_object(
    'code_id', v_code_id,
    'created_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.find_duplicate_bathroom_candidates(
  p_bathroom_id uuid default null,
  p_place_name text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_radius_m integer default 150,
  p_limit integer default 10
)
returns table (
  bathroom_id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  distance_meters double precision,
  name_similarity numeric,
  duplicate_score numeric,
  moderation_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_place_name text := trim(coalesce(p_place_name, ''));
  v_latitude double precision := p_latitude;
  v_longitude double precision := p_longitude;
  v_radius_m integer := greatest(coalesce(p_radius_m, 150), 25);
  v_limit integer := greatest(least(coalesce(p_limit, 10), 50), 1);
begin
  if p_bathroom_id is not null then
    select
      bathrooms.place_name,
      bathrooms.latitude,
      bathrooms.longitude
    into
      v_place_name,
      v_latitude,
      v_longitude
    from public.bathrooms bathrooms
    where bathrooms.id = p_bathroom_id;
  end if;

  if v_place_name = '' or v_latitude is null or v_longitude is null then
    raise exception 'INVALID_DUPLICATE_SEARCH_INPUT' using errcode = 'P0001';
  end if;

  return query
  with candidates as (
    select
      bathrooms.id as bathroom_id,
      bathrooms.place_name,
      bathrooms.address_line1,
      bathrooms.city,
      bathrooms.state,
      st_distancesphere(
        st_makepoint(bathrooms.longitude, bathrooms.latitude),
        st_makepoint(v_longitude, v_latitude)
      ) as distance_meters,
      similarity(
        public.normalize_bathroom_name(bathrooms.place_name),
        public.normalize_bathroom_name(v_place_name)
      ) as name_similarity,
      bathrooms.moderation_status
    from public.bathrooms bathrooms
    where bathrooms.moderation_status in ('active', 'flagged')
      and (p_bathroom_id is null or bathrooms.id <> p_bathroom_id)
      and st_dwithin(
        bathrooms.geom,
        st_setsrid(st_makepoint(v_longitude, v_latitude), 4326)::geography,
        v_radius_m
      )
  )
  select
    candidates.bathroom_id,
    candidates.place_name,
    candidates.address_line1,
    candidates.city,
    candidates.state,
    candidates.distance_meters,
    round(candidates.name_similarity::numeric, 4) as name_similarity,
    round(
      least(
        1,
        greatest(
          (1 - least(candidates.distance_meters, v_radius_m)::numeric / v_radius_m) * 0.55
          + candidates.name_similarity * 0.45,
          candidates.name_similarity
        )
      ),
      4
    ) as duplicate_score,
    candidates.moderation_status
  from candidates
  where candidates.name_similarity >= 0.22
    or candidates.distance_meters <= 35
  order by duplicate_score desc, candidates.distance_meters asc, candidates.place_name asc
  limit v_limit;
end;
$$;

create or replace function public.create_duplicate_case(
  p_bathroom_id_a uuid,
  p_bathroom_id_b uuid,
  p_reason text default null,
  p_auto_flagged boolean default false,
  p_similarity_score numeric default null,
  p_distance_meters numeric default null,
  p_suggested_merge_target_id uuid default null
)
returns setof public.bathroom_duplicate_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.assert_active_user();
  v_bathroom_a_id uuid;
  v_bathroom_b_id uuid;
begin
  if not public.is_admin_user(v_admin_id) then
    raise exception 'ADMIN_ONLY' using errcode = 'P0001';
  end if;

  if p_bathroom_id_a is null or p_bathroom_id_b is null or p_bathroom_id_a = p_bathroom_id_b then
    raise exception 'INVALID_DUPLICATE_PAIR' using errcode = 'P0001';
  end if;

  if p_bathroom_id_a::text < p_bathroom_id_b::text then
    v_bathroom_a_id := p_bathroom_id_a;
    v_bathroom_b_id := p_bathroom_id_b;
  else
    v_bathroom_a_id := p_bathroom_id_b;
    v_bathroom_b_id := p_bathroom_id_a;
  end if;

  if not exists (select 1 from public.bathrooms bathrooms where bathrooms.id = v_bathroom_a_id) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.bathrooms bathrooms where bathrooms.id = v_bathroom_b_id) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.bathroom_duplicate_cases (
    bathroom_a_id,
    bathroom_b_id,
    reported_by,
    status,
    similarity_score,
    distance_meters,
    suggested_merge_target_id,
    reason,
    auto_flagged,
    notes
  )
  values (
    v_bathroom_a_id,
    v_bathroom_b_id,
    v_admin_id,
    'open',
    greatest(0, least(coalesce(p_similarity_score, 0), 1)),
    p_distance_meters,
    p_suggested_merge_target_id,
    nullif(trim(coalesce(p_reason, '')), ''),
    p_auto_flagged,
    null
  )
  on conflict (bathroom_a_id, bathroom_b_id) do update
  set
    similarity_score = greatest(public.bathroom_duplicate_cases.similarity_score, excluded.similarity_score),
    distance_meters = coalesce(public.bathroom_duplicate_cases.distance_meters, excluded.distance_meters),
    suggested_merge_target_id = coalesce(excluded.suggested_merge_target_id, public.bathroom_duplicate_cases.suggested_merge_target_id),
    reason = coalesce(excluded.reason, public.bathroom_duplicate_cases.reason),
    auto_flagged = public.bathroom_duplicate_cases.auto_flagged or excluded.auto_flagged,
    status = case
      when public.bathroom_duplicate_cases.status in ('merged', 'dismissed', 'quarantined') then public.bathroom_duplicate_cases.status
      else 'open'
    end,
    updated_at = now();

  return query
  select duplicate_cases.*
  from public.bathroom_duplicate_cases duplicate_cases
  where duplicate_cases.bathroom_a_id = v_bathroom_a_id
    and duplicate_cases.bathroom_b_id = v_bathroom_b_id;
end;
$$;

create or replace function public.list_duplicate_cases(
  p_status text default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  bathroom_a_id uuid,
  bathroom_a_name text,
  bathroom_a_address text,
  bathroom_b_id uuid,
  bathroom_b_name text,
  bathroom_b_address text,
  status text,
  similarity_score numeric,
  distance_meters numeric,
  suggested_merge_target_id uuid,
  merge_into_bathroom_id uuid,
  reason text,
  auto_flagged boolean,
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.assert_active_user();
begin
  if not public.is_admin_user(v_admin_id) then
    raise exception 'ADMIN_ONLY' using errcode = 'P0001';
  end if;

  return query
  select
    duplicate_cases.id,
    duplicate_cases.bathroom_a_id,
    bathroom_a.place_name,
    trim(concat_ws(', ', bathroom_a.address_line1, bathroom_a.city, bathroom_a.state)),
    duplicate_cases.bathroom_b_id,
    bathroom_b.place_name,
    trim(concat_ws(', ', bathroom_b.address_line1, bathroom_b.city, bathroom_b.state)),
    duplicate_cases.status,
    duplicate_cases.similarity_score,
    duplicate_cases.distance_meters,
    duplicate_cases.suggested_merge_target_id,
    duplicate_cases.merge_into_bathroom_id,
    duplicate_cases.reason,
    duplicate_cases.auto_flagged,
    duplicate_cases.notes,
    duplicate_cases.reviewed_by,
    duplicate_cases.reviewed_at,
    duplicate_cases.created_at,
    duplicate_cases.updated_at
  from public.bathroom_duplicate_cases duplicate_cases
  join public.bathrooms bathroom_a
    on bathroom_a.id = duplicate_cases.bathroom_a_id
  join public.bathrooms bathroom_b
    on bathroom_b.id = duplicate_cases.bathroom_b_id
  where p_status is null or duplicate_cases.status = p_status
  order by
    case duplicate_cases.status
      when 'open' then 1
      when 'under_review' then 2
      when 'quarantined' then 3
      when 'merged' then 4
      else 5
    end,
    duplicate_cases.created_at asc
  limit greatest(least(coalesce(p_limit, 50), 200), 1);
end;
$$;

create or replace function public.quarantine_bathroom(
  p_bathroom_id uuid,
  p_reason text default null,
  p_duplicate_case_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.assert_active_user();
begin
  if not public.is_admin_user(v_admin_id) then
    raise exception 'ADMIN_ONLY' using errcode = 'P0001';
  end if;

  update public.bathrooms
  set
    moderation_status = 'hidden',
    updated_at = now()
  where id = p_bathroom_id;

  if not found then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.bathroom_quarantine_events (
    bathroom_id,
    duplicate_case_id,
    action,
    reason,
    created_by
  )
  values (
    p_bathroom_id,
    p_duplicate_case_id,
    'quarantined',
    nullif(trim(coalesce(p_reason, '')), ''),
    v_admin_id
  );

  return jsonb_build_object(
    'bathroom_id', p_bathroom_id,
    'status', 'quarantined',
    'quarantined_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.restore_quarantined_bathroom(
  p_bathroom_id uuid,
  p_reason text default null,
  p_duplicate_case_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.assert_active_user();
begin
  if not public.is_admin_user(v_admin_id) then
    raise exception 'ADMIN_ONLY' using errcode = 'P0001';
  end if;

  update public.bathrooms
  set
    moderation_status = 'active',
    updated_at = now()
  where id = p_bathroom_id;

  if not found then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.bathroom_quarantine_events (
    bathroom_id,
    duplicate_case_id,
    action,
    reason,
    created_by
  )
  values (
    p_bathroom_id,
    p_duplicate_case_id,
    'restored',
    nullif(trim(coalesce(p_reason, '')), ''),
    v_admin_id
  );

  return jsonb_build_object(
    'bathroom_id', p_bathroom_id,
    'status', 'restored',
    'restored_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.merge_bathrooms(
  p_source_bathroom_id uuid,
  p_target_bathroom_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.assert_active_user();
  v_source public.bathrooms%rowtype;
  v_target public.bathrooms%rowtype;
begin
  if not public.is_admin_user(v_admin_id) then
    raise exception 'ADMIN_ONLY' using errcode = 'P0001';
  end if;

  if p_source_bathroom_id is null or p_target_bathroom_id is null or p_source_bathroom_id = p_target_bathroom_id then
    raise exception 'INVALID_MERGE_PAIR' using errcode = 'P0001';
  end if;

  select *
  into v_source
  from public.bathrooms bathrooms
  where bathrooms.id = p_source_bathroom_id
  for update;

  select *
  into v_target
  from public.bathrooms bathrooms
  where bathrooms.id = p_target_bathroom_id
  for update;

  if v_source.id is null or v_target.id is null then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.bathrooms target
  set
    address_line1 = coalesce(target.address_line1, v_source.address_line1),
    city = coalesce(target.city, v_source.city),
    state = coalesce(target.state, v_source.state),
    postal_code = coalesce(target.postal_code, v_source.postal_code),
    country_code = coalesce(target.country_code, v_source.country_code),
    is_locked = coalesce(target.is_locked, v_source.is_locked),
    is_accessible = coalesce(target.is_accessible, v_source.is_accessible),
    is_customer_only = target.is_customer_only or v_source.is_customer_only,
    hours_json = coalesce(target.hours_json, v_source.hours_json),
    hours_source = case
      when target.hours_json is null and v_source.hours_json is not null then v_source.hours_source
      else target.hours_source
    end,
    hours_offset_minutes = coalesce(target.hours_offset_minutes, v_source.hours_offset_minutes),
    google_place_id = coalesce(target.google_place_id, v_source.google_place_id),
    accessibility_features = case
      when coalesce(target.accessibility_features, '{}'::jsonb) = '{}'::jsonb then coalesce(v_source.accessibility_features, '{}'::jsonb)
      else coalesce(v_source.accessibility_features, '{}'::jsonb) || coalesce(target.accessibility_features, '{}'::jsonb)
    end,
    location_archetype = case
      when target.location_archetype = 'general' and v_source.location_archetype <> 'general' then v_source.location_archetype
      else target.location_archetype
    end,
    archetype_metadata = case
      when coalesce(target.archetype_metadata, '{}'::jsonb) = '{}'::jsonb then coalesce(v_source.archetype_metadata, '{}'::jsonb)
      else coalesce(v_source.archetype_metadata, '{}'::jsonb) || coalesce(target.archetype_metadata, '{}'::jsonb)
    end,
    show_on_free_map = target.show_on_free_map or v_source.show_on_free_map,
    created_by = coalesce(target.created_by, v_source.created_by),
    updated_at = now()
  where target.id = p_target_bathroom_id;

  insert into public.favorites (user_id, bathroom_id, created_at)
  select
    favorites.user_id,
    p_target_bathroom_id,
    min(favorites.created_at)
  from public.favorites favorites
  where favorites.bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
  group by favorites.user_id
  on conflict (user_id, bathroom_id) do update
  set created_at = least(public.favorites.created_at, excluded.created_at);
  delete from public.favorites where bathroom_id = p_source_bathroom_id;

  insert into public.push_subscriptions (user_id, bathroom_id, subscribed_at)
  select
    subscriptions.user_id,
    p_target_bathroom_id,
    min(subscriptions.subscribed_at)
  from public.push_subscriptions subscriptions
  where subscriptions.bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
  group by subscriptions.user_id
  on conflict (user_id, bathroom_id) do update
  set subscribed_at = least(public.push_subscriptions.subscribed_at, excluded.subscribed_at);
  delete from public.push_subscriptions where bathroom_id = p_source_bathroom_id;

  with selected_ratings as (
    select distinct on (ratings.user_id)
      ratings.id,
      ratings.user_id,
      ratings.rating,
      ratings.notes,
      ratings.created_at
    from public.cleanliness_ratings ratings
    where ratings.bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
    order by ratings.user_id, ratings.created_at desc, case when ratings.bathroom_id = p_target_bathroom_id then 0 else 1 end
  ),
  deleted_ratings as (
    delete from public.cleanliness_ratings
    where bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
    returning id
  )
  insert into public.cleanliness_ratings (id, bathroom_id, user_id, rating, notes, created_at)
  select
    selected_ratings.id,
    p_target_bathroom_id,
    selected_ratings.user_id,
    selected_ratings.rating,
    selected_ratings.notes,
    selected_ratings.created_at
  from selected_ratings;

  insert into public.code_reveal_grants (
    user_id,
    bathroom_id,
    grant_source,
    expires_at,
    created_at,
    updated_at
  )
  select
    grants.user_id,
    p_target_bathroom_id,
    grants.grant_source,
    max(grants.expires_at),
    min(grants.created_at),
    max(grants.updated_at)
  from public.code_reveal_grants grants
  where grants.bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
  group by grants.user_id, grants.grant_source
  on conflict (bathroom_id, user_id) do update
  set
    expires_at = greatest(public.code_reveal_grants.expires_at, excluded.expires_at),
    updated_at = greatest(public.code_reveal_grants.updated_at, excluded.updated_at),
    grant_source = excluded.grant_source;
  delete from public.code_reveal_grants where bathroom_id = p_source_bathroom_id;

  with selected_alerts as (
    select distinct on (alerts.user_id)
      alerts.id,
      alerts.user_id,
      alerts.target_arrival_at,
      alerts.lead_minutes,
      alerts.status,
      alerts.created_at,
      alerts.updated_at
    from public.premium_arrival_alerts alerts
    where alerts.bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
    order by
      alerts.user_id,
      case alerts.status
        when 'active' then 1
        when 'cancelled' then 2
        else 3
      end,
      alerts.updated_at desc,
      alerts.target_arrival_at desc
  ),
  deleted_alerts as (
    delete from public.premium_arrival_alerts
    where bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
    returning id
  )
  insert into public.premium_arrival_alerts (
    id,
    user_id,
    bathroom_id,
    target_arrival_at,
    lead_minutes,
    status,
    created_at,
    updated_at
  )
  select
    selected_alerts.id,
    selected_alerts.user_id,
    p_target_bathroom_id,
    selected_alerts.target_arrival_at,
    selected_alerts.lead_minutes,
    selected_alerts.status,
    selected_alerts.created_at,
    selected_alerts.updated_at
  from selected_alerts;

  with selected_kudos as (
    select distinct on (kudos.user_id)
      kudos.id,
      kudos.user_id,
      kudos.message,
      kudos.created_at
    from public.business_kudos kudos
    where kudos.bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
    order by kudos.user_id, kudos.created_at desc
  ),
  deleted_kudos as (
    delete from public.business_kudos
    where bathroom_id in (p_source_bathroom_id, p_target_bathroom_id)
    returning id
  )
  insert into public.business_kudos (id, bathroom_id, user_id, message, created_at)
  select
    selected_kudos.id,
    p_target_bathroom_id,
    selected_kudos.user_id,
    selected_kudos.message,
    selected_kudos.created_at
  from selected_kudos;

  update public.bathroom_access_codes set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.bathroom_reports set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.bathroom_photos set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.bathroom_status_events set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.business_claims set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.business_hours_updates set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.bathroom_views set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.bathroom_navigation_events set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.business_promotions set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.business_growth_invites set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.bathroom_stallpass_visits set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.business_coupons set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.featured_placement_requests set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;
  update public.business_featured_placements set bathroom_id = p_target_bathroom_id where bathroom_id = p_source_bathroom_id;

  if exists (
    select 1
    from public.business_bathroom_settings settings
    where settings.bathroom_id = p_source_bathroom_id
  ) then
    if exists (
      select 1
      from public.business_bathroom_settings settings
      where settings.bathroom_id = p_target_bathroom_id
    ) then
      update public.business_bathroom_settings target
      set
        requires_premium_access = target.requires_premium_access or source.requires_premium_access,
        show_on_free_map = target.show_on_free_map or source.show_on_free_map,
        is_location_verified = target.is_location_verified or source.is_location_verified,
        location_verified_at = case
          when target.location_verified_at is null then source.location_verified_at
          when source.location_verified_at is null then target.location_verified_at
          else greatest(target.location_verified_at, source.location_verified_at)
        end,
        pricing_plan = case
          when target.pricing_plan = 'lifetime' or source.pricing_plan = 'lifetime' then 'lifetime'
          else 'standard'
        end,
        pricing_plan_granted_at = coalesce(target.pricing_plan_granted_at, source.pricing_plan_granted_at),
        updated_by = coalesce(target.updated_by, source.updated_by, v_admin_id),
        code_policy = case
          when public.business_code_policy_rank(target.code_policy) >= public.business_code_policy_rank(source.code_policy)
            then target.code_policy
          else source.code_policy
        end,
        allow_user_code_submissions = target.allow_user_code_submissions and source.allow_user_code_submissions,
        owner_supplied_code = coalesce(target.owner_supplied_code, source.owner_supplied_code),
        owner_code_last_verified_at = case
          when target.owner_code_last_verified_at is null then source.owner_code_last_verified_at
          when source.owner_code_last_verified_at is null then target.owner_code_last_verified_at
          else greatest(target.owner_code_last_verified_at, source.owner_code_last_verified_at)
        end,
        owner_code_notes = coalesce(target.owner_code_notes, source.owner_code_notes),
        official_access_instructions = coalesce(target.official_access_instructions, source.official_access_instructions),
        updated_at = now()
      from public.business_bathroom_settings source
      where target.bathroom_id = p_target_bathroom_id
        and source.bathroom_id = p_source_bathroom_id;

      delete from public.business_bathroom_settings where bathroom_id = p_source_bathroom_id;
    else
      update public.business_bathroom_settings
      set bathroom_id = p_target_bathroom_id
      where bathroom_id = p_source_bathroom_id;
    end if;
  end if;

  if exists (
    select 1
    from public.business_verification_badges badges
    where badges.bathroom_id = p_source_bathroom_id
  ) then
    if exists (
      select 1
      from public.business_verification_badges badges
      where badges.bathroom_id = p_target_bathroom_id
    ) then
      update public.business_verification_badges target
      set
        verified_at = least(target.verified_at, source.verified_at),
        verified_by = coalesce(target.verified_by, source.verified_by),
        badge_type = case
          when public.business_badge_priority_rank(target.badge_type) >= public.business_badge_priority_rank(source.badge_type)
            then target.badge_type
          else source.badge_type
        end,
        expires_at = case
          when target.expires_at is null or source.expires_at is null then null
          else greatest(target.expires_at, source.expires_at)
        end
      from public.business_verification_badges source
      where target.bathroom_id = p_target_bathroom_id
        and source.bathroom_id = p_source_bathroom_id;

      delete from public.business_verification_badges where bathroom_id = p_source_bathroom_id;
    else
      update public.business_verification_badges
      set bathroom_id = p_target_bathroom_id
      where bathroom_id = p_source_bathroom_id;
    end if;
  end if;

  update public.bathroom_duplicate_cases
  set
    notes = coalesce(notes, '') || case
      when coalesce(notes, '') = '' then ''
      else E'\n'
    end || 'Merged source bathroom into ' || p_target_bathroom_id::text,
    updated_at = now()
  where status in ('open', 'under_review')
    and (
      bathroom_a_id = p_source_bathroom_id
      or bathroom_b_id = p_source_bathroom_id
    );

  update public.bathrooms
  set
    moderation_status = 'deleted',
    merged_into_bathroom_id = p_target_bathroom_id,
    updated_at = now()
  where id = p_source_bathroom_id;

  if v_target.created_by is not null then
    perform public.refresh_contributor_reputation(v_target.created_by);
  end if;

  if v_source.created_by is not null then
    perform public.refresh_contributor_reputation(v_source.created_by);
  end if;

  return jsonb_build_object(
    'source_bathroom_id', p_source_bathroom_id,
    'target_bathroom_id', p_target_bathroom_id,
    'merged_at', timezone('utc', now()),
    'notes', nullif(trim(coalesce(p_notes, '')), '')
  );
end;
$$;

create or replace function public.resolve_duplicate_case(
  p_case_id uuid,
  p_action text,
  p_target_bathroom_id uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := public.assert_active_user();
  v_case public.bathroom_duplicate_cases%rowtype;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_source_bathroom_id uuid;
begin
  if not public.is_admin_user(v_admin_id) then
    raise exception 'ADMIN_ONLY' using errcode = 'P0001';
  end if;

  select *
  into v_case
  from public.bathroom_duplicate_cases duplicate_cases
  where duplicate_cases.id = p_case_id
  for update;

  if v_case.id is null then
    raise exception 'DUPLICATE_CASE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_action not in ('under_review', 'dismiss', 'merge', 'quarantine') then
    raise exception 'INVALID_DUPLICATE_CASE_ACTION' using errcode = 'P0001';
  end if;

  if v_action = 'under_review' then
    update public.bathroom_duplicate_cases
    set
      status = 'under_review',
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_case_id;
  elsif v_action = 'dismiss' then
    update public.bathroom_duplicate_cases
    set
      status = 'dismissed',
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_case_id;
  elsif v_action = 'merge' then
    if p_target_bathroom_id is null or p_target_bathroom_id not in (v_case.bathroom_a_id, v_case.bathroom_b_id) then
      raise exception 'INVALID_MERGE_TARGET' using errcode = 'P0001';
    end if;

    v_source_bathroom_id := case
      when p_target_bathroom_id = v_case.bathroom_a_id then v_case.bathroom_b_id
      else v_case.bathroom_a_id
    end;

    perform public.merge_bathrooms(v_source_bathroom_id, p_target_bathroom_id, p_notes);

    update public.bathroom_duplicate_cases
    set
      status = 'merged',
      merge_into_bathroom_id = p_target_bathroom_id,
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_case_id;
  else
    if p_target_bathroom_id is null or p_target_bathroom_id not in (v_case.bathroom_a_id, v_case.bathroom_b_id) then
      raise exception 'INVALID_QUARANTINE_TARGET' using errcode = 'P0001';
    end if;

    perform public.quarantine_bathroom(p_target_bathroom_id, p_notes, p_case_id);

    update public.bathroom_duplicate_cases
    set
      status = 'quarantined',
      notes = coalesce(nullif(trim(coalesce(p_notes, '')), ''), notes),
      reviewed_by = v_admin_id,
      reviewed_at = now(),
      updated_at = now()
    where id = p_case_id;
  end if;

  return jsonb_build_object(
    'case_id', p_case_id,
    'action', v_action,
    'target_bathroom_id', p_target_bathroom_id,
    'resolved_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.find_duplicate_bathroom_candidates(uuid, text, double precision, double precision, integer, integer) from public;
revoke all on function public.create_duplicate_case(uuid, uuid, text, boolean, numeric, numeric, uuid) from public;
revoke all on function public.list_duplicate_cases(text, integer) from public;
revoke all on function public.quarantine_bathroom(uuid, text, uuid) from public;
revoke all on function public.restore_quarantined_bathroom(uuid, text, uuid) from public;
revoke all on function public.merge_bathrooms(uuid, uuid, text) from public;
revoke all on function public.resolve_duplicate_case(uuid, text, uuid, text) from public;

grant execute on function public.find_duplicate_bathroom_candidates(uuid, text, double precision, double precision, integer, integer) to authenticated, service_role;
grant execute on function public.create_duplicate_case(uuid, uuid, text, boolean, numeric, numeric, uuid) to authenticated, service_role;
grant execute on function public.list_duplicate_cases(text, integer) to authenticated, service_role;
grant execute on function public.quarantine_bathroom(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.restore_quarantined_bathroom(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.merge_bathrooms(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.resolve_duplicate_case(uuid, text, uuid, text) to authenticated, service_role;

create or replace view public.v_bathroom_detail_public as
with active_offer_rollup as (
  select
    promotions.bathroom_id,
    count(*) filter (
      where promotions.is_active = true
        and (promotions.starts_at is null or promotions.starts_at <= now())
        and (promotions.ends_at is null or promotions.ends_at >= now())
    )::integer as active_offer_count
  from public.business_promotions promotions
  group by promotions.bathroom_id
)
select
  bathrooms.id,
  bathrooms.place_name,
  bathrooms.address_line1,
  bathrooms.city,
  bathrooms.state,
  bathrooms.postal_code,
  bathrooms.country_code,
  bathrooms.latitude,
  bathrooms.longitude,
  bathrooms.is_locked,
  bathrooms.is_accessible,
  bathrooms.is_customer_only,
  bathrooms.hours_json,
  code_summary.code_id,
  code_summary.confidence_score,
  code_summary.up_votes,
  code_summary.down_votes,
  code_summary.last_verified_at,
  code_summary.expires_at,
  cleanliness_summary.cleanliness_avg,
  bathrooms.updated_at,
  bathrooms.accessibility_features,
  public.calculate_accessibility_score(
    bathrooms.is_accessible,
    bathrooms.accessibility_features
  ) as accessibility_score,
  badges.badge_type as verification_badge_type,
  case
    when coalesce(settings.requires_premium_access, false) then 'premium'
    else 'public'
  end as stallpass_access_tier,
  coalesce(settings.show_on_free_map, true) as show_on_free_map,
  coalesce(settings.is_location_verified, false) as is_business_location_verified,
  settings.location_verified_at,
  coalesce(active_offer_rollup.active_offer_count, 0) as active_offer_count,
  bathrooms.location_archetype,
  bathrooms.archetype_metadata,
  coalesce(settings.code_policy, 'community') as code_policy,
  coalesce(settings.allow_user_code_submissions, true) as allow_user_code_submissions,
  (settings.owner_supplied_code is not null) as has_official_code,
  settings.owner_code_last_verified_at,
  settings.official_access_instructions
from public.bathrooms bathrooms
left join public.v_bathroom_code_summary code_summary
  on code_summary.bathroom_id = bathrooms.id
left join public.v_bathroom_cleanliness_summary cleanliness_summary
  on cleanliness_summary.bathroom_id = bathrooms.id
left join public.business_verification_badges badges
  on badges.bathroom_id = bathrooms.id
  and (badges.expires_at is null or badges.expires_at > now())
left join public.business_bathroom_settings settings
  on settings.bathroom_id = bathrooms.id
left join active_offer_rollup
  on active_offer_rollup.bathroom_id = bathrooms.id
where bathrooms.moderation_status = 'active';

do $$
declare
  profile_row record;
begin
  insert into public.contributor_reputation_profiles (user_id)
  select profiles.id
  from public.profiles profiles
  on conflict (user_id) do nothing;

  for profile_row in
    select profiles.id
    from public.profiles profiles
  loop
    perform public.refresh_contributor_reputation(profile_row.id);
  end loop;
end
$$;
