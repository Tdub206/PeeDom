-- ============================================================================
-- 049_imported_location_verification_audit.sql
-- Adds an append-only audit trail for imported bathroom existence checks plus
-- a verification RPC and public freshness summary fields.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'imported_location_freshness_status_enum'
  ) then
    create type public.imported_location_freshness_status_enum as enum (
      'unreviewed',
      'fresh',
      'aging',
      'disputed',
      'likely_removed'
    );
  end if;
end
$$;

create table if not exists public.imported_bathroom_location_verifications (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_exists boolean not null,
  note text,
  trust_weight numeric(5, 2) not null default 1.00
    check (trust_weight >= 0.25 and trust_weight <= 4.00),
  effective_weight numeric(5, 2) not null default 1.00
    check (effective_weight >= 0 and effective_weight <= 4.00),
  shadow_banned_at_time boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'imported_location_verifications_note_length_check'
  ) then
    alter table public.imported_bathroom_location_verifications
      add constraint imported_location_verifications_note_length_check
      check (note is null or char_length(note) <= 280);
  end if;
end
$$;

create index if not exists idx_imported_location_verifications_bathroom
  on public.imported_bathroom_location_verifications (bathroom_id, created_at desc);

create index if not exists idx_imported_location_verifications_user
  on public.imported_bathroom_location_verifications (user_id, bathroom_id, created_at desc);

create index if not exists idx_imported_location_verifications_exists
  on public.imported_bathroom_location_verifications (bathroom_id, location_exists, created_at desc);

comment on table public.imported_bathroom_location_verifications is
  'Append-only audit log for imported bathroom existence checks.';

alter table public.imported_bathroom_location_verifications enable row level security;

drop policy if exists "imported_location_verifications_select_self_or_admin" on public.imported_bathroom_location_verifications;
create policy "imported_location_verifications_select_self_or_admin"
  on public.imported_bathroom_location_verifications for select
  using (auth.uid() = user_id or public.is_admin_user(auth.uid()));

create or replace function public.get_imported_location_verification_summary(
  p_bathroom_id uuid
)
returns table (
  imported_location_last_verified_at timestamptz,
  imported_location_confirmation_count integer,
  imported_location_denial_count integer,
  imported_location_weighted_confirmation_score numeric(6, 2),
  imported_location_weighted_denial_score numeric(6, 2),
  imported_location_freshness_status public.imported_location_freshness_status_enum,
  imported_location_needs_review boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with aggregates as (
    select
      max(verifications.created_at) as last_verified_at,
      max(verifications.created_at) filter (where verifications.location_exists) as last_confirmation_at,
      max(verifications.created_at) filter (where not verifications.location_exists) as last_denial_at,
      count(*) filter (where verifications.location_exists)::integer as confirmation_count,
      count(*) filter (where not verifications.location_exists)::integer as denial_count,
      coalesce(sum(verifications.effective_weight) filter (where verifications.location_exists), 0)::numeric(6, 2)
        as weighted_confirmation_score,
      coalesce(sum(verifications.effective_weight) filter (where not verifications.location_exists), 0)::numeric(6, 2)
        as weighted_denial_score
    from public.imported_bathroom_location_verifications verifications
    where verifications.bathroom_id = p_bathroom_id
  ),
  summarized as (
    select
      aggregates.last_verified_at as imported_location_last_verified_at,
      coalesce(aggregates.confirmation_count, 0) as imported_location_confirmation_count,
      coalesce(aggregates.denial_count, 0) as imported_location_denial_count,
      round(coalesce(aggregates.weighted_confirmation_score, 0), 2)::numeric(6, 2)
        as imported_location_weighted_confirmation_score,
      round(coalesce(aggregates.weighted_denial_score, 0), 2)::numeric(6, 2)
        as imported_location_weighted_denial_score,
      case
        when coalesce(aggregates.confirmation_count, 0) = 0
          and coalesce(aggregates.denial_count, 0) = 0
          then 'unreviewed'::public.imported_location_freshness_status_enum
        when coalesce(aggregates.weighted_denial_score, 0) >= 3
          and coalesce(aggregates.denial_count, 0) >= 2
          and aggregates.last_denial_at >= now() - interval '45 days'
          and coalesce(aggregates.weighted_denial_score, 0)
            >= coalesce(aggregates.weighted_confirmation_score, 0) + 0.5
          then 'likely_removed'::public.imported_location_freshness_status_enum
        when coalesce(aggregates.weighted_confirmation_score, 0) > 0
          and coalesce(aggregates.weighted_denial_score, 0) > 0
          and (
            abs(
              coalesce(aggregates.weighted_confirmation_score, 0)
              - coalesce(aggregates.weighted_denial_score, 0)
            ) <= 1.25
            or coalesce(aggregates.denial_count, 0) >= 2
          )
          then 'disputed'::public.imported_location_freshness_status_enum
        when aggregates.last_verified_at >= now() - interval '45 days'
          and coalesce(aggregates.weighted_confirmation_score, 0)
            >= greatest(coalesce(aggregates.weighted_denial_score, 0), 1.0)
          then 'fresh'::public.imported_location_freshness_status_enum
        else 'aging'::public.imported_location_freshness_status_enum
      end as imported_location_freshness_status
    from aggregates
  )
  select
    summarized.imported_location_last_verified_at,
    summarized.imported_location_confirmation_count,
    summarized.imported_location_denial_count,
    summarized.imported_location_weighted_confirmation_score,
    summarized.imported_location_weighted_denial_score,
    summarized.imported_location_freshness_status,
    summarized.imported_location_freshness_status <> 'fresh'::public.imported_location_freshness_status_enum
      as imported_location_needs_review
  from summarized;
$$;

revoke all on function public.get_imported_location_verification_summary(uuid) from public;
grant execute on function public.get_imported_location_verification_summary(uuid) to anon, authenticated, service_role;

create or replace function public.verify_imported_bathroom_location(
  p_bathroom_id uuid,
  p_location_exists boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_bathroom public.bathrooms%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_last_verification_at timestamptz;
  v_next_allowed_at timestamptz;
  v_trust_weight numeric(5, 2) := 1.00;
  v_effective_weight numeric(5, 2) := 1.00;
  v_shadow_banned boolean := false;
  v_verification_id uuid;
  v_created_at timestamptz;
  v_summary record;
begin
  v_user_id := public.assert_active_user();

  select *
  into v_bathroom
  from public.bathrooms bathrooms
  where bathrooms.id = p_bathroom_id
    and bathrooms.moderation_status = 'active';

  if v_bathroom.id is null then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_bathroom.source_type <> 'imported' then
    return jsonb_build_object(
      'success', false,
      'error', 'imported_location_required',
      'bathroom_id', p_bathroom_id,
      'location_exists', p_location_exists,
      'next_allowed_at', null,
      'imported_location_last_verified_at', null,
      'imported_location_confirmation_count', 0,
      'imported_location_denial_count', 0,
      'imported_location_weighted_confirmation_score', 0,
      'imported_location_weighted_denial_score', 0,
      'imported_location_freshness_status', 'unreviewed',
      'imported_location_needs_review', true
    );
  end if;

  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'INVALID_LOCATION_VERIFICATION_NOTE' using errcode = 'P0001';
  end if;

  select verifications.created_at
  into v_last_verification_at
  from public.imported_bathroom_location_verifications verifications
  where verifications.bathroom_id = p_bathroom_id
    and verifications.user_id = v_user_id
  order by verifications.created_at desc
  limit 1;

  if v_last_verification_at is not null then
    v_next_allowed_at := v_last_verification_at + interval '12 hours';

    if v_next_allowed_at > now() then
      select *
      into v_summary
      from public.get_imported_location_verification_summary(p_bathroom_id);

      return jsonb_build_object(
        'success', false,
        'error', 'cooldown_active',
        'bathroom_id', p_bathroom_id,
        'location_exists', p_location_exists,
        'next_allowed_at', timezone('utc', v_next_allowed_at),
        'imported_location_last_verified_at', timezone('utc', v_summary.imported_location_last_verified_at),
        'imported_location_confirmation_count', v_summary.imported_location_confirmation_count,
        'imported_location_denial_count', v_summary.imported_location_denial_count,
        'imported_location_weighted_confirmation_score', v_summary.imported_location_weighted_confirmation_score,
        'imported_location_weighted_denial_score', v_summary.imported_location_weighted_denial_score,
        'imported_location_freshness_status', v_summary.imported_location_freshness_status,
        'imported_location_needs_review', v_summary.imported_location_needs_review
      );
    end if;
  end if;

  select
    rep.trust_weight,
    coalesce(rep.shadow_banned, false)
  into
    v_trust_weight,
    v_shadow_banned
  from public.contributor_reputation_profiles rep
  where rep.user_id = v_user_id;

  if not found then
    v_trust_weight := 1.00;
    v_shadow_banned := false;
  end if;

  v_effective_weight := case
    when v_shadow_banned then 0
    else coalesce(v_trust_weight, 1.00)
  end;

  insert into public.imported_bathroom_location_verifications (
    bathroom_id,
    user_id,
    location_exists,
    note,
    trust_weight,
    effective_weight,
    shadow_banned_at_time
  )
  values (
    p_bathroom_id,
    v_user_id,
    p_location_exists,
    v_note,
    coalesce(v_trust_weight, 1.00),
    v_effective_weight,
    v_shadow_banned
  )
  returning id, created_at
  into v_verification_id, v_created_at;

  v_next_allowed_at := v_created_at + interval '12 hours';

  select *
  into v_summary
  from public.get_imported_location_verification_summary(p_bathroom_id);

  return jsonb_build_object(
    'success', true,
    'error', null,
    'verification_id', v_verification_id,
    'created_at', timezone('utc', v_created_at),
    'bathroom_id', p_bathroom_id,
    'location_exists', p_location_exists,
    'next_allowed_at', timezone('utc', v_next_allowed_at),
    'imported_location_last_verified_at', timezone('utc', v_summary.imported_location_last_verified_at),
    'imported_location_confirmation_count', v_summary.imported_location_confirmation_count,
    'imported_location_denial_count', v_summary.imported_location_denial_count,
    'imported_location_weighted_confirmation_score', v_summary.imported_location_weighted_confirmation_score,
    'imported_location_weighted_denial_score', v_summary.imported_location_weighted_denial_score,
    'imported_location_freshness_status', v_summary.imported_location_freshness_status,
    'imported_location_needs_review', v_summary.imported_location_needs_review
  );
end;
$$;

revoke all on function public.verify_imported_bathroom_location(uuid, boolean, text) from public;
grant execute on function public.verify_imported_bathroom_location(uuid, boolean, text) to authenticated, service_role;

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
  settings.official_access_instructions,
  imported_location.imported_location_last_verified_at,
  coalesce(imported_location.imported_location_confirmation_count, 0) as imported_location_confirmation_count,
  coalesce(imported_location.imported_location_denial_count, 0) as imported_location_denial_count,
  coalesce(imported_location.imported_location_weighted_confirmation_score, 0) as imported_location_weighted_confirmation_score,
  coalesce(imported_location.imported_location_weighted_denial_score, 0) as imported_location_weighted_denial_score,
  imported_location.imported_location_freshness_status,
  coalesce(imported_location.imported_location_needs_review, false) as imported_location_needs_review
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
left join lateral public.get_imported_location_verification_summary(bathrooms.id) imported_location
  on bathrooms.source_type = 'imported'
where bathrooms.moderation_status = 'active';

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
  accessibility_score integer,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  verification_badge_type text,
  stallpass_access_tier text,
  show_on_free_map boolean,
  is_business_location_verified boolean,
  location_verified_at timestamptz,
  active_offer_count integer,
  location_archetype text,
  archetype_metadata jsonb,
  code_policy text,
  allow_user_code_submissions boolean,
  has_official_code boolean,
  owner_code_last_verified_at timestamptz,
  official_access_instructions text,
  imported_location_last_verified_at timestamptz,
  imported_location_confirmation_count integer,
  imported_location_denial_count integer,
  imported_location_weighted_confirmation_score numeric,
  imported_location_weighted_denial_score numeric,
  imported_location_freshness_status public.imported_location_freshness_status_enum,
  imported_location_needs_review boolean,
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
    details.accessibility_score,
    details.hours_json,
    details.code_id,
    details.confidence_score,
    details.up_votes,
    details.down_votes,
    details.last_verified_at,
    details.expires_at,
    details.cleanliness_avg,
    details.updated_at,
    details.verification_badge_type,
    details.stallpass_access_tier,
    details.show_on_free_map,
    details.is_business_location_verified,
    details.location_verified_at,
    details.active_offer_count,
    details.location_archetype,
    details.archetype_metadata,
    details.code_policy,
    details.allow_user_code_submissions,
    details.has_official_code,
    details.owner_code_last_verified_at,
    details.official_access_instructions,
    details.imported_location_last_verified_at,
    details.imported_location_confirmation_count,
    details.imported_location_denial_count,
    details.imported_location_weighted_confirmation_score,
    details.imported_location_weighted_denial_score,
    details.imported_location_freshness_status,
    details.imported_location_needs_review,
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

create or replace function public.search_bathrooms(
  p_query text default null,
  p_user_lat double precision default null,
  p_user_lng double precision default null,
  p_radius_meters double precision default 8047,
  p_is_accessible boolean default null,
  p_is_locked boolean default null,
  p_has_code boolean default null,
  p_is_customer_only boolean default null,
  p_limit integer default 25,
  p_offset integer default 0
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
  accessibility_score integer,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  verification_badge_type text,
  stallpass_access_tier text,
  show_on_free_map boolean,
  is_business_location_verified boolean,
  location_verified_at timestamptz,
  active_offer_count integer,
  location_archetype text,
  archetype_metadata jsonb,
  code_policy text,
  allow_user_code_submissions boolean,
  has_official_code boolean,
  owner_code_last_verified_at timestamptz,
  official_access_instructions text,
  imported_location_last_verified_at timestamptz,
  imported_location_confirmation_count integer,
  imported_location_denial_count integer,
  imported_location_weighted_confirmation_score numeric,
  imported_location_weighted_denial_score numeric,
  imported_location_freshness_status public.imported_location_freshness_status_enum,
  imported_location_needs_review boolean,
  distance_meters double precision,
  rank real
)
language sql
stable
security invoker
set search_path = public
as $$
  with geography_input as (
    select
      case
        when p_user_lat is not null and p_user_lng is not null then
          st_setsrid(st_makepoint(p_user_lng, p_user_lat), 4326)::geography
        else null::geography
      end as ref_point
  ),
  normalized_terms as (
    select array_agg(term) filter (where char_length(term) > 0) as terms
    from regexp_split_to_table(
      lower(regexp_replace(trim(coalesce(p_query, '')), '[^[:alnum:]\s]+', ' ', 'g')),
      '\s+'
    ) as term
  ),
  parsed_query as (
    select
      case
        when coalesce(array_length(terms, 1), 0) = 0 then null::tsquery
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
  candidate_rows as (
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
      d.accessibility_score,
      d.hours_json,
      d.code_id,
      d.confidence_score,
      d.up_votes,
      d.down_votes,
      d.last_verified_at,
      d.expires_at,
      d.cleanliness_avg,
      d.updated_at,
      d.verification_badge_type,
      d.stallpass_access_tier,
      d.show_on_free_map,
      d.is_business_location_verified,
      d.location_verified_at,
      d.active_offer_count,
      d.location_archetype,
      d.archetype_metadata,
      d.code_policy,
      d.allow_user_code_submissions,
      d.has_official_code,
      d.owner_code_last_verified_at,
      d.official_access_instructions,
      d.imported_location_last_verified_at,
      d.imported_location_confirmation_count,
      d.imported_location_denial_count,
      d.imported_location_weighted_confirmation_score,
      d.imported_location_weighted_denial_score,
      d.imported_location_freshness_status,
      d.imported_location_needs_review,
      case
        when g.ref_point is not null then st_distance(b.geom, g.ref_point)
        else null::double precision
      end as distance_meters,
      case
        when pq.q is not null then ts_rank_cd(b.search_vector, pq.q)
        else 0.0::real
      end as text_rank
    from public.bathrooms b
    join public.v_bathroom_detail_public d
      on d.id = b.id
    cross join geography_input g
    cross join parsed_query pq
    where b.moderation_status = 'active'
      and (
        pq.q is not null
        or g.ref_point is not null
      )
      and (
        pq.q is null
        or b.search_vector @@ pq.q
      )
      and (
        g.ref_point is null
        or st_dwithin(b.geom, g.ref_point, greatest(coalesce(p_radius_meters, 8047), 250))
      )
      and (p_is_accessible is null or d.is_accessible = p_is_accessible)
      and (p_is_locked is null or d.is_locked = p_is_locked)
      and (p_is_customer_only is null or d.is_customer_only = p_is_customer_only)
      and (
        p_has_code is null
        or (p_has_code = true and d.code_id is not null)
        or (p_has_code = false and d.code_id is null)
      )
  )
  select
    c.id,
    c.place_name,
    c.address_line1,
    c.city,
    c.state,
    c.postal_code,
    c.country_code,
    c.latitude,
    c.longitude,
    c.is_locked,
    c.is_accessible,
    c.is_customer_only,
    c.accessibility_features,
    c.accessibility_score,
    c.hours_json,
    c.code_id,
    c.confidence_score,
    c.up_votes,
    c.down_votes,
    c.last_verified_at,
    c.expires_at,
    c.cleanliness_avg,
    c.updated_at,
    c.verification_badge_type,
    c.stallpass_access_tier,
    c.show_on_free_map,
    c.is_business_location_verified,
    c.location_verified_at,
    c.active_offer_count,
    c.location_archetype,
    c.archetype_metadata,
    c.code_policy,
    c.allow_user_code_submissions,
    c.has_official_code,
    c.owner_code_last_verified_at,
    c.official_access_instructions,
    c.imported_location_last_verified_at,
    c.imported_location_confirmation_count,
    c.imported_location_denial_count,
    c.imported_location_weighted_confirmation_score,
    c.imported_location_weighted_denial_score,
    c.imported_location_freshness_status,
    c.imported_location_needs_review,
    c.distance_meters,
    case
      when c.distance_meters is not null and c.text_rank > 0 then
        (c.text_rank / ln(greatest(c.distance_meters, 1.0) / 100.0 + 2.0))::real
      when c.text_rank > 0 then c.text_rank::real
      when c.distance_meters is not null then
        (1.0 / ln(greatest(c.distance_meters, 1.0) / 100.0 + 2.0))::real
      else 0.0::real
    end as rank
  from candidate_rows c
  order by
    rank desc,
    c.distance_meters asc nulls last,
    c.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 50))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.get_user_favorites(
  p_user_lat double precision default null,
  p_user_lng double precision default null
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
  accessibility_score integer,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  verification_badge_type text,
  stallpass_access_tier text,
  show_on_free_map boolean,
  is_business_location_verified boolean,
  location_verified_at timestamptz,
  active_offer_count integer,
  location_archetype text,
  archetype_metadata jsonb,
  code_policy text,
  allow_user_code_submissions boolean,
  has_official_code boolean,
  owner_code_last_verified_at timestamptz,
  official_access_instructions text,
  imported_location_last_verified_at timestamptz,
  imported_location_confirmation_count integer,
  imported_location_denial_count integer,
  imported_location_weighted_confirmation_score numeric,
  imported_location_weighted_denial_score numeric,
  imported_location_freshness_status public.imported_location_freshness_status_enum,
  imported_location_needs_review boolean,
  distance_meters double precision,
  favorited_at timestamptz
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
    detail.accessibility_score,
    detail.hours_json,
    detail.code_id,
    detail.confidence_score,
    detail.up_votes,
    detail.down_votes,
    detail.last_verified_at,
    detail.expires_at,
    detail.cleanliness_avg,
    detail.updated_at,
    detail.verification_badge_type,
    detail.stallpass_access_tier,
    detail.show_on_free_map,
    detail.is_business_location_verified,
    detail.location_verified_at,
    detail.active_offer_count,
    detail.location_archetype,
    detail.archetype_metadata,
    detail.code_policy,
    detail.allow_user_code_submissions,
    detail.has_official_code,
    detail.owner_code_last_verified_at,
    detail.official_access_instructions,
    detail.imported_location_last_verified_at,
    detail.imported_location_confirmation_count,
    detail.imported_location_denial_count,
    detail.imported_location_weighted_confirmation_score,
    detail.imported_location_weighted_denial_score,
    detail.imported_location_freshness_status,
    detail.imported_location_needs_review,
    case
      when p_user_lat is not null and p_user_lng is not null then
        st_distance(
          bathrooms.geom,
          st_setsrid(st_makepoint(p_user_lng, p_user_lat), 4326)::geography
        )
      else null
    end as distance_meters,
    favorites.created_at as favorited_at
  from public.favorites favorites
  join public.bathrooms bathrooms
    on bathrooms.id = favorites.bathroom_id
   and bathrooms.moderation_status = 'active'
  join public.v_bathroom_detail_public detail
    on detail.id = bathrooms.id
  where favorites.user_id = auth.uid()
  order by favorites.created_at desc;
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
  accessibility_score integer,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  verification_badge_type text,
  stallpass_access_tier text,
  show_on_free_map boolean,
  is_business_location_verified boolean,
  location_verified_at timestamptz,
  active_offer_count integer,
  location_archetype text,
  archetype_metadata jsonb,
  code_policy text,
  allow_user_code_submissions boolean,
  has_official_code boolean,
  owner_code_last_verified_at timestamptz,
  official_access_instructions text,
  imported_location_last_verified_at timestamptz,
  imported_location_confirmation_count integer,
  imported_location_denial_count integer,
  imported_location_weighted_confirmation_score numeric,
  imported_location_weighted_denial_score numeric,
  imported_location_freshness_status public.imported_location_freshness_status_enum,
  imported_location_needs_review boolean
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
    detail.accessibility_score,
    detail.hours_json,
    detail.code_id,
    detail.confidence_score,
    detail.up_votes,
    detail.down_votes,
    detail.last_verified_at,
    detail.expires_at,
    detail.cleanliness_avg,
    detail.updated_at,
    detail.verification_badge_type,
    detail.stallpass_access_tier,
    detail.show_on_free_map,
    detail.is_business_location_verified,
    detail.location_verified_at,
    detail.active_offer_count,
    detail.location_archetype,
    detail.archetype_metadata,
    detail.code_policy,
    detail.allow_user_code_submissions,
    detail.has_official_code,
    detail.owner_code_last_verified_at,
    detail.official_access_instructions,
    detail.imported_location_last_verified_at,
    detail.imported_location_confirmation_count,
    detail.imported_location_denial_count,
    detail.imported_location_weighted_confirmation_score,
    detail.imported_location_weighted_denial_score,
    detail.imported_location_freshness_status,
    detail.imported_location_needs_review
  from public.v_bathroom_detail_public detail
  where lower(coalesce(detail.city, '')) = lower(trim(coalesce(p_city, '')))
    and lower(coalesce(detail.state, '')) = lower(trim(coalesce(p_state, '')))
    and (
      p_country_code is null
      or lower(detail.country_code) = lower(trim(p_country_code))
    )
  order by detail.updated_at desc, detail.place_name asc;
$$;
