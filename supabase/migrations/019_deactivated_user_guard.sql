-- ============================================================================
-- PeeDom deactivated-user guard
-- 019_deactivated_user_guard.sql
--
-- Adds a shared database-side helper that every user-facing mutation RPC
-- calls at its entry point to reject deactivated accounts consistently.
-- Re-creates all affected functions so the guard is atomic with each RPC.
--
-- Depends on: 017_profile_account_hardening.sql
--   (adds is_deactivated boolean not null default false to public.profiles)
--
-- NOT patched (intentional):
--   update_display_name    – already checks is_deactivated via profile fetch (017)
--   deactivate_account     – idempotent by design; blocking it prevents retry on
--                            partial client-side failure
--   clear_push_token       – clearing push tokens for a deactivated account is
--                            correct and necessary; blocking it is harmful
--   get_favorites_with_detail / get_favorite_ids – read-only stable functions
-- ============================================================================

-- ── Shared helper ─────────────────────────────────────────────────────────────
-- Returns the caller's user_id (auth.uid()) on success.
-- Raises P0001 with:
--   AUTH_REQUIRED       – no JWT present, or no matching profile row
--   ACCOUNT_DEACTIVATED – profile exists but is_deactivated = true
--
-- Marked SECURITY DEFINER so it can read public.profiles regardless of the
-- RLS policies on that table.  All callers are also SECURITY DEFINER so the
-- security boundary is unchanged.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.assert_active_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id     uuid    := auth.uid();
  v_deactivated boolean;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select is_deactivated
  into   v_deactivated
  from   public.profiles
  where  id = v_user_id;

  -- No profile row = the JWT is valid but the account was never fully created
  -- or was hard-deleted.  Treat the same as unauthenticated.
  if not found then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if v_deactivated then
    raise exception 'ACCOUNT_DEACTIVATED' using errcode = 'P0001';
  end if;

  return v_user_id;
end;
$$;

revoke all   on function public.assert_active_user() from public;
grant execute on function public.assert_active_user() to authenticated, service_role;


-- ============================================================================
-- 016 patch – toggle_favorite
-- ============================================================================
create or replace function public.toggle_favorite(
  p_bathroom_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id              uuid;
  v_existing_favorite_id uuid;
  v_action               text;
begin
  -- replaces the previous auth.uid() null-check
  v_user_id := public.assert_active_user();

  if not exists (
    select 1
    from public.bathrooms
    where id                = p_bathroom_id
      and moderation_status = 'active'
  ) then
    raise exception 'NOT_FOUND: Bathroom does not exist or is not active';
  end if;

  select favorites.id
  into   v_existing_favorite_id
  from   public.favorites favorites
  where  favorites.user_id    = v_user_id
    and  favorites.bathroom_id = p_bathroom_id
  limit 1;

  if v_existing_favorite_id is not null then
    delete from public.favorites
    where id = v_existing_favorite_id;

    v_action := 'removed';
  else
    insert into public.favorites (user_id, bathroom_id)
    values (v_user_id, p_bathroom_id);

    v_action := 'added';
  end if;

  return jsonb_build_object(
    'action',      v_action,
    'bathroom_id', p_bathroom_id,
    'user_id',     v_user_id,
    'toggled_at',  now()
  );
end;
$$;


-- ============================================================================
-- 018 patches – bathroom contribution RPCs
-- ============================================================================

create or replace function public.create_bathroom_submission(
  p_place_name       text,
  p_address_line1    text             default null,
  p_city             text             default null,
  p_state            text             default null,
  p_postal_code      text             default null,
  p_country_code     text             default 'US',
  p_latitude         double precision,
  p_longitude        double precision,
  p_is_locked        boolean          default false,
  p_is_accessible    boolean          default false,
  p_is_customer_only boolean          default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid;
  v_place_name   text;
  v_address_line1 text;
  v_city         text;
  v_state        text;
  v_postal_code  text;
  v_bathroom_id  uuid;
  v_geom         geography;
begin
  v_user_id := public.assert_active_user();

  v_place_name    := trim(coalesce(p_place_name, ''));
  v_address_line1 := nullif(trim(coalesce(p_address_line1, '')), '');
  v_city          := nullif(trim(coalesce(p_city, '')),          '');
  v_state         := nullif(trim(coalesce(p_state, '')),         '');
  v_postal_code   := nullif(trim(coalesce(p_postal_code, '')),   '');

  if char_length(v_place_name) < 2 or char_length(v_place_name) > 120 then
    raise exception 'INVALID_BATHROOM_NAME' using errcode = 'P0001';
  end if;

  if v_address_line1 is null and v_city is null and v_state is null then
    raise exception 'BATHROOM_LOCATION_DETAILS_REQUIRED' using errcode = 'P0001';
  end if;

  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'INVALID_BATHROOM_COORDINATES' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.bathrooms bathrooms
    where bathrooms.created_by = v_user_id
      and bathrooms.created_at >= now() - interval '24 hours'
  ) >= 5 then
    raise exception 'BATHROOM_SUBMISSION_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  v_geom := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

  if exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.moderation_status = 'active'
      and ST_DWithin(bathrooms.geom, v_geom, 50)
  ) then
    raise exception 'DUPLICATE_BATHROOM_NEARBY' using errcode = 'P0001';
  end if;

  insert into public.bathrooms (
    place_name, address_line1, city, state, postal_code, country_code,
    latitude, longitude, is_locked, is_accessible, is_customer_only,
    source_type, moderation_status, created_by
  )
  values (
    v_place_name, v_address_line1, v_city, v_state, v_postal_code,
    coalesce(nullif(trim(coalesce(p_country_code, '')), ''), 'US'),
    p_latitude, p_longitude,
    p_is_locked, p_is_accessible, p_is_customer_only,
    'community', 'active', v_user_id
  )
  returning id into v_bathroom_id;

  return jsonb_build_object(
    'bathroom_id', v_bathroom_id,
    'created_at',  timezone('utc', now())
  );
end;
$$;


create or replace function public.submit_bathroom_access_code(
  p_bathroom_id uuid,
  p_code_value  text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid;
  v_code_value text;
  v_code_id    uuid;
begin
  v_user_id := public.assert_active_user();

  v_code_value := trim(coalesce(p_code_value, ''));

  if char_length(v_code_value) < 2 or char_length(v_code_value) > 32 then
    raise exception 'INVALID_CODE_VALUE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id                = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bathroom_access_codes codes
    where codes.submitted_by = v_user_id
      and codes.bathroom_id  = p_bathroom_id
      and codes.created_at  >= now() - interval '7 days'
  ) then
    raise exception 'CODE_SUBMISSION_COOLDOWN' using errcode = 'P0001';
  end if;

  update public.bathroom_access_codes
  set    lifecycle_status = 'superseded',
         updated_at       = timezone('utc', now())
  where  submitted_by     = v_user_id
    and  bathroom_id      = p_bathroom_id
    and  lifecycle_status = 'active';

  insert into public.bathroom_access_codes (
    bathroom_id, submitted_by, code_value, last_verified_at
  )
  values (
    p_bathroom_id, v_user_id, v_code_value, timezone('utc', now())
  )
  returning id into v_code_id;

  return jsonb_build_object(
    'code_id',    v_code_id,
    'created_at', timezone('utc', now())
  );
end;
$$;


create or replace function public.vote_on_code(
  p_code_id uuid,
  p_vote    smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid;
  v_existing_vote smallint;
  v_action        text := 'no_change';
begin
  v_user_id := public.assert_active_user();

  if p_vote not in (-1, 0, 1) then
    raise exception 'INVALID_CODE_VOTE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathroom_access_codes codes
    where codes.id                = p_code_id
      and codes.visibility_status = 'visible'
      and codes.lifecycle_status  = 'active'
  ) then
    raise exception 'CODE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bathroom_access_codes codes
    where codes.id           = p_code_id
      and codes.submitted_by = v_user_id
  ) then
    raise exception 'SELF_CODE_VOTE' using errcode = 'P0001';
  end if;

  select code_votes.vote
  into   v_existing_vote
  from   public.code_votes
  where  code_votes.code_id  = p_code_id
    and  code_votes.user_id  = v_user_id;

  if p_vote = 0 then
    if v_existing_vote is not null then
      delete from public.code_votes
      where  code_id = p_code_id
        and  user_id = v_user_id;

      v_action := 'retracted';
    end if;
  elsif v_existing_vote is null then
    insert into public.code_votes (code_id, user_id, vote)
    values (p_code_id, v_user_id, p_vote);

    v_action := 'cast';
  elsif v_existing_vote = p_vote then
    delete from public.code_votes
    where  code_id = p_code_id
      and  user_id = v_user_id;

    v_action := 'retracted';
  else
    update public.code_votes
    set    vote       = p_vote,
           updated_at = timezone('utc', now())
    where  code_id = p_code_id
      and  user_id = v_user_id;

    v_action := 'changed';
  end if;

  return jsonb_build_object(
    'action',   v_action,
    'code_id',  p_code_id,
    'vote',     p_vote,
    'voted_at', timezone('utc', now())
  );
end;
$$;


create or replace function public.create_bathroom_report(
  p_bathroom_id uuid,
  p_report_type text,
  p_notes       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_notes     text;
  v_report_id uuid;
begin
  v_user_id := public.assert_active_user();

  if p_report_type not in (
    'wrong_code', 'closed', 'unsafe', 'duplicate',
    'incorrect_hours', 'no_restroom', 'other'
  ) then
    raise exception 'INVALID_REPORT_TYPE' using errcode = 'P0001';
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'INVALID_REPORT_NOTES' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id                = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bathroom_reports reports
    where reports.reported_by = v_user_id
      and reports.bathroom_id = p_bathroom_id
      and reports.report_type = p_report_type
      and reports.status in ('open', 'reviewing')
  ) then
    raise exception 'REPORT_ALREADY_OPEN' using errcode = 'P0001';
  end if;

  insert into public.bathroom_reports (bathroom_id, reported_by, report_type, notes)
  values (p_bathroom_id, v_user_id, p_report_type, v_notes)
  returning id into v_report_id;

  return jsonb_build_object(
    'report_id',  v_report_id,
    'created_at', timezone('utc', now())
  );
end;
$$;


create or replace function public.upsert_cleanliness_rating(
  p_bathroom_id uuid,
  p_rating      smallint,
  p_notes       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_notes   text;
begin
  v_user_id := public.assert_active_user();

  if p_rating < 1 or p_rating > 5 then
    raise exception 'INVALID_CLEANLINESS_RATING' using errcode = 'P0001';
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  if v_notes is not null and char_length(v_notes) > 300 then
    raise exception 'INVALID_CLEANLINESS_NOTES' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id                = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.cleanliness_ratings (bathroom_id, user_id, rating, notes)
  values (p_bathroom_id, v_user_id, p_rating, v_notes)
  on conflict (bathroom_id, user_id) do update set
    rating = excluded.rating,
    notes  = excluded.notes;

  return jsonb_build_object(
    'bathroom_id', p_bathroom_id,
    'rating',      p_rating,
    'rated_at',    timezone('utc', now())
  );
end;
$$;


-- ============================================================================
-- 013 patch – upsert_bathroom_accessibility_features
-- ============================================================================
create or replace function public.upsert_bathroom_accessibility_features(
  p_bathroom_id          uuid,
  p_accessibility_features jsonb
)
returns table (
  bathroom_id            uuid,
  accessibility_features jsonb,
  is_accessible          boolean,
  accessibility_score    integer,
  updated_at             timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_features jsonb;
  v_next_features     jsonb;
  v_is_accessible     boolean;
  v_updated_at        timestamptz;
begin
  -- auth.uid() null-check replaced by shared guard
  perform public.assert_active_user();

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
  into   v_existing_features
  from   public.bathrooms b
  where  b.id                = p_bathroom_id
    and  b.moderation_status = 'active';

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
    }'::jsonb
    || coalesce(v_existing_features, '{}'::jsonb)
    || p_accessibility_features
    || jsonb_build_object('verification_date', timezone('utc', now()))
  );

  v_is_accessible :=
    coalesce((v_next_features ->> 'has_grab_bars')::boolean,       false)
    or coalesce((v_next_features ->> 'is_automatic_door')::boolean, false)
    or coalesce((v_next_features ->> 'has_wheelchair_ramp')::boolean, false)
    or coalesce((v_next_features ->> 'has_elevator_access')::boolean, false)
    or coalesce((v_next_features ->> 'is_family_restroom')::boolean, false)
    or coalesce((v_next_features ->> 'is_gender_neutral')::boolean,  false)
    or coalesce((v_next_features ->> 'has_braille_signage')::boolean, false)
    or coalesce((v_next_features ->> 'has_audio_cue')::boolean,      false)
    or coalesce((v_next_features ->> 'door_width_inches')::integer,  0) >= 32
    or coalesce((v_next_features ->> 'stall_width_inches')::integer, 0) >= 60
    or coalesce((v_next_features ->> 'turning_radius_inches')::integer, 0) >= 60;

  update public.bathrooms
  set    accessibility_features = v_next_features,
         is_accessible          = v_is_accessible,
         updated_at             = timezone('utc', now())
  where  id = p_bathroom_id
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


-- ============================================================================
-- 008 patches – notification / status RPCs
--
-- These functions use the jsonb-return error convention established in 008,
-- so the deactivation check is added inline (consistent with their existing
-- error shape) rather than delegating to assert_active_user() which raises.
-- register_push_token raises, so it uses assert_active_user() directly.
-- ============================================================================

create or replace function public.register_push_token(
  p_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- raises AUTH_REQUIRED or ACCOUNT_DEACTIVATED
  perform public.assert_active_user();

  if p_token is null
    or length(trim(p_token)) = 0
    or (
      trim(p_token) not like 'ExpoPushToken[%'
      and trim(p_token) not like 'ExponentPushToken[%'
    ) then
    raise exception 'INVALID_PUSH_TOKEN';
  end if;

  update public.profiles
  set    push_token    = trim(p_token),
         push_enabled  = true,
         updated_at    = now()
  where  id = auth.uid();
end;
$$;


create or replace function public.update_notification_settings(
  p_push_enabled      boolean default null,
  p_notification_prefs jsonb  default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_keys    constant text[] := array[
    'code_verified', 'favorite_update', 'nearby_new', 'streak_reminder'
  ];
  v_profile           public.profiles%rowtype;
  invalid_pref_key    text;
  invalid_pref_value  text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into   v_profile
  from   public.profiles
  where  id = auth.uid();

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if v_profile.is_deactivated then
    return jsonb_build_object('success', false, 'error', 'account_deactivated');
  end if;

  if p_notification_prefs is not null then
    select key
    into   invalid_pref_key
    from   jsonb_object_keys(p_notification_prefs) as pref_key(key)
    where  key <> all (allowed_keys)
    limit 1;

    if invalid_pref_key is not null then
      return jsonb_build_object(
        'success', false,
        'error',   'invalid_notification_pref_key',
        'key',     invalid_pref_key
      );
    end if;

    select key
    into   invalid_pref_value
    from   jsonb_each(p_notification_prefs) as pref_entry(key, value)
    where  jsonb_typeof(value) <> 'boolean'
    limit 1;

    if invalid_pref_value is not null then
      return jsonb_build_object(
        'success', false,
        'error',   'invalid_notification_pref_value',
        'key',     invalid_pref_value
      );
    end if;
  end if;

  update public.profiles
  set    push_enabled       = coalesce(p_push_enabled, push_enabled),
         push_token         = case
                                when p_push_enabled = false then null
                                else push_token
                              end,
         notification_prefs = case
                                when p_notification_prefs is null then notification_prefs
                                else jsonb_strip_nulls(notification_prefs || p_notification_prefs)
                              end,
         updated_at         = now()
  where  id = auth.uid();

  return jsonb_build_object('success', true);
end;
$$;


create or replace function public.report_bathroom_status(
  p_bathroom_id uuid,
  p_status      text,
  p_note        text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text := trim(lower(coalesce(p_status, '')));
  v_profile         public.profiles%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select *
  into   v_profile
  from   public.profiles
  where  id = auth.uid();

  if not found then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if v_profile.is_deactivated then
    return jsonb_build_object('success', false, 'error', 'account_deactivated');
  end if;

  if normalized_status not in ('clean', 'dirty', 'closed', 'out_of_order', 'long_wait') then
    return jsonb_build_object('success', false, 'error', 'invalid_status');
  end if;

  if exists (
    select 1
    from public.bathroom_status_events status_events
    where status_events.bathroom_id  = p_bathroom_id
      and status_events.reported_by  = auth.uid()
      and status_events.created_at   > now() - interval '30 minutes'
  ) then
    return jsonb_build_object('success', false, 'error', 'rate_limited');
  end if;

  insert into public.bathroom_status_events (bathroom_id, reported_by, status, note)
  values (
    p_bathroom_id,
    auth.uid(),
    normalized_status::public.bathroom_live_status,
    nullif(trim(coalesce(p_note, '')), '')
  );

  return jsonb_build_object('success', true);
end;
$$;
