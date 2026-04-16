-- ============================================================================
-- Option A: Trust, anti-sybil, event signals, and prediction primitives
-- 043_option_a_trust_signals.sql
-- Extends the existing Supabase trust/business architecture without adding
-- parallel backend systems.
-- ============================================================================

do $$
begin
  create type public.access_type_enum as enum (
    'public',
    'code',
    'purchase_required',
    'key',
    'nfc_future'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.hardware_lock_vendors (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null unique,
  integration_status text not null default 'planned' check (
    integration_status in ('planned', 'testing', 'live')
  ),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.bathrooms
  add column if not exists access_type public.access_type_enum not null default 'public',
  add column if not exists hardware_ready boolean not null default false,
  add column if not exists partner_lock_vendor_id uuid references public.hardware_lock_vendors(id) on delete set null,
  add column if not exists dwell_time_avg_seconds integer,
  add column if not exists peak_usage_jsonb jsonb not null default '{}'::jsonb;

alter table public.bathrooms
  drop constraint if exists bathrooms_dwell_time_avg_seconds_check;

alter table public.bathrooms
  add constraint bathrooms_dwell_time_avg_seconds_check
  check (dwell_time_avg_seconds is null or dwell_time_avg_seconds >= 0);

alter table public.bathrooms
  drop constraint if exists bathrooms_peak_usage_jsonb_check;

alter table public.bathrooms
  add constraint bathrooms_peak_usage_jsonb_check
  check (jsonb_typeof(peak_usage_jsonb) = 'object');

create index if not exists idx_bathrooms_access_type
  on public.bathrooms (access_type);

create index if not exists idx_bathrooms_partner_lock_vendor_id
  on public.bathrooms (partner_lock_vendor_id)
  where partner_lock_vendor_id is not null;

update public.bathrooms bathrooms
set access_type = case
  when bathrooms.is_customer_only = true then 'purchase_required'::public.access_type_enum
  when exists (
    select 1
    from public.bathroom_access_codes codes
    where codes.bathroom_id = bathrooms.id
      and codes.lifecycle_status = 'active'
      and codes.visibility_status = 'visible'
  ) then 'code'::public.access_type_enum
  else bathrooms.access_type
end
where bathrooms.access_type = 'public';

alter table public.contributor_reputation_profiles
  add column if not exists shadow_banned boolean not null default false,
  add column if not exists fraud_flags jsonb not null default '[]'::jsonb,
  add column if not exists sybil_risk_score numeric(5, 2) not null default 0,
  add column if not exists last_sybil_check_at timestamptz,
  add column if not exists last_device_fingerprint_at timestamptz,
  add column if not exists device_account_count integer not null default 0;

alter table public.contributor_reputation_profiles
  drop constraint if exists contributor_reputation_profiles_fraud_flags_check;

alter table public.contributor_reputation_profiles
  add constraint contributor_reputation_profiles_fraud_flags_check
  check (jsonb_typeof(fraud_flags) = 'array');

alter table public.contributor_reputation_profiles
  drop constraint if exists contributor_reputation_profiles_sybil_risk_score_check;

alter table public.contributor_reputation_profiles
  add constraint contributor_reputation_profiles_sybil_risk_score_check
  check (sybil_risk_score >= 0 and sybil_risk_score <= 100);

alter table public.contributor_reputation_profiles
  drop constraint if exists contributor_reputation_profiles_device_account_count_check;

alter table public.contributor_reputation_profiles
  add constraint contributor_reputation_profiles_device_account_count_check
  check (device_account_count >= 0);

create table if not exists public.user_device_fingerprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  install_fingerprint text not null,
  fingerprint_version integer not null default 1,
  platform text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  brand text,
  model_name text,
  os_name text,
  os_version text,
  app_version text,
  locale text,
  timezone text,
  last_latitude double precision,
  last_longitude double precision,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  last_contribution_at timestamptz,
  unique (user_id, install_fingerprint)
);

create index if not exists idx_user_device_fingerprints_install
  on public.user_device_fingerprints (install_fingerprint, last_seen_at desc);

create index if not exists idx_user_device_fingerprints_user
  on public.user_device_fingerprints (user_id, last_seen_at desc);

alter table public.user_device_fingerprints enable row level security;

drop policy if exists "user_device_fingerprints_select_self" on public.user_device_fingerprints;
create policy "user_device_fingerprints_select_self"
  on public.user_device_fingerprints for select
  using (auth.uid() = user_id or public.is_admin_user(auth.uid()));

create table if not exists public.contribution_risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  install_fingerprint text,
  risk_type text not null check (
    risk_type in ('accounts_per_device', 'contribution_rate', 'geo_impossible')
  ),
  risk_score numeric(5, 2) not null default 0 check (risk_score >= 0 and risk_score <= 100),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_contribution_risk_events_user
  on public.contribution_risk_events (user_id, created_at desc);

create index if not exists idx_contribution_risk_events_install
  on public.contribution_risk_events (install_fingerprint, created_at desc)
  where install_fingerprint is not null;

alter table public.contribution_risk_events enable row level security;

drop policy if exists "contribution_risk_events_select_admin" on public.contribution_risk_events;
create policy "contribution_risk_events_select_admin"
  on public.contribution_risk_events for select
  using (public.is_admin_user(auth.uid()));

create table if not exists public.client_events (
  id uuid primary key default gen_random_uuid(),
  client_event_id text not null unique,
  anonymous_id text not null,
  session_id text not null,
  event_name text not null check (
    event_name in (
      'bathroom_viewed',
      'bathroom_searched',
      'code_viewed',
      'code_confirmed',
      'code_denied',
      'code_submitted',
      'prediction_shown',
      'prediction_correct',
      'review_submitted',
      'report_submitted',
      'app_opened',
      'app_backgrounded',
      'urgency_session'
    )
  ),
  user_id uuid references public.profiles(id) on delete set null,
  bathroom_id uuid references public.bathrooms(id) on delete set null,
  screen_name text,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_client_events_event_name
  on public.client_events (event_name, occurred_at desc);

create index if not exists idx_client_events_bathroom
  on public.client_events (bathroom_id, occurred_at desc)
  where bathroom_id is not null;

create index if not exists idx_client_events_user
  on public.client_events (user_id, occurred_at desc)
  where user_id is not null;

alter table public.client_events enable row level security;

drop policy if exists "client_events_select_admin" on public.client_events;
create policy "client_events_select_admin"
  on public.client_events for select
  using (public.is_admin_user(auth.uid()));

create or replace function public.get_user_trust_tier(
  p_user_id uuid default null
)
returns table (
  user_id uuid,
  contributor_trust_tier text,
  normalized_tier text,
  trust_score numeric,
  trust_weight numeric,
  shadow_banned boolean,
  fraud_flags jsonb,
  device_account_count integer,
  last_calculated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := auth.uid();
  v_target_user_id uuid := coalesce(p_user_id, v_requester);
begin
  if v_target_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if v_requester is not null
    and v_target_user_id <> v_requester
    and not public.is_admin_user(v_requester) then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.contributor_reputation_profiles reputation
    where reputation.user_id = v_target_user_id
  ) then
    perform public.refresh_contributor_reputation(v_target_user_id);
  end if;

  return query
  select
    reputation.user_id,
    reputation.trust_tier,
    case
      when reputation.trust_tier in ('business_verified_manager', 'highly_reliable_local') then 'power'
      when reputation.trust_tier in ('verified_contributor', 'lightly_trusted') then 'normal'
      else 'newcomer'
    end as normalized_tier,
    reputation.trust_score,
    reputation.trust_weight,
    reputation.shadow_banned,
    reputation.fraud_flags,
    reputation.device_account_count,
    reputation.last_calculated_at
  from public.contributor_reputation_profiles reputation
  where reputation.user_id = v_target_user_id;
end;
$$;

revoke all on function public.get_user_trust_tier(uuid) from public;
grant execute on function public.get_user_trust_tier(uuid) to authenticated, service_role;

create or replace function public.register_device_fingerprint(
  p_install_fingerprint text,
  p_device_metadata jsonb default '{}'::jsonb,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.assert_active_user();
  v_install_fingerprint text := trim(coalesce(p_install_fingerprint, ''));
  v_platform text := lower(coalesce(p_device_metadata ->> 'platform', 'unknown'));
  v_brand text := nullif(trim(coalesce(p_device_metadata ->> 'brand', '')), '');
  v_model_name text := nullif(trim(coalesce(p_device_metadata ->> 'model_name', '')), '');
  v_os_name text := nullif(trim(coalesce(p_device_metadata ->> 'os_name', '')), '');
  v_os_version text := nullif(trim(coalesce(p_device_metadata ->> 'os_version', '')), '');
  v_app_version text := nullif(trim(coalesce(p_device_metadata ->> 'app_version', '')), '');
  v_locale text := nullif(trim(coalesce(p_device_metadata ->> 'locale', '')), '');
  v_timezone text := nullif(trim(coalesce(p_device_metadata ->> 'timezone', '')), '');
  v_device_account_count integer := 0;
  v_recent_contribution_count integer := 0;
  v_detected_speed_kmh numeric(10, 2);
  v_shadow_mode boolean := false;
  v_sybil_risk_score numeric(5, 2) := 0;
  v_reason text := 'ok';
  v_flag_texts text[] := array[]::text[];
  v_previous_fingerprint record;
begin
  if v_install_fingerprint = '' then
    raise exception 'INVALID_DEVICE_FINGERPRINT' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.contributor_reputation_profiles reputation
    where reputation.user_id = v_user_id
  ) then
    perform public.refresh_contributor_reputation(v_user_id);
  end if;

  if jsonb_typeof(coalesce(p_device_metadata, '{}'::jsonb)) <> 'object' then
    raise exception 'INVALID_DEVICE_METADATA' using errcode = 'P0001';
  end if;

  if v_platform not in ('ios', 'android', 'web', 'unknown') then
    v_platform := 'unknown';
  end if;

  select
    fingerprints.last_latitude,
    fingerprints.last_longitude,
    fingerprints.last_seen_at
  into v_previous_fingerprint
  from public.user_device_fingerprints fingerprints
  where fingerprints.user_id = v_user_id
    and fingerprints.install_fingerprint = v_install_fingerprint
  order by fingerprints.last_seen_at desc
  limit 1;

  insert into public.user_device_fingerprints (
    user_id,
    install_fingerprint,
    platform,
    brand,
    model_name,
    os_name,
    os_version,
    app_version,
    locale,
    timezone,
    last_latitude,
    last_longitude,
    metadata,
    last_seen_at
  )
  values (
    v_user_id,
    v_install_fingerprint,
    v_platform,
    v_brand,
    v_model_name,
    v_os_name,
    v_os_version,
    v_app_version,
    v_locale,
    v_timezone,
    p_latitude,
    p_longitude,
    coalesce(p_device_metadata, '{}'::jsonb),
    timezone('utc', now())
  )
  on conflict (user_id, install_fingerprint)
  do update
  set
    platform = excluded.platform,
    brand = excluded.brand,
    model_name = excluded.model_name,
    os_name = excluded.os_name,
    os_version = excluded.os_version,
    app_version = excluded.app_version,
    locale = excluded.locale,
    timezone = excluded.timezone,
    last_latitude = coalesce(excluded.last_latitude, public.user_device_fingerprints.last_latitude),
    last_longitude = coalesce(excluded.last_longitude, public.user_device_fingerprints.last_longitude),
    metadata = excluded.metadata,
    last_seen_at = timezone('utc', now());

  select count(distinct fingerprints.user_id)
  into v_device_account_count
  from public.user_device_fingerprints fingerprints
  where fingerprints.install_fingerprint = v_install_fingerprint;

  select
    coalesce((
      select count(*)
      from public.bathroom_access_codes codes
      where codes.submitted_by = v_user_id
        and codes.created_at >= now() - interval '10 minutes'
    ), 0)
    + coalesce((
      select count(*)
      from public.code_votes votes
      where votes.user_id = v_user_id
        and votes.created_at >= now() - interval '10 minutes'
    ), 0)
    + coalesce((
      select count(*)
      from public.bathroom_reports reports
      where reports.reported_by = v_user_id
        and reports.created_at >= now() - interval '10 minutes'
    ), 0)
    + coalesce((
      select count(*)
      from public.bathroom_photos photos
      where photos.uploaded_by = v_user_id
        and photos.created_at >= now() - interval '10 minutes'
    ), 0)
    + coalesce((
      select count(*)
      from public.bathrooms bathrooms
      where bathrooms.created_by = v_user_id
        and bathrooms.created_at >= now() - interval '10 minutes'
    ), 0)
  into v_recent_contribution_count;

  if p_latitude is not null
    and p_longitude is not null
    and v_previous_fingerprint.last_latitude is not null
    and v_previous_fingerprint.last_longitude is not null
    and v_previous_fingerprint.last_seen_at is not null
    and v_previous_fingerprint.last_seen_at < timezone('utc', now()) then
    select
      round((
        st_distance(
          st_setsrid(st_makepoint(v_previous_fingerprint.last_longitude, v_previous_fingerprint.last_latitude), 4326)::geography,
          st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
        ) / 1000.0
      ) / greatest(extract(epoch from (timezone('utc', now()) - v_previous_fingerprint.last_seen_at)) / 3600.0, 0.0167), 2)
    into v_detected_speed_kmh;
  end if;

  if v_device_account_count > 2 then
    v_flag_texts := array_append(v_flag_texts, 'accounts_per_device');
    v_sybil_risk_score := v_sybil_risk_score + least((v_device_account_count - 2) * 25, 50);
  end if;

  if v_recent_contribution_count > 5 then
    v_flag_texts := array_append(v_flag_texts, 'contribution_rate');
    v_sybil_risk_score := v_sybil_risk_score + least((v_recent_contribution_count - 5) * 10, 30);
  end if;

  if v_detected_speed_kmh is not null and v_detected_speed_kmh > 200 then
    v_flag_texts := array_append(v_flag_texts, 'geo_impossible');
    v_sybil_risk_score := v_sybil_risk_score + 25;
  end if;

  v_sybil_risk_score := least(100, v_sybil_risk_score);
  v_shadow_mode := v_sybil_risk_score >= 75 or array_length(v_flag_texts, 1) >= 2;

  if array_length(v_flag_texts, 1) is not null then
    insert into public.contribution_risk_events (
      user_id,
      install_fingerprint,
      risk_type,
      risk_score,
      details
    )
    select
      v_user_id,
      v_install_fingerprint,
      risk_type.risk_type,
      v_sybil_risk_score,
      jsonb_build_object(
        'device_account_count', v_device_account_count,
        'recent_contribution_count', v_recent_contribution_count,
        'detected_speed_kmh', v_detected_speed_kmh
      )
    from unnest(v_flag_texts) as risk_type(risk_type);
  end if;

  update public.contributor_reputation_profiles reputation
  set
    shadow_banned = v_shadow_mode,
    fraud_flags = to_jsonb(coalesce(v_flag_texts, array[]::text[])),
    sybil_risk_score = v_sybil_risk_score,
    last_sybil_check_at = timezone('utc', now()),
    last_device_fingerprint_at = timezone('utc', now()),
    device_account_count = v_device_account_count
  where reputation.user_id = v_user_id;

  if v_shadow_mode then
    v_reason := 'shadow_mode_enabled';
  elsif array_length(v_flag_texts, 1) is not null then
    v_reason := 'risk_flagged';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'shadow_mode', v_shadow_mode,
    'reason', v_reason,
    'device_account_count', v_device_account_count,
    'recent_contribution_count', v_recent_contribution_count,
    'detected_speed_kmh', v_detected_speed_kmh,
    'fraud_flags', to_jsonb(coalesce(v_flag_texts, array[]::text[])),
    'checked_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.register_device_fingerprint(text, jsonb, double precision, double precision) from public;
grant execute on function public.register_device_fingerprint(text, jsonb, double precision, double precision) to authenticated, service_role;

create or replace function public.track_event_batch(
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_inserted integer := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'INVALID_EVENT_BATCH' using errcode = 'P0001';
  end if;

  v_total := jsonb_array_length(p_events);

  if v_total = 0 then
    return jsonb_build_object(
      'accepted_count', 0,
      'deduplicated_count', 0,
      'processed_at', timezone('utc', now())
    );
  end if;

  if v_total > 25 then
    raise exception 'EVENT_BATCH_TOO_LARGE' using errcode = 'P0001';
  end if;

  insert into public.client_events (
    client_event_id,
    anonymous_id,
    session_id,
    event_name,
    user_id,
    bathroom_id,
    screen_name,
    occurred_at,
    payload
  )
  select
    coalesce(nullif(event_item ->> 'client_event_id', ''), gen_random_uuid()::text),
    nullif(event_item ->> 'anonymous_id', ''),
    nullif(event_item ->> 'session_id', ''),
    nullif(event_item ->> 'name', ''),
    auth.uid(),
    case
      when coalesce(nullif(event_item ->> 'bathroom_id', ''), '') <> '' then (event_item ->> 'bathroom_id')::uuid
      else null
    end,
    nullif(event_item ->> 'screen_name', ''),
    coalesce((event_item ->> 'occurred_at')::timestamptz, timezone('utc', now())),
    case
      when jsonb_typeof(coalesce(event_item -> 'properties', '{}'::jsonb)) = 'object'
        then coalesce(event_item -> 'properties', '{}'::jsonb)
      else '{}'::jsonb
    end
  from jsonb_array_elements(p_events) as event_item
  where nullif(event_item ->> 'anonymous_id', '') is not null
    and nullif(event_item ->> 'session_id', '') is not null
    and nullif(event_item ->> 'name', '') is not null
  on conflict (client_event_id) do nothing;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'accepted_count', v_inserted,
    'deduplicated_count', greatest(v_total - v_inserted, 0),
    'processed_at', timezone('utc', now())
  );
end;
$$;

revoke all on function public.track_event_batch(jsonb) from public;
grant execute on function public.track_event_batch(jsonb) to anon, authenticated, service_role;

create or replace function public.calculate_prediction_confidence(
  p_bathroom_id uuid,
  p_reference_hour integer default null
)
returns table (
  bathroom_id uuid,
  predicted_access_confidence numeric,
  prediction_confidence numeric,
  busy_level text,
  best_visit_hour integer,
  signal_count integer,
  recommended_copy text,
  generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access_type public.access_type_enum := 'public';
  v_is_locked boolean := false;
  v_is_customer_only boolean := false;
  v_hardware_ready boolean := false;
  v_peak_usage jsonb := '{}'::jsonb;
  v_dwell_time_avg_seconds integer;
  v_code_confidence numeric;
  v_last_verified_at timestamptz;
  v_owner_supplied_code text;
  v_reference_hour integer := coalesce(p_reference_hour, extract(hour from timezone('utc', now()))::integer);
  v_current_usage numeric;
  v_average_usage numeric;
  v_best_visit_hour integer;
  v_predicted_access_confidence numeric := 70;
  v_prediction_confidence numeric := 35;
  v_busy_level text := 'unknown';
  v_signal_count integer := 0;
  v_recommended_copy text := 'Community signal is still building for this bathroom.';
  v_age_hours numeric;
begin
  select
    bathrooms.access_type,
    coalesce(bathrooms.is_locked, false),
    bathrooms.is_customer_only,
    bathrooms.hardware_ready,
    bathrooms.peak_usage_jsonb,
    bathrooms.dwell_time_avg_seconds,
    code_summary.confidence_score,
    code_summary.last_verified_at,
    settings.owner_supplied_code
  into
    v_access_type,
    v_is_locked,
    v_is_customer_only,
    v_hardware_ready,
    v_peak_usage,
    v_dwell_time_avg_seconds,
    v_code_confidence,
    v_last_verified_at,
    v_owner_supplied_code
  from public.bathrooms bathrooms
  left join public.v_bathroom_code_summary code_summary
    on code_summary.bathroom_id = bathrooms.id
  left join public.business_bathroom_settings settings
    on settings.bathroom_id = bathrooms.id
  where bathrooms.id = p_bathroom_id;

  if not found then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  case v_access_type
    when 'public' then
      v_predicted_access_confidence := 96;
      v_recommended_copy := 'This bathroom is usually accessible without extra steps.';
    when 'code' then
      v_predicted_access_confidence := coalesce(v_code_confidence, 45);
      v_recommended_copy := 'Community code signal is driving the current access prediction.';
    when 'purchase_required' then
      v_predicted_access_confidence := case when v_is_customer_only then 58 else 72 end;
      v_recommended_copy := 'Access may depend on buying something or being an active customer.';
    when 'key' then
      v_predicted_access_confidence := 64;
      v_recommended_copy := 'Expect a staff handoff or key request before entry.';
    when 'nfc_future' then
      v_predicted_access_confidence := case when v_hardware_ready then 74 else 52 end;
      v_recommended_copy := 'Hardware-backed access is planned here, but live support is still limited.';
  end case;

  if v_code_confidence is not null then
    v_signal_count := v_signal_count + 1;
  end if;

  if v_owner_supplied_code is not null then
    v_signal_count := v_signal_count + 1;
    v_predicted_access_confidence := greatest(v_predicted_access_confidence, 80);
  end if;

  if v_last_verified_at is not null then
    v_signal_count := v_signal_count + 1;
    v_age_hours := extract(epoch from (timezone('utc', now()) - v_last_verified_at)) / 3600.0;

    if v_age_hours <= 24 then
      v_predicted_access_confidence := least(100, v_predicted_access_confidence + 4);
    elsif v_age_hours > 72 then
      v_predicted_access_confidence := greatest(20, v_predicted_access_confidence - least(floor(v_age_hours / 24.0) * 2, 24));
    end if;
  end if;

  if jsonb_typeof(v_peak_usage) = 'object' and jsonb_object_length(v_peak_usage) > 0 then
    v_signal_count := v_signal_count + 1;

    select nullif(v_peak_usage ->> v_reference_hour::text, '')::numeric
    into v_current_usage;

    select avg((usage_values.value)::numeric)
    into v_average_usage
    from jsonb_each_text(v_peak_usage) as usage_values(key, value)
    where usage_values.value ~ '^-?[0-9]+(\.[0-9]+)?$';

    select usage_values.key::integer
    into v_best_visit_hour
    from jsonb_each_text(v_peak_usage) as usage_values(key, value)
    where usage_values.value ~ '^-?[0-9]+(\.[0-9]+)?$'
    order by (usage_values.value)::numeric asc, usage_values.key::integer asc
    limit 1;

    if v_current_usage is not null and v_average_usage is not null then
      if v_current_usage <= greatest(v_average_usage * 0.75, 1) then
        v_busy_level := 'quiet';
      elsif v_current_usage >= greatest(v_average_usage * 1.25, 2) then
        v_busy_level := 'busy';
      else
        v_busy_level := 'moderate';
      end if;
    end if;
  end if;

  if v_dwell_time_avg_seconds is not null then
    v_signal_count := v_signal_count + 1;
  end if;

  if v_is_locked then
    v_predicted_access_confidence := least(v_predicted_access_confidence, 78);
  end if;

  v_prediction_confidence := least(96, 35 + (v_signal_count * 15));
  v_predicted_access_confidence := greatest(0, least(100, v_predicted_access_confidence));

  if v_busy_level = 'busy' then
    v_recommended_copy := 'Expect extra friction right now. If this is urgent, keep a fallback in mind.';
  elsif v_busy_level = 'quiet' and v_best_visit_hour is not null then
    v_recommended_copy := format('Traffic looks lighter than usual. %s:00 is the best current estimate.', lpad(v_best_visit_hour::text, 2, '0'));
  elsif v_predicted_access_confidence >= 85 then
    v_recommended_copy := 'Signals are strong enough that this is a solid stop.';
  elsif v_predicted_access_confidence < 60 then
    v_recommended_copy := 'Treat this as a lower-confidence stop until the community re-verifies it.';
  end if;

  return query
  select
    p_bathroom_id,
    v_predicted_access_confidence,
    v_prediction_confidence,
    v_busy_level,
    v_best_visit_hour,
    v_signal_count,
    v_recommended_copy,
    timezone('utc', now());
end;
$$;

revoke all on function public.calculate_prediction_confidence(uuid, integer) from public;
grant execute on function public.calculate_prediction_confidence(uuid, integer) to anon, authenticated, service_role;
