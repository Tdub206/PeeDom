-- ============================================================================
-- StallPass Premium Tier
-- 011_premium_tier.sql
-- Adds premium city packs, arrival alerts, and premium-only filter metadata.
-- ============================================================================

alter table public.profiles
  alter column notification_prefs
  set default '{
    "code_verified": true,
    "favorite_update": true,
    "nearby_new": false,
    "streak_reminder": true,
    "arrival_alert": true
  }'::jsonb;

update public.profiles
set notification_prefs = jsonb_strip_nulls(
  '{
    "code_verified": true,
    "favorite_update": true,
    "nearby_new": false,
    "streak_reminder": true,
    "arrival_alert": true
  }'::jsonb || coalesce(notification_prefs, '{}'::jsonb)
)
where notification_prefs is null
   or coalesce((notification_prefs ->> 'arrival_alert')::boolean, null) is null;

alter table public.bathrooms
  add column if not exists accessibility_features jsonb not null default '{
    "has_grab_bars": false,
    "door_width_inches": null,
    "is_automatic_door": false,
    "has_changing_table": false,
    "is_family_restroom": false,
    "is_gender_neutral": false,
    "has_audio_cue": false
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
    "has_audio_cue": false
  }'::jsonb || coalesce(accessibility_features, '{}'::jsonb)
)
where accessibility_features is null
   or jsonb_typeof(accessibility_features) <> 'object';

alter table public.bathrooms
  drop constraint if exists bathrooms_accessibility_features_object_check;

alter table public.bathrooms
  add constraint bathrooms_accessibility_features_object_check
  check (jsonb_typeof(accessibility_features) = 'object');

create index if not exists idx_bathrooms_accessibility_changing_table
  on public.bathrooms (((coalesce(accessibility_features ->> 'has_changing_table', 'false'))::boolean));

create index if not exists idx_bathrooms_accessibility_family
  on public.bathrooms (((coalesce(accessibility_features ->> 'is_family_restroom', 'false'))::boolean));

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
  bathrooms.accessibility_features
from public.bathrooms bathrooms
left join public.v_bathroom_code_summary code_summary
  on code_summary.bathroom_id = bathrooms.id
left join public.v_bathroom_cleanliness_summary cleanliness_summary
  on cleanliness_summary.bathroom_id = bathrooms.id
where bathrooms.moderation_status = 'active';

drop function if exists public.get_bathrooms_near(double precision, double precision, integer);

create or replace function public.get_bathrooms_near(
  lat double precision,
  lng double precision,
  radius_m integer default 1000
)
returns table (
  id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean,
  accessibility_features jsonb,
  hours_json jsonb,
  code_id uuid,
  confidence_score integer,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  distance_meters double precision
)
language sql
stable
as $$
  select
    details.id,
    details.place_name,
    details.address_line1,
    details.city,
    details.state,
    details.postal_code,
    details.country_code,
    details.latitude,
    details.longitude,
    details.is_locked,
    details.is_accessible,
    details.is_customer_only,
    details.accessibility_features,
    details.hours_json,
    details.code_id,
    details.confidence_score,
    details.up_votes,
    details.down_votes,
    details.last_verified_at,
    details.expires_at,
    details.cleanliness_avg,
    details.updated_at,
    st_distancesphere(
      st_makepoint(details.longitude, details.latitude),
      st_makepoint(lng, lat)
    ) as distance_meters
  from public.v_bathroom_detail_public details
  where st_dwithin(
    geography(st_setsrid(st_makepoint(details.longitude, details.latitude), 4326)),
    geography(st_setsrid(st_makepoint(lng, lat), 4326)),
    radius_m
  )
  order by distance_meters asc, details.updated_at desc;
$$;

drop function if exists public.search_bathrooms(text, double precision, double precision, integer);

create or replace function public.search_bathrooms(
  p_query text,
  p_user_lat double precision default null,
  p_user_lng double precision default null,
  p_limit integer default 40
)
returns table (
  id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean,
  accessibility_features jsonb,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  distance_meters double precision,
  rank real
)
language sql
stable
security invoker
set search_path = public
as $$
  with normalized_terms as (
    select array_agg(term) filter (where char_length(term) > 0) as terms
    from regexp_split_to_table(
      lower(regexp_replace(trim(coalesce(p_query, '')), '[^[:alnum:]\s]+', ' ', 'g')),
      '\s+'
    ) as term
  ),
  parsed_query as (
    select
      case
        when coalesce(array_length(terms, 1), 0) = 0 then null
        else to_tsquery(
          'english',
          array_to_string(
            array(select term || ':*' from unnest(terms) as term),
            ' & '
          )
        )
      end as q
    from normalized_terms
  ),
  ranked_matches as (
    select
      d.id,
      d.place_name,
      d.address_line1,
      d.city,
      d.state,
      d.postal_code,
      d.country_code,
      d.latitude,
      d.longitude,
      d.is_locked,
      d.is_accessible,
      d.is_customer_only,
      d.accessibility_features,
      d.hours_json,
      d.code_id,
      d.confidence_score,
      d.up_votes,
      d.down_votes,
      d.last_verified_at,
      d.expires_at,
      d.cleanliness_avg,
      d.updated_at,
      case
        when p_user_lat is not null and p_user_lng is not null then
          st_distance(
            b.geom,
            st_setsrid(st_makepoint(p_user_lng, p_user_lat), 4326)::geography
          )
        else null
      end as distance_meters,
      ts_rank(b.search_vector, pq.q) as text_rank
    from public.bathrooms b
    join public.v_bathroom_detail_public d
      on d.id = b.id
    cross join parsed_query pq
    where b.moderation_status = 'active'
      and pq.q is not null
      and b.search_vector @@ pq.q
  )
  select
    m.id,
    m.place_name,
    m.address_line1,
    m.city,
    m.state,
    m.postal_code,
    m.country_code,
    m.latitude,
    m.longitude,
    m.is_locked,
    m.is_accessible,
    m.is_customer_only,
    m.accessibility_features,
    m.hours_json,
    m.code_id,
    m.confidence_score,
    m.up_votes,
    m.down_votes,
    m.last_verified_at,
    m.expires_at,
    m.cleanliness_avg,
    m.updated_at,
    m.distance_meters,
    case
      when m.distance_meters is not null then
        (m.text_rank / ln(m.distance_meters / 100.0 + 2.0))::real
      else m.text_rank::real
    end as rank
  from ranked_matches m
  order by rank desc, m.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 50));
$$;

create or replace view public.v_premium_city_packs as
select
  trim(both '-' from regexp_replace(lower(
    concat_ws('-', bathrooms.city, bathrooms.state, bathrooms.country_code)
  ), '[^a-z0-9]+', '-', 'g')) as slug,
  bathrooms.city,
  bathrooms.state,
  bathrooms.country_code,
  count(*)::integer as bathroom_count,
  avg(bathrooms.latitude)::double precision as center_latitude,
  avg(bathrooms.longitude)::double precision as center_longitude,
  min(bathrooms.latitude)::double precision as min_latitude,
  max(bathrooms.latitude)::double precision as max_latitude,
  min(bathrooms.longitude)::double precision as min_longitude,
  max(bathrooms.longitude)::double precision as max_longitude,
  max(bathrooms.updated_at) as latest_bathroom_update_at,
  max(code_summary.last_verified_at) as latest_code_verified_at
from public.bathrooms bathrooms
left join public.v_bathroom_code_summary code_summary
  on code_summary.bathroom_id = bathrooms.id
where bathrooms.moderation_status = 'active'
  and bathrooms.city is not null
  and bathrooms.state is not null
group by bathrooms.city, bathrooms.state, bathrooms.country_code;

create or replace function public.get_premium_city_packs(
  p_limit integer default 20
)
returns table (
  slug text,
  city text,
  state text,
  country_code text,
  bathroom_count integer,
  center_latitude double precision,
  center_longitude double precision,
  min_latitude double precision,
  max_latitude double precision,
  min_longitude double precision,
  max_longitude double precision,
  latest_bathroom_update_at timestamptz,
  latest_code_verified_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    packs.slug,
    packs.city,
    packs.state,
    packs.country_code,
    packs.bathroom_count,
    packs.center_latitude,
    packs.center_longitude,
    packs.min_latitude,
    packs.max_latitude,
    packs.min_longitude,
    packs.max_longitude,
    packs.latest_bathroom_update_at,
    packs.latest_code_verified_at
  from public.v_premium_city_packs packs
  order by packs.bathroom_count desc, packs.city asc, packs.state asc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

create or replace function public.get_premium_city_pack_bathrooms(
  p_city text,
  p_state text,
  p_country_code text default null
)
returns table (
  id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean,
  accessibility_features jsonb,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    detail.id,
    detail.place_name,
    detail.address_line1,
    detail.city,
    detail.state,
    detail.postal_code,
    detail.country_code,
    detail.latitude,
    detail.longitude,
    detail.is_locked,
    detail.is_accessible,
    detail.is_customer_only,
    detail.accessibility_features,
    detail.hours_json,
    detail.code_id,
    detail.confidence_score,
    detail.up_votes,
    detail.down_votes,
    detail.last_verified_at,
    detail.expires_at,
    detail.cleanliness_avg,
    detail.updated_at
  from public.v_bathroom_detail_public detail
  where lower(coalesce(detail.city, '')) = lower(trim(coalesce(p_city, '')))
    and lower(coalesce(detail.state, '')) = lower(trim(coalesce(p_state, '')))
    and (
      p_country_code is null
      or lower(detail.country_code) = lower(trim(p_country_code))
    )
  order by detail.updated_at desc, detail.place_name asc;
$$;

create table if not exists public.premium_arrival_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  target_arrival_at timestamptz not null,
  lead_minutes integer not null default 30,
  status text not null default 'active' check (status in ('active', 'cancelled', 'expired')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, bathroom_id)
);

create index if not exists idx_premium_arrival_alerts_user
  on public.premium_arrival_alerts(user_id, target_arrival_at desc);

create index if not exists idx_premium_arrival_alerts_bathroom
  on public.premium_arrival_alerts(bathroom_id, target_arrival_at desc);

alter table public.premium_arrival_alerts enable row level security;

drop policy if exists "premium_arrival_alerts_select_own" on public.premium_arrival_alerts;
create policy "premium_arrival_alerts_select_own"
on public.premium_arrival_alerts for select
using (auth.uid() = user_id);

create or replace function public.upsert_premium_arrival_alert(
  p_bathroom_id uuid,
  p_target_arrival_at timestamptz,
  p_lead_minutes integer default 30
)
returns setof public.premium_arrival_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_target timestamptz := timezone('utc', p_target_arrival_at);
  current_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_lead_minutes not in (15, 30, 60) then
    raise exception 'INVALID_LEAD_TIME';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if not public.profile_has_active_premium(current_profile.is_premium, current_profile.premium_expires_at) then
    raise exception 'PREMIUM_REQUIRED';
  end if;

  if normalized_target <= timezone('utc', now()) + interval '5 minutes'
     or normalized_target > timezone('utc', now()) + interval '12 hours' then
    raise exception 'INVALID_ARRIVAL_WINDOW';
  end if;

  insert into public.premium_arrival_alerts (
    user_id,
    bathroom_id,
    target_arrival_at,
    lead_minutes,
    status
  )
  values (
    auth.uid(),
    p_bathroom_id,
    normalized_target,
    p_lead_minutes,
    'active'
  )
  on conflict (user_id, bathroom_id)
  do update
    set target_arrival_at = excluded.target_arrival_at,
        lead_minutes = excluded.lead_minutes,
        status = 'active',
        updated_at = timezone('utc', now());

  return query
  select alerts.*
  from public.premium_arrival_alerts alerts
  where alerts.user_id = auth.uid()
    and alerts.bathroom_id = p_bathroom_id;
end;
$$;

create or replace function public.cancel_premium_arrival_alert(
  p_bathroom_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.premium_arrival_alerts
  set status = 'cancelled',
      updated_at = timezone('utc', now())
  where user_id = auth.uid()
    and bathroom_id = p_bathroom_id;
$$;

create or replace function public.get_arrival_alert_recipients(
  p_bathroom_id uuid
)
returns table (
  user_id uuid,
  push_token text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id as user_id,
    profiles.push_token
  from public.premium_arrival_alerts alerts
  join public.profiles profiles
    on profiles.id = alerts.user_id
  where alerts.bathroom_id = p_bathroom_id
    and alerts.status = 'active'
    and alerts.target_arrival_at > timezone('utc', now())
    and timezone('utc', now()) >= alerts.target_arrival_at - make_interval(mins => alerts.lead_minutes)
    and profiles.push_enabled = true
    and profiles.push_token is not null
    and coalesce((profiles.notification_prefs ->> 'arrival_alert')::boolean, true) = true;
$$;

create or replace function public.update_notification_settings(
  p_push_enabled boolean default null,
  p_notification_prefs jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_keys constant text[] := array[
    'code_verified',
    'favorite_update',
    'nearby_new',
    'streak_reminder',
    'arrival_alert'
  ];
  invalid_pref_key text;
  invalid_pref_value text;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated'
    );
  end if;

  if p_notification_prefs is not null then
    select key
    into invalid_pref_key
    from jsonb_object_keys(p_notification_prefs) as pref_key(key)
    where key <> all (allowed_keys)
    limit 1;

    if invalid_pref_key is not null then
      return jsonb_build_object(
        'success', false,
        'error', 'invalid_notification_pref_key',
        'key', invalid_pref_key
      );
    end if;

    select key
    into invalid_pref_value
    from jsonb_each(p_notification_prefs) as pref_entry(key, value)
    where jsonb_typeof(value) <> 'boolean'
    limit 1;

    if invalid_pref_value is not null then
      return jsonb_build_object(
        'success', false,
        'error', 'invalid_notification_pref_value',
        'key', invalid_pref_value
      );
    end if;
  end if;

  update public.profiles
  set push_enabled = coalesce(p_push_enabled, push_enabled),
      push_token = case
        when p_push_enabled = false then null
        else push_token
      end,
      notification_prefs = case
        when p_notification_prefs is null then notification_prefs
        else jsonb_strip_nulls(notification_prefs || p_notification_prefs)
      end,
      updated_at = timezone('utc', now())
  where id = auth.uid();

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.get_premium_city_packs(integer) from public;
grant execute on function public.get_premium_city_packs(integer) to authenticated, service_role;

revoke all on function public.get_premium_city_pack_bathrooms(text, text, text) from public;
grant execute on function public.get_premium_city_pack_bathrooms(text, text, text) to authenticated, service_role;

revoke all on function public.upsert_premium_arrival_alert(uuid, timestamptz, integer) from public;
grant execute on function public.upsert_premium_arrival_alert(uuid, timestamptz, integer) to authenticated, service_role;

revoke all on function public.cancel_premium_arrival_alert(uuid) from public;
grant execute on function public.cancel_premium_arrival_alert(uuid) to authenticated, service_role;

revoke all on function public.get_arrival_alert_recipients(uuid) from public;
grant execute on function public.get_arrival_alert_recipients(uuid) to service_role;
