-- ============================================================================
-- 057_directory_ranking_scale.sql
-- Scalable directory ranking and indexed search for canonical bathrooms plus
-- source candidates.
-- ============================================================================

alter table public.bathroom_source_records
  add column if not exists search_vector tsvector;

update public.bathroom_source_records
set search_vector =
  setweight(to_tsvector('english', coalesce(place_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(address_line1, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(city, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(state, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(postal_code, '')), 'B')
where search_vector is null;

create index if not exists idx_bathroom_source_records_search_vector
  on public.bathroom_source_records using gin (search_vector)
  where status = 'candidate' and is_public_candidate = true;

create or replace function public.update_bathroom_source_record_search_vector()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.place_name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.address_line1, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.city, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.state, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.postal_code, '')), 'B');

  return new;
end;
$$;

drop trigger if exists bathroom_source_record_search_vector_update on public.bathroom_source_records;

create trigger bathroom_source_record_search_vector_update
before insert or update of place_name, address_line1, city, state, postal_code
on public.bathroom_source_records
for each row
execute function public.update_bathroom_source_record_search_vector();

create or replace function public.calculate_directory_distance_score(
  p_distance_meters double precision
)
returns real
language sql
immutable
as $$
  select case
    when p_distance_meters is null then 45.0::real
    else least(
      100.0,
      greatest(
        18.0,
        100.0 / ln(greatest(p_distance_meters, 1.0) / 80.0 + 2.0)
      )
    )::real
  end;
$$;

create or replace function public.calculate_directory_candidate_visibility_adjustment(
  p_trusted_canonical_count integer
)
returns real
language sql
immutable
as $$
  select case
    when coalesce(p_trusted_canonical_count, 0) <= 0 then 20.0::real
    when p_trusted_canonical_count <= 2 then 10.0::real
    when p_trusted_canonical_count <= 5 then 0.0::real
    when p_trusted_canonical_count <= 9 then -10.0::real
    else -18.0::real
  end;
$$;

create or replace function public.calculate_directory_text_match_bonus(
  p_place_name text,
  p_address_line1 text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_query_text text
)
returns real
language sql
immutable
as $$
  select case
    when p_query_text is null or btrim(p_query_text) = '' then 0.0::real
    when lower(coalesce(p_place_name, '')) = lower(p_query_text) then 30.0::real
    when coalesce(p_place_name, '') ilike (p_query_text || '%') then 20.0::real
    when coalesce(p_place_name, '') ilike ('%' || p_query_text || '%') then 12.0::real
    when (
      coalesce(p_address_line1, '') ilike ('%' || p_query_text || '%')
      or coalesce(p_city, '') ilike ('%' || p_query_text || '%')
      or coalesce(p_state, '') ilike ('%' || p_query_text || '%')
      or coalesce(p_postal_code, '') ilike ('%' || p_query_text || '%')
    ) then 8.0::real
    else 0.0::real
  end;
$$;

create or replace function public.calculate_directory_trust_score(
  p_listing_kind text,
  p_is_business_location_verified boolean,
  p_verification_badge_type text,
  p_active_offer_count integer,
  p_confidence_score numeric,
  p_last_verified_at timestamptz,
  p_source_freshness_status public.source_record_freshness_status_enum,
  p_source_confirmation_count integer,
  p_source_denial_count integer,
  p_source_weighted_confirmation_score numeric,
  p_source_weighted_denial_score numeric,
  p_source_last_verified_at timestamptz,
  p_source_updated_at timestamptz
)
returns real
language sql
stable
as $$
  select case
    when p_listing_kind = 'source_candidate' then
      least(
        82.0,
        greatest(
          8.0,
          24.0
          + case p_source_freshness_status
              when 'fresh'::public.source_record_freshness_status_enum then 18.0
              when 'aging'::public.source_record_freshness_status_enum then 12.0
              when 'unreviewed'::public.source_record_freshness_status_enum then 4.0
              when 'disputed'::public.source_record_freshness_status_enum then -16.0
              when 'likely_removed'::public.source_record_freshness_status_enum then -40.0
              else 0.0
            end
          + least(coalesce(p_source_confirmation_count, 0), 3) * 4.0
          + least(floor(coalesce(p_source_weighted_confirmation_score, 0))::integer, 3) * 2.0
          - least(coalesce(p_source_denial_count, 0), 2) * 6.0
          - least(floor(coalesce(p_source_weighted_denial_score, 0))::integer, 3) * 4.0
          + case
              when p_source_updated_at >= now() - interval '180 days' then 4.0
              when p_source_updated_at >= now() - interval '365 days' then 2.0
              else 0.0
            end
          + case
              when p_source_last_verified_at >= now() - interval '30 days' then 4.0
              when p_source_last_verified_at >= now() - interval '90 days' then 2.0
              else 0.0
            end
        )
      )::real
    else
      least(
        100.0,
        greatest(
          34.0,
          52.0
          + case when coalesce(p_is_business_location_verified, false) then 18.0 else 0.0 end
          + case when p_verification_badge_type is not null then 16.0 else 0.0 end
          + least(coalesce(p_active_offer_count, 0), 3) * 2.0
          + case
              when p_last_verified_at >= now() - interval '14 days' then 14.0
              when p_last_verified_at >= now() - interval '45 days' then 8.0
              when p_last_verified_at >= now() - interval '120 days' then 3.0
              else 0.0
            end
          + case
              when coalesce(p_confidence_score, 0) >= 85 then 12.0
              when coalesce(p_confidence_score, 0) >= 70 then 8.0
              when coalesce(p_confidence_score, 0) >= 55 then 4.0
              else 0.0
            end
          + case p_source_freshness_status
              when 'fresh'::public.source_record_freshness_status_enum then 8.0
              when 'aging'::public.source_record_freshness_status_enum then 3.0
              when 'unreviewed'::public.source_record_freshness_status_enum then -3.0
              when 'disputed'::public.source_record_freshness_status_enum then -10.0
              when 'likely_removed'::public.source_record_freshness_status_enum then -24.0
              else 0.0
            end
        )
      )::real
  end;
$$;

drop function if exists public.get_directory_listings_near(double precision, double precision, integer);

create function public.get_directory_listings_near(
  lat double precision,
  lng double precision,
  radius_m integer default 1000
)
returns table (
  listing_kind text,
  bathroom_id uuid,
  source_record_id uuid,
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
  origin_source_key text,
  origin_label text,
  origin_attribution_short text,
  source_dataset text,
  source_license_key text,
  source_url text,
  source_updated_at timestamptz,
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_weighted_confirmation_score numeric(6, 2),
  source_weighted_denial_score numeric(6, 2),
  source_freshness_status public.source_record_freshness_status_enum,
  source_needs_review boolean,
  can_favorite boolean,
  can_submit_code boolean,
  can_report_live_status boolean,
  can_claim_business boolean,
  distance_meters double precision,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with canonical_rows as (
    select
      'canonical'::text as listing_kind,
      details.id as bathroom_id,
      null::uuid as source_record_id,
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
      source_summary.origin_source_key,
      source_summary.origin_label,
      source_summary.origin_attribution_short,
      source_summary.source_dataset,
      source_summary.source_license_key,
      source_summary.source_url,
      source_summary.source_updated_at,
      source_summary.source_last_verified_at,
      coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
      coalesce(source_summary.source_denial_count, 0) as source_denial_count,
      coalesce(source_summary.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
      coalesce(source_summary.source_weighted_denial_score, 0) as source_weighted_denial_score,
      source_summary.source_freshness_status,
      coalesce(source_summary.source_needs_review, false) as source_needs_review,
      true as can_favorite,
      true as can_submit_code,
      true as can_report_live_status,
      true as can_claim_business,
      details.distance_meters,
      public.calculate_directory_trust_score(
        'canonical',
        details.is_business_location_verified,
        details.verification_badge_type,
        details.active_offer_count,
        details.confidence_score,
        details.last_verified_at,
        source_summary.source_freshness_status,
        coalesce(source_summary.source_confirmation_count, 0),
        coalesce(source_summary.source_denial_count, 0),
        coalesce(source_summary.source_weighted_confirmation_score, 0),
        coalesce(source_summary.source_weighted_denial_score, 0),
        source_summary.source_last_verified_at,
        source_summary.source_updated_at
      ) as trust_score
    from public.get_bathrooms_near(lat, lng, radius_m) details
    left join lateral public.get_canonical_bathroom_source_summary(details.id) source_summary
      on true
    where coalesce(source_summary.hide_from_default_results, false) = false
  ),
  raw_source_candidates as (
    select
      source_records.*,
      st_distance(
        source_records.geom,
        geography(st_setsrid(st_makepoint(lng, lat), 4326))
      ) as distance_meters
    from public.bathroom_source_records source_records
    where source_records.status = 'candidate'
      and source_records.is_public_candidate = true
      and st_dwithin(
        source_records.geom,
        geography(st_setsrid(st_makepoint(lng, lat), 4326)),
        radius_m
      )
  ),
  source_candidate_rollup as (
    select
      raw_candidates.id as source_record_id,
      max(verifications.created_at) as source_last_verified_at,
      max(verifications.created_at) filter (where verifications.location_exists) as last_confirmation_at,
      max(verifications.created_at) filter (where not verifications.location_exists) as last_denial_at,
      count(*) filter (where verifications.location_exists)::integer as source_confirmation_count,
      count(*) filter (where not verifications.location_exists)::integer as source_denial_count,
      round(
        coalesce(sum(verifications.effective_weight) filter (where verifications.location_exists), 0),
        2
      )::numeric(6, 2) as source_weighted_confirmation_score,
      round(
        coalesce(sum(verifications.effective_weight) filter (where not verifications.location_exists), 0),
        2
      )::numeric(6, 2) as source_weighted_denial_score
    from raw_source_candidates raw_candidates
    left join public.bathroom_source_record_verifications verifications
      on verifications.source_record_id = raw_candidates.id
    group by raw_candidates.id
  ),
  source_candidate_base as (
    select
      'source_candidate'::text as listing_kind,
      null::uuid as bathroom_id,
      raw_candidates.id as source_record_id,
      raw_candidates.place_name,
      raw_candidates.address_line1,
      raw_candidates.city,
      raw_candidates.state,
      raw_candidates.postal_code,
      raw_candidates.country_code,
      raw_candidates.latitude,
      raw_candidates.longitude,
      raw_candidates.is_locked,
      raw_candidates.is_accessible,
      raw_candidates.is_customer_only,
      raw_candidates.accessibility_features,
      public.calculate_accessibility_score(
        raw_candidates.is_accessible,
        raw_candidates.accessibility_features
      ) as accessibility_score,
      raw_candidates.hours_json,
      null::uuid as code_id,
      null::numeric as confidence_score,
      null::integer as up_votes,
      null::integer as down_votes,
      null::timestamptz as last_verified_at,
      null::timestamptz as expires_at,
      null::numeric as cleanliness_avg,
      raw_candidates.updated_at,
      null::text as verification_badge_type,
      'public'::text as stallpass_access_tier,
      raw_candidates.show_on_free_map,
      false as is_business_location_verified,
      null::timestamptz as location_verified_at,
      0::integer as active_offer_count,
      raw_candidates.location_archetype,
      raw_candidates.archetype_metadata,
      null::text as code_policy,
      false as allow_user_code_submissions,
      false as has_official_code,
      null::timestamptz as owner_code_last_verified_at,
      null::text as official_access_instructions,
      raw_candidates.source_key as origin_source_key,
      public.get_bathroom_source_origin_label(raw_candidates.source_key) as origin_label,
      public.get_bathroom_source_origin_attribution(
        raw_candidates.source_key,
        raw_candidates.source_attribution_text,
        raw_candidates.source_dataset
      ) as origin_attribution_short,
      raw_candidates.source_dataset,
      raw_candidates.source_license_key,
      raw_candidates.source_url,
      raw_candidates.source_updated_at,
      rollup.source_last_verified_at,
      coalesce(rollup.source_confirmation_count, 0) as source_confirmation_count,
      coalesce(rollup.source_denial_count, 0) as source_denial_count,
      coalesce(rollup.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
      coalesce(rollup.source_weighted_denial_score, 0) as source_weighted_denial_score,
      case
        when coalesce(rollup.source_confirmation_count, 0) = 0
          and coalesce(rollup.source_denial_count, 0) = 0
          then 'unreviewed'::public.source_record_freshness_status_enum
        when coalesce(rollup.source_weighted_denial_score, 0) >= 3
          and coalesce(rollup.source_denial_count, 0) >= 2
          and rollup.last_denial_at >= now() - interval '45 days'
          and coalesce(rollup.source_weighted_denial_score, 0)
            >= coalesce(rollup.source_weighted_confirmation_score, 0) + 0.5
          then 'likely_removed'::public.source_record_freshness_status_enum
        when coalesce(rollup.source_weighted_confirmation_score, 0) > 0
          and coalesce(rollup.source_weighted_denial_score, 0) > 0
          and (
            abs(
              coalesce(rollup.source_weighted_confirmation_score, 0)
              - coalesce(rollup.source_weighted_denial_score, 0)
            ) <= 1.25
            or coalesce(rollup.source_denial_count, 0) >= 2
          )
          then 'disputed'::public.source_record_freshness_status_enum
        when rollup.source_last_verified_at >= now() - interval '45 days'
          and coalesce(rollup.source_weighted_confirmation_score, 0)
            >= greatest(coalesce(rollup.source_weighted_denial_score, 0), 1.0)
          then 'fresh'::public.source_record_freshness_status_enum
        else 'aging'::public.source_record_freshness_status_enum
      end as source_freshness_status,
      raw_candidates.distance_meters
    from raw_source_candidates raw_candidates
    left join source_candidate_rollup rollup
      on rollup.source_record_id = raw_candidates.id
  ),
  source_candidates as (
    select
      source_candidate_base.*,
      source_candidate_base.source_freshness_status <> 'fresh'::public.source_record_freshness_status_enum
        as source_needs_review,
      false as can_favorite,
      false as can_submit_code,
      false as can_report_live_status,
      false as can_claim_business,
      public.calculate_directory_trust_score(
        'source_candidate',
        false,
        null,
        0,
        null,
        null,
        source_candidate_base.source_freshness_status,
        source_candidate_base.source_confirmation_count,
        source_candidate_base.source_denial_count,
        source_candidate_base.source_weighted_confirmation_score,
        source_candidate_base.source_weighted_denial_score,
        source_candidate_base.source_last_verified_at,
        source_candidate_base.source_updated_at
      ) as trust_score
    from source_candidate_base
    where source_candidate_base.source_freshness_status
      <> 'likely_removed'::public.source_record_freshness_status_enum
  ),
  directory_context as (
    select
      count(*) filter (where canonical_rows.trust_score >= 75)::integer as trusted_canonical_count,
      count(*)::integer as canonical_count
    from canonical_rows
  ),
  ranked_listings as (
    select
      canonical_rows.listing_kind,
      canonical_rows.bathroom_id,
      canonical_rows.source_record_id,
      canonical_rows.place_name,
      canonical_rows.address_line1,
      canonical_rows.city,
      canonical_rows.state,
      canonical_rows.postal_code,
      canonical_rows.country_code,
      canonical_rows.latitude,
      canonical_rows.longitude,
      canonical_rows.is_locked,
      canonical_rows.is_accessible,
      canonical_rows.is_customer_only,
      canonical_rows.accessibility_features,
      canonical_rows.accessibility_score,
      canonical_rows.hours_json,
      canonical_rows.code_id,
      canonical_rows.confidence_score,
      canonical_rows.up_votes,
      canonical_rows.down_votes,
      canonical_rows.last_verified_at,
      canonical_rows.expires_at,
      canonical_rows.cleanliness_avg,
      canonical_rows.updated_at,
      canonical_rows.verification_badge_type,
      canonical_rows.stallpass_access_tier,
      canonical_rows.show_on_free_map,
      canonical_rows.is_business_location_verified,
      canonical_rows.location_verified_at,
      canonical_rows.active_offer_count,
      canonical_rows.location_archetype,
      canonical_rows.archetype_metadata,
      canonical_rows.code_policy,
      canonical_rows.allow_user_code_submissions,
      canonical_rows.has_official_code,
      canonical_rows.owner_code_last_verified_at,
      canonical_rows.official_access_instructions,
      canonical_rows.origin_source_key,
      canonical_rows.origin_label,
      canonical_rows.origin_attribution_short,
      canonical_rows.source_dataset,
      canonical_rows.source_license_key,
      canonical_rows.source_url,
      canonical_rows.source_updated_at,
      canonical_rows.source_last_verified_at,
      canonical_rows.source_confirmation_count,
      canonical_rows.source_denial_count,
      canonical_rows.source_weighted_confirmation_score,
      canonical_rows.source_weighted_denial_score,
      canonical_rows.source_freshness_status,
      canonical_rows.source_needs_review,
      canonical_rows.can_favorite,
      canonical_rows.can_submit_code,
      canonical_rows.can_report_live_status,
      canonical_rows.can_claim_business,
      canonical_rows.distance_meters,
      (
        canonical_rows.trust_score * 0.68
        + public.calculate_directory_distance_score(canonical_rows.distance_meters) * 0.32
      )::real as rank
    from canonical_rows

    union all

    select
      source_candidates.listing_kind,
      source_candidates.bathroom_id,
      source_candidates.source_record_id,
      source_candidates.place_name,
      source_candidates.address_line1,
      source_candidates.city,
      source_candidates.state,
      source_candidates.postal_code,
      source_candidates.country_code,
      source_candidates.latitude,
      source_candidates.longitude,
      source_candidates.is_locked,
      source_candidates.is_accessible,
      source_candidates.is_customer_only,
      source_candidates.accessibility_features,
      source_candidates.accessibility_score,
      source_candidates.hours_json,
      source_candidates.code_id,
      source_candidates.confidence_score,
      source_candidates.up_votes,
      source_candidates.down_votes,
      source_candidates.last_verified_at,
      source_candidates.expires_at,
      source_candidates.cleanliness_avg,
      source_candidates.updated_at,
      source_candidates.verification_badge_type,
      source_candidates.stallpass_access_tier,
      source_candidates.show_on_free_map,
      source_candidates.is_business_location_verified,
      source_candidates.location_verified_at,
      source_candidates.active_offer_count,
      source_candidates.location_archetype,
      source_candidates.archetype_metadata,
      source_candidates.code_policy,
      source_candidates.allow_user_code_submissions,
      source_candidates.has_official_code,
      source_candidates.owner_code_last_verified_at,
      source_candidates.official_access_instructions,
      source_candidates.origin_source_key,
      source_candidates.origin_label,
      source_candidates.origin_attribution_short,
      source_candidates.source_dataset,
      source_candidates.source_license_key,
      source_candidates.source_url,
      source_candidates.source_updated_at,
      source_candidates.source_last_verified_at,
      source_candidates.source_confirmation_count,
      source_candidates.source_denial_count,
      source_candidates.source_weighted_confirmation_score,
      source_candidates.source_weighted_denial_score,
      source_candidates.source_freshness_status,
      source_candidates.source_needs_review,
      source_candidates.can_favorite,
      source_candidates.can_submit_code,
      source_candidates.can_report_live_status,
      source_candidates.can_claim_business,
      source_candidates.distance_meters,
      (
        source_candidates.trust_score * 0.60
        + public.calculate_directory_distance_score(source_candidates.distance_meters) * 0.40
        + public.calculate_directory_candidate_visibility_adjustment(directory_context.trusted_canonical_count)
      )::real as rank
    from source_candidates
    cross join directory_context
  )
  select
    ranked_listings.listing_kind,
    ranked_listings.bathroom_id,
    ranked_listings.source_record_id,
    ranked_listings.place_name,
    ranked_listings.address_line1,
    ranked_listings.city,
    ranked_listings.state,
    ranked_listings.postal_code,
    ranked_listings.country_code,
    ranked_listings.latitude,
    ranked_listings.longitude,
    ranked_listings.is_locked,
    ranked_listings.is_accessible,
    ranked_listings.is_customer_only,
    ranked_listings.accessibility_features,
    ranked_listings.accessibility_score,
    ranked_listings.hours_json,
    ranked_listings.code_id,
    ranked_listings.confidence_score,
    ranked_listings.up_votes,
    ranked_listings.down_votes,
    ranked_listings.last_verified_at,
    ranked_listings.expires_at,
    ranked_listings.cleanliness_avg,
    ranked_listings.updated_at,
    ranked_listings.verification_badge_type,
    ranked_listings.stallpass_access_tier,
    ranked_listings.show_on_free_map,
    ranked_listings.is_business_location_verified,
    ranked_listings.location_verified_at,
    ranked_listings.active_offer_count,
    ranked_listings.location_archetype,
    ranked_listings.archetype_metadata,
    ranked_listings.code_policy,
    ranked_listings.allow_user_code_submissions,
    ranked_listings.has_official_code,
    ranked_listings.owner_code_last_verified_at,
    ranked_listings.official_access_instructions,
    ranked_listings.origin_source_key,
    ranked_listings.origin_label,
    ranked_listings.origin_attribution_short,
    ranked_listings.source_dataset,
    ranked_listings.source_license_key,
    ranked_listings.source_url,
    ranked_listings.source_updated_at,
    ranked_listings.source_last_verified_at,
    ranked_listings.source_confirmation_count,
    ranked_listings.source_denial_count,
    ranked_listings.source_weighted_confirmation_score,
    ranked_listings.source_weighted_denial_score,
    ranked_listings.source_freshness_status,
    ranked_listings.source_needs_review,
    ranked_listings.can_favorite,
    ranked_listings.can_submit_code,
    ranked_listings.can_report_live_status,
    ranked_listings.can_claim_business,
    ranked_listings.distance_meters,
    ranked_listings.rank
  from ranked_listings
  order by ranked_listings.rank desc, ranked_listings.distance_meters asc, ranked_listings.updated_at desc;
$$;

revoke all on function public.get_directory_listings_near(double precision, double precision, integer) from public;
grant execute on function public.get_directory_listings_near(double precision, double precision, integer) to anon, authenticated, service_role;

drop function if exists public.search_directory_listings(
  text,
  double precision,
  double precision,
  double precision,
  boolean,
  boolean,
  boolean,
  boolean,
  integer,
  integer
);

create function public.search_directory_listings(
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
  listing_kind text,
  bathroom_id uuid,
  source_record_id uuid,
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
  origin_source_key text,
  origin_label text,
  origin_attribution_short text,
  source_dataset text,
  source_license_key text,
  source_url text,
  source_updated_at timestamptz,
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_weighted_confirmation_score numeric(6, 2),
  source_weighted_denial_score numeric(6, 2),
  source_freshness_status public.source_record_freshness_status_enum,
  source_needs_review boolean,
  can_favorite boolean,
  can_submit_code boolean,
  can_report_live_status boolean,
  can_claim_business boolean,
  distance_meters double precision,
  rank real
)
language sql
stable
security definer
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
  normalized_query as (
    select nullif(trim(coalesce(p_query, '')), '') as query_text
  ),
  normalized_terms as (
    select
      array_agg(term) filter (where char_length(term) > 0) as terms
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
  canonical_rows as (
    select
      'canonical'::text as listing_kind,
      listings.id as bathroom_id,
      null::uuid as source_record_id,
      listings.place_name,
      listings.address_line1,
      listings.city,
      listings.state,
      listings.postal_code,
      listings.country_code,
      listings.latitude,
      listings.longitude,
      listings.is_locked,
      listings.is_accessible,
      listings.is_customer_only,
      listings.accessibility_features,
      listings.accessibility_score,
      listings.hours_json,
      listings.code_id,
      listings.confidence_score,
      listings.up_votes,
      listings.down_votes,
      listings.last_verified_at,
      listings.expires_at,
      listings.cleanliness_avg,
      listings.updated_at,
      listings.verification_badge_type,
      listings.stallpass_access_tier,
      listings.show_on_free_map,
      listings.is_business_location_verified,
      listings.location_verified_at,
      listings.active_offer_count,
      listings.location_archetype,
      listings.archetype_metadata,
      listings.code_policy,
      listings.allow_user_code_submissions,
      listings.has_official_code,
      listings.owner_code_last_verified_at,
      listings.official_access_instructions,
      source_summary.origin_source_key,
      source_summary.origin_label,
      source_summary.origin_attribution_short,
      source_summary.source_dataset,
      source_summary.source_license_key,
      source_summary.source_url,
      source_summary.source_updated_at,
      source_summary.source_last_verified_at,
      coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
      coalesce(source_summary.source_denial_count, 0) as source_denial_count,
      coalesce(source_summary.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
      coalesce(source_summary.source_weighted_denial_score, 0) as source_weighted_denial_score,
      source_summary.source_freshness_status,
      coalesce(source_summary.source_needs_review, false) as source_needs_review,
      true as can_favorite,
      true as can_submit_code,
      true as can_report_live_status,
      true as can_claim_business,
      listings.distance_meters,
      coalesce(listings.rank, 0)::real * 100.0 as search_signal_score,
      public.calculate_directory_trust_score(
        'canonical',
        listings.is_business_location_verified,
        listings.verification_badge_type,
        listings.active_offer_count,
        listings.confidence_score,
        listings.last_verified_at,
        source_summary.source_freshness_status,
        coalesce(source_summary.source_confirmation_count, 0),
        coalesce(source_summary.source_denial_count, 0),
        coalesce(source_summary.source_weighted_confirmation_score, 0),
        coalesce(source_summary.source_weighted_denial_score, 0),
        source_summary.source_last_verified_at,
        source_summary.source_updated_at
      ) as trust_score
    from public.search_bathrooms(
      p_query,
      p_user_lat,
      p_user_lng,
      p_radius_meters,
      p_is_accessible,
      p_is_locked,
      p_has_code,
      p_is_customer_only,
      greatest(1, least(coalesce(p_limit, 25) * 3, 150)),
      0
    ) listings
    left join lateral public.get_canonical_bathroom_source_summary(listings.id) source_summary
      on true
    where coalesce(source_summary.hide_from_default_results, false) = false
  ),
  raw_source_candidates as (
    select
      source_records.*,
      case
        when geography_input.ref_point is not null then st_distance(source_records.geom, geography_input.ref_point)
        else null::double precision
      end as distance_meters,
      case
        when parsed_query.q is not null then ts_rank_cd(source_records.search_vector, parsed_query.q)
        else 0.0::real
      end as text_rank
    from public.bathroom_source_records source_records
    cross join geography_input
    cross join normalized_query
    cross join parsed_query
    where source_records.status = 'candidate'
      and source_records.is_public_candidate = true
      and (
        parsed_query.q is not null
        or geography_input.ref_point is not null
      )
      and (
        parsed_query.q is null
        or source_records.search_vector @@ parsed_query.q
      )
      and (
        geography_input.ref_point is null
        or st_dwithin(
          source_records.geom,
          geography_input.ref_point,
          greatest(coalesce(p_radius_meters, 8047), 250)
        )
      )
      and (p_is_accessible is null or source_records.is_accessible = p_is_accessible)
      and (p_is_locked is null or source_records.is_locked = p_is_locked)
      and (p_is_customer_only is null or source_records.is_customer_only = p_is_customer_only)
      and (p_has_code is null or p_has_code = false)
  ),
  source_candidate_rollup as (
    select
      raw_candidates.id as source_record_id,
      max(verifications.created_at) as source_last_verified_at,
      max(verifications.created_at) filter (where verifications.location_exists) as last_confirmation_at,
      max(verifications.created_at) filter (where not verifications.location_exists) as last_denial_at,
      count(*) filter (where verifications.location_exists)::integer as source_confirmation_count,
      count(*) filter (where not verifications.location_exists)::integer as source_denial_count,
      round(
        coalesce(sum(verifications.effective_weight) filter (where verifications.location_exists), 0),
        2
      )::numeric(6, 2) as source_weighted_confirmation_score,
      round(
        coalesce(sum(verifications.effective_weight) filter (where not verifications.location_exists), 0),
        2
      )::numeric(6, 2) as source_weighted_denial_score
    from raw_source_candidates raw_candidates
    left join public.bathroom_source_record_verifications verifications
      on verifications.source_record_id = raw_candidates.id
    group by raw_candidates.id
  ),
  source_candidate_base as (
    select
      'source_candidate'::text as listing_kind,
      null::uuid as bathroom_id,
      raw_candidates.id as source_record_id,
      raw_candidates.place_name,
      raw_candidates.address_line1,
      raw_candidates.city,
      raw_candidates.state,
      raw_candidates.postal_code,
      raw_candidates.country_code,
      raw_candidates.latitude,
      raw_candidates.longitude,
      raw_candidates.is_locked,
      raw_candidates.is_accessible,
      raw_candidates.is_customer_only,
      raw_candidates.accessibility_features,
      public.calculate_accessibility_score(
        raw_candidates.is_accessible,
        raw_candidates.accessibility_features
      ) as accessibility_score,
      raw_candidates.hours_json,
      null::uuid as code_id,
      null::numeric as confidence_score,
      null::integer as up_votes,
      null::integer as down_votes,
      null::timestamptz as last_verified_at,
      null::timestamptz as expires_at,
      null::numeric as cleanliness_avg,
      raw_candidates.updated_at,
      null::text as verification_badge_type,
      'public'::text as stallpass_access_tier,
      raw_candidates.show_on_free_map,
      false as is_business_location_verified,
      null::timestamptz as location_verified_at,
      0::integer as active_offer_count,
      raw_candidates.location_archetype,
      raw_candidates.archetype_metadata,
      null::text as code_policy,
      false as allow_user_code_submissions,
      false as has_official_code,
      null::timestamptz as owner_code_last_verified_at,
      null::text as official_access_instructions,
      raw_candidates.source_key as origin_source_key,
      public.get_bathroom_source_origin_label(raw_candidates.source_key) as origin_label,
      public.get_bathroom_source_origin_attribution(
        raw_candidates.source_key,
        raw_candidates.source_attribution_text,
        raw_candidates.source_dataset
      ) as origin_attribution_short,
      raw_candidates.source_dataset,
      raw_candidates.source_license_key,
      raw_candidates.source_url,
      raw_candidates.source_updated_at,
      rollup.source_last_verified_at,
      coalesce(rollup.source_confirmation_count, 0) as source_confirmation_count,
      coalesce(rollup.source_denial_count, 0) as source_denial_count,
      coalesce(rollup.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
      coalesce(rollup.source_weighted_denial_score, 0) as source_weighted_denial_score,
      case
        when coalesce(rollup.source_confirmation_count, 0) = 0
          and coalesce(rollup.source_denial_count, 0) = 0
          then 'unreviewed'::public.source_record_freshness_status_enum
        when coalesce(rollup.source_weighted_denial_score, 0) >= 3
          and coalesce(rollup.source_denial_count, 0) >= 2
          and rollup.last_denial_at >= now() - interval '45 days'
          and coalesce(rollup.source_weighted_denial_score, 0)
            >= coalesce(rollup.source_weighted_confirmation_score, 0) + 0.5
          then 'likely_removed'::public.source_record_freshness_status_enum
        when coalesce(rollup.source_weighted_confirmation_score, 0) > 0
          and coalesce(rollup.source_weighted_denial_score, 0) > 0
          and (
            abs(
              coalesce(rollup.source_weighted_confirmation_score, 0)
              - coalesce(rollup.source_weighted_denial_score, 0)
            ) <= 1.25
            or coalesce(rollup.source_denial_count, 0) >= 2
          )
          then 'disputed'::public.source_record_freshness_status_enum
        when rollup.source_last_verified_at >= now() - interval '45 days'
          and coalesce(rollup.source_weighted_confirmation_score, 0)
            >= greatest(coalesce(rollup.source_weighted_denial_score, 0), 1.0)
          then 'fresh'::public.source_record_freshness_status_enum
        else 'aging'::public.source_record_freshness_status_enum
      end as source_freshness_status,
      raw_candidates.distance_meters,
      case
        when raw_candidates.distance_meters is not null and raw_candidates.text_rank > 0 then
          (raw_candidates.text_rank / ln(greatest(raw_candidates.distance_meters, 1.0) / 100.0 + 2.0) * 100.0)::real
        when raw_candidates.text_rank > 0 then (raw_candidates.text_rank * 100.0)::real
        when raw_candidates.distance_meters is not null then
          (1.0 / ln(greatest(raw_candidates.distance_meters, 1.0) / 100.0 + 2.0) * 100.0)::real
        else 0.0::real
      end as search_signal_score
    from raw_source_candidates raw_candidates
    left join source_candidate_rollup rollup
      on rollup.source_record_id = raw_candidates.id
  ),
  source_candidates as (
    select
      source_candidate_base.*,
      source_candidate_base.source_freshness_status <> 'fresh'::public.source_record_freshness_status_enum
        as source_needs_review,
      false as can_favorite,
      false as can_submit_code,
      false as can_report_live_status,
      false as can_claim_business,
      public.calculate_directory_trust_score(
        'source_candidate',
        false,
        null,
        0,
        null,
        null,
        source_candidate_base.source_freshness_status,
        source_candidate_base.source_confirmation_count,
        source_candidate_base.source_denial_count,
        source_candidate_base.source_weighted_confirmation_score,
        source_candidate_base.source_weighted_denial_score,
        source_candidate_base.source_last_verified_at,
        source_candidate_base.source_updated_at
      ) as trust_score
    from source_candidate_base
    where source_candidate_base.source_freshness_status
      <> 'likely_removed'::public.source_record_freshness_status_enum
  ),
  directory_context as (
    select
      count(*) filter (where canonical_rows.trust_score >= 75)::integer as trusted_canonical_count,
      count(*)::integer as canonical_count
    from canonical_rows
  ),
  ranked_listings as (
    select
      canonical_rows.listing_kind,
      canonical_rows.bathroom_id,
      canonical_rows.source_record_id,
      canonical_rows.place_name,
      canonical_rows.address_line1,
      canonical_rows.city,
      canonical_rows.state,
      canonical_rows.postal_code,
      canonical_rows.country_code,
      canonical_rows.latitude,
      canonical_rows.longitude,
      canonical_rows.is_locked,
      canonical_rows.is_accessible,
      canonical_rows.is_customer_only,
      canonical_rows.accessibility_features,
      canonical_rows.accessibility_score,
      canonical_rows.hours_json,
      canonical_rows.code_id,
      canonical_rows.confidence_score,
      canonical_rows.up_votes,
      canonical_rows.down_votes,
      canonical_rows.last_verified_at,
      canonical_rows.expires_at,
      canonical_rows.cleanliness_avg,
      canonical_rows.updated_at,
      canonical_rows.verification_badge_type,
      canonical_rows.stallpass_access_tier,
      canonical_rows.show_on_free_map,
      canonical_rows.is_business_location_verified,
      canonical_rows.location_verified_at,
      canonical_rows.active_offer_count,
      canonical_rows.location_archetype,
      canonical_rows.archetype_metadata,
      canonical_rows.code_policy,
      canonical_rows.allow_user_code_submissions,
      canonical_rows.has_official_code,
      canonical_rows.owner_code_last_verified_at,
      canonical_rows.official_access_instructions,
      canonical_rows.origin_source_key,
      canonical_rows.origin_label,
      canonical_rows.origin_attribution_short,
      canonical_rows.source_dataset,
      canonical_rows.source_license_key,
      canonical_rows.source_url,
      canonical_rows.source_updated_at,
      canonical_rows.source_last_verified_at,
      canonical_rows.source_confirmation_count,
      canonical_rows.source_denial_count,
      canonical_rows.source_weighted_confirmation_score,
      canonical_rows.source_weighted_denial_score,
      canonical_rows.source_freshness_status,
      canonical_rows.source_needs_review,
      canonical_rows.can_favorite,
      canonical_rows.can_submit_code,
      canonical_rows.can_report_live_status,
      canonical_rows.can_claim_business,
      canonical_rows.distance_meters,
      case
        when (select query_text from normalized_query) is not null then
          (
            canonical_rows.search_signal_score
            + public.calculate_directory_text_match_bonus(
                canonical_rows.place_name,
                canonical_rows.address_line1,
                canonical_rows.city,
                canonical_rows.state,
                canonical_rows.postal_code,
                (select query_text from normalized_query)
              )
            + canonical_rows.trust_score * 0.25
          )::real
        else
          (
            canonical_rows.trust_score * 0.68
            + public.calculate_directory_distance_score(canonical_rows.distance_meters) * 0.32
          )::real
      end as rank
    from canonical_rows

    union all

    select
      source_candidates.listing_kind,
      source_candidates.bathroom_id,
      source_candidates.source_record_id,
      source_candidates.place_name,
      source_candidates.address_line1,
      source_candidates.city,
      source_candidates.state,
      source_candidates.postal_code,
      source_candidates.country_code,
      source_candidates.latitude,
      source_candidates.longitude,
      source_candidates.is_locked,
      source_candidates.is_accessible,
      source_candidates.is_customer_only,
      source_candidates.accessibility_features,
      source_candidates.accessibility_score,
      source_candidates.hours_json,
      source_candidates.code_id,
      source_candidates.confidence_score,
      source_candidates.up_votes,
      source_candidates.down_votes,
      source_candidates.last_verified_at,
      source_candidates.expires_at,
      source_candidates.cleanliness_avg,
      source_candidates.updated_at,
      source_candidates.verification_badge_type,
      source_candidates.stallpass_access_tier,
      source_candidates.show_on_free_map,
      source_candidates.is_business_location_verified,
      source_candidates.location_verified_at,
      source_candidates.active_offer_count,
      source_candidates.location_archetype,
      source_candidates.archetype_metadata,
      source_candidates.code_policy,
      source_candidates.allow_user_code_submissions,
      source_candidates.has_official_code,
      source_candidates.owner_code_last_verified_at,
      source_candidates.official_access_instructions,
      source_candidates.origin_source_key,
      source_candidates.origin_label,
      source_candidates.origin_attribution_short,
      source_candidates.source_dataset,
      source_candidates.source_license_key,
      source_candidates.source_url,
      source_candidates.source_updated_at,
      source_candidates.source_last_verified_at,
      source_candidates.source_confirmation_count,
      source_candidates.source_denial_count,
      source_candidates.source_weighted_confirmation_score,
      source_candidates.source_weighted_denial_score,
      source_candidates.source_freshness_status,
      source_candidates.source_needs_review,
      source_candidates.can_favorite,
      source_candidates.can_submit_code,
      source_candidates.can_report_live_status,
      source_candidates.can_claim_business,
      source_candidates.distance_meters,
      case
        when (select query_text from normalized_query) is not null then
          (
            source_candidates.search_signal_score
            + public.calculate_directory_text_match_bonus(
                source_candidates.place_name,
                source_candidates.address_line1,
                source_candidates.city,
                source_candidates.state,
                source_candidates.postal_code,
                (select query_text from normalized_query)
              )
            + source_candidates.trust_score * 0.22
            + public.calculate_directory_candidate_visibility_adjustment(directory_context.trusted_canonical_count)
          )::real
        else
          (
            source_candidates.trust_score * 0.60
            + public.calculate_directory_distance_score(source_candidates.distance_meters) * 0.40
            + public.calculate_directory_candidate_visibility_adjustment(directory_context.trusted_canonical_count)
          )::real
      end as rank
    from source_candidates
    cross join directory_context
  )
  select
    ranked_listings.listing_kind,
    ranked_listings.bathroom_id,
    ranked_listings.source_record_id,
    ranked_listings.place_name,
    ranked_listings.address_line1,
    ranked_listings.city,
    ranked_listings.state,
    ranked_listings.postal_code,
    ranked_listings.country_code,
    ranked_listings.latitude,
    ranked_listings.longitude,
    ranked_listings.is_locked,
    ranked_listings.is_accessible,
    ranked_listings.is_customer_only,
    ranked_listings.accessibility_features,
    ranked_listings.accessibility_score,
    ranked_listings.hours_json,
    ranked_listings.code_id,
    ranked_listings.confidence_score,
    ranked_listings.up_votes,
    ranked_listings.down_votes,
    ranked_listings.last_verified_at,
    ranked_listings.expires_at,
    ranked_listings.cleanliness_avg,
    ranked_listings.updated_at,
    ranked_listings.verification_badge_type,
    ranked_listings.stallpass_access_tier,
    ranked_listings.show_on_free_map,
    ranked_listings.is_business_location_verified,
    ranked_listings.location_verified_at,
    ranked_listings.active_offer_count,
    ranked_listings.location_archetype,
    ranked_listings.archetype_metadata,
    ranked_listings.code_policy,
    ranked_listings.allow_user_code_submissions,
    ranked_listings.has_official_code,
    ranked_listings.owner_code_last_verified_at,
    ranked_listings.official_access_instructions,
    ranked_listings.origin_source_key,
    ranked_listings.origin_label,
    ranked_listings.origin_attribution_short,
    ranked_listings.source_dataset,
    ranked_listings.source_license_key,
    ranked_listings.source_url,
    ranked_listings.source_updated_at,
    ranked_listings.source_last_verified_at,
    ranked_listings.source_confirmation_count,
    ranked_listings.source_denial_count,
    ranked_listings.source_weighted_confirmation_score,
    ranked_listings.source_weighted_denial_score,
    ranked_listings.source_freshness_status,
    ranked_listings.source_needs_review,
    ranked_listings.can_favorite,
    ranked_listings.can_submit_code,
    ranked_listings.can_report_live_status,
    ranked_listings.can_claim_business,
    ranked_listings.distance_meters,
    ranked_listings.rank
  from ranked_listings
  order by ranked_listings.rank desc, ranked_listings.distance_meters asc nulls last, ranked_listings.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 50))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_directory_listings(
  text,
  double precision,
  double precision,
  double precision,
  boolean,
  boolean,
  boolean,
  boolean,
  integer,
  integer
) from public;

grant execute on function public.search_directory_listings(
  text,
  double precision,
  double precision,
  double precision,
  boolean,
  boolean,
  boolean,
  boolean,
  integer,
  integer
) to anon, authenticated, service_role;
