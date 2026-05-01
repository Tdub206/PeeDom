-- ============================================================================
-- StallPass Accessibility Layer
-- 013_accessibility_layer.sql
-- Adds persistent accessibility preferences and richer structured bathroom
-- accessibility metadata on top of the existing JSONB model.
-- ============================================================================

alter table public.bathrooms
  alter column accessibility_features
  set default '{
    "has_grab_bars": false,
    "door_width_inches": null,
    "is_automatic_door": false,
    "has_changing_table": false,
    "is_family_restroom": false,
    "is_gender_neutral": false,
    "has_audio_cue": false,
    "has_braille_signage": false,
    "has_wheelchair_ramp": false,
    "has_elevator_access": false,
    "stall_width_inches": null,
    "turning_radius_inches": null,
    "notes": null,
    "photo_urls": [],
    "verification_date": null
  }'::jsonb;

update public.bathrooms
set accessibility_features = jsonb_strip_nulls(
  '{
    "has_grab_bars": false,
    "door_width_inches": null,
    "is_automatic_door": false,
    "has_changing_table": false,
    "is_family_restroom": false,
    "is_gender_neutral": false,
    "has_audio_cue": false,
    "has_braille_signage": false,
    "has_wheelchair_ramp": false,
    "has_elevator_access": false,
    "stall_width_inches": null,
    "turning_radius_inches": null,
    "notes": null,
    "photo_urls": [],
    "verification_date": null
  }'::jsonb || coalesce(accessibility_features, '{}'::jsonb)
)
where accessibility_features is null
   or jsonb_typeof(accessibility_features) <> 'object'
   or not accessibility_features ? 'has_braille_signage'
   or not accessibility_features ? 'has_wheelchair_ramp'
   or not accessibility_features ? 'has_elevator_access'
   or not accessibility_features ? 'stall_width_inches'
   or not accessibility_features ? 'turning_radius_inches'
   or not accessibility_features ? 'photo_urls'
   or not accessibility_features ? 'verification_date';

create index if not exists idx_bathrooms_accessibility_features_gin
  on public.bathrooms
  using gin (accessibility_features jsonb_path_ops);

create index if not exists idx_bathrooms_accessibility_grab_bars
  on public.bathrooms (((coalesce(accessibility_features ->> 'has_grab_bars', 'false'))::boolean));

create index if not exists idx_bathrooms_accessibility_auto_door
  on public.bathrooms (((coalesce(accessibility_features ->> 'is_automatic_door', 'false'))::boolean));

create index if not exists idx_bathrooms_accessibility_gender_neutral
  on public.bathrooms (((coalesce(accessibility_features ->> 'is_gender_neutral', 'false'))::boolean));

create index if not exists idx_bathrooms_accessibility_door_width
  on public.bathrooms ((((accessibility_features ->> 'door_width_inches')::integer)));

create index if not exists idx_bathrooms_accessibility_stall_width
  on public.bathrooms ((((accessibility_features ->> 'stall_width_inches')::integer)));

create table if not exists public.user_accessibility_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  accessibility_mode_enabled boolean not null default false,
  require_grab_bars boolean not null default false,
  require_automatic_door boolean not null default false,
  require_gender_neutral boolean not null default false,
  require_family_restroom boolean not null default false,
  require_changing_table boolean not null default false,
  min_door_width_inches integer,
  min_stall_width_inches integer,
  prioritize_accessible boolean not null default false,
  hide_non_accessible boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_accessibility_preferences_door_width_check
    check (min_door_width_inches is null or min_door_width_inches between 24 and 48),
  constraint user_accessibility_preferences_stall_width_check
    check (min_stall_width_inches is null or min_stall_width_inches between 36 and 120)
);

create index if not exists idx_user_accessibility_preferences_user
  on public.user_accessibility_preferences(user_id);

alter table public.user_accessibility_preferences enable row level security;

drop policy if exists "user_accessibility_preferences_select_own" on public.user_accessibility_preferences;
create policy "user_accessibility_preferences_select_own"
  on public.user_accessibility_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_accessibility_preferences_insert_own" on public.user_accessibility_preferences;
create policy "user_accessibility_preferences_insert_own"
  on public.user_accessibility_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_accessibility_preferences_update_own" on public.user_accessibility_preferences;
create policy "user_accessibility_preferences_update_own"
  on public.user_accessibility_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_accessibility_preferences_delete_own" on public.user_accessibility_preferences;
create policy "user_accessibility_preferences_delete_own"
  on public.user_accessibility_preferences for delete
  using (auth.uid() = user_id);

create or replace function public.calculate_accessibility_score(
  p_is_accessible boolean,
  p_features jsonb
)
returns integer
language sql
immutable
set search_path = public
as $$
  select least(
    100,
    greatest(
      0,
      (case when coalesce(p_is_accessible, false) then 20 else 0 end) +
      (case when coalesce((p_features ->> 'has_grab_bars')::boolean, false) then 15 else 0 end) +
      (case when coalesce((p_features ->> 'is_automatic_door')::boolean, false) then 10 else 0 end) +
      (case when coalesce((p_features ->> 'has_wheelchair_ramp')::boolean, false) then 10 else 0 end) +
      (case when coalesce((p_features ->> 'has_elevator_access')::boolean, false) then 10 else 0 end) +
      (case when coalesce((p_features ->> 'is_family_restroom')::boolean, false) then 10 else 0 end) +
      (case when coalesce((p_features ->> 'is_gender_neutral')::boolean, false) then 10 else 0 end) +
      (case when coalesce((p_features ->> 'has_changing_table')::boolean, false) then 10 else 0 end) +
      (case when coalesce((p_features ->> 'has_braille_signage')::boolean, false) then 5 else 0 end) +
      (case when coalesce((p_features ->> 'has_audio_cue')::boolean, false) then 5 else 0 end) +
      (case when coalesce((p_features ->> 'door_width_inches')::integer, 0) >= 32 then 5 else 0 end) +
      (case when coalesce((p_features ->> 'stall_width_inches')::integer, 0) >= 60 then 5 else 0 end) +
      (case when coalesce((p_features ->> 'turning_radius_inches')::integer, 0) >= 60 then 5 else 0 end)
    )
  );
$$;

create or replace view public.v_bathroom_detail_public as
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
  ) as accessibility_score
from public.bathrooms bathrooms
left join public.v_bathroom_code_summary code_summary
  on code_summary.bathroom_id = bathrooms.id
left join public.v_bathroom_cleanliness_summary cleanliness_summary
  on cleanliness_summary.bathroom_id = bathrooms.id
where bathrooms.moderation_status = 'active';

create or replace function public.upsert_bathroom_accessibility_features(
  p_bathroom_id uuid,
  p_accessibility_features jsonb
)
returns table (
  bathroom_id uuid,
  accessibility_features jsonb,
  is_accessible boolean,
  accessibility_score integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_features jsonb;
  v_next_features jsonb;
  v_is_accessible boolean;
  v_updated_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_accessibility_features is null or jsonb_typeof(p_accessibility_features) <> 'object' then
    raise exception 'INVALID_ACCESSIBILITY_PAYLOAD';
  end if;

  if jsonb_array_length(coalesce(p_accessibility_features -> 'photo_urls', '[]'::jsonb)) > 5 then
    raise exception 'TOO_MANY_ACCESSIBILITY_PHOTOS';
  end if;

  if length(coalesce(p_accessibility_features ->> 'notes', '')) > 500 then
    raise exception 'ACCESSIBILITY_NOTES_TOO_LONG';
  end if;

  select b.accessibility_features
  into v_existing_features
  from public.bathrooms b
  where b.id = p_bathroom_id
    and b.moderation_status = 'active';

  if v_existing_features is null then
    raise exception 'BATHROOM_NOT_FOUND';
  end if;

  v_next_features := jsonb_strip_nulls(
    '{
      "has_grab_bars": false,
      "door_width_inches": null,
      "is_automatic_door": false,
      "has_changing_table": false,
      "is_family_restroom": false,
      "is_gender_neutral": false,
      "has_audio_cue": false,
      "has_braille_signage": false,
      "has_wheelchair_ramp": false,
      "has_elevator_access": false,
      "stall_width_inches": null,
      "turning_radius_inches": null,
      "notes": null,
      "photo_urls": [],
      "verification_date": null
    }'::jsonb ||
    coalesce(v_existing_features, '{}'::jsonb) ||
    p_accessibility_features ||
    jsonb_build_object('verification_date', timezone('utc', now()))
  );

  v_is_accessible :=
    coalesce((v_next_features ->> 'has_grab_bars')::boolean, false)
    or coalesce((v_next_features ->> 'is_automatic_door')::boolean, false)
    or coalesce((v_next_features ->> 'has_wheelchair_ramp')::boolean, false)
    or coalesce((v_next_features ->> 'has_elevator_access')::boolean, false)
    or coalesce((v_next_features ->> 'is_family_restroom')::boolean, false)
    or coalesce((v_next_features ->> 'is_gender_neutral')::boolean, false)
    or coalesce((v_next_features ->> 'has_braille_signage')::boolean, false)
    or coalesce((v_next_features ->> 'has_audio_cue')::boolean, false)
    or coalesce((v_next_features ->> 'door_width_inches')::integer, 0) >= 32
    or coalesce((v_next_features ->> 'stall_width_inches')::integer, 0) >= 60
    or coalesce((v_next_features ->> 'turning_radius_inches')::integer, 0) >= 60;

  update public.bathrooms
  set accessibility_features = v_next_features,
      is_accessible = v_is_accessible,
      updated_at = timezone('utc', now())
  where id = p_bathroom_id
  returning bathrooms.updated_at into v_updated_at;

  return query
  select
    p_bathroom_id,
    v_next_features,
    v_is_accessible,
    public.calculate_accessibility_score(v_is_accessible, v_next_features),
    v_updated_at;
end;
$$;

revoke all on function public.upsert_bathroom_accessibility_features(uuid, jsonb) from public;
grant execute on function public.upsert_bathroom_accessibility_features(uuid, jsonb) to authenticated, service_role;
