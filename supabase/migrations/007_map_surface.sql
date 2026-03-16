-- ============================================================================
-- Pee-Dom Map Surface
-- Adds cleanliness summaries to the public bathroom map/detail views.
-- ============================================================================

create or replace view public.v_bathroom_cleanliness_summary as
select
  cleanliness_ratings.bathroom_id,
  round(avg(cleanliness_ratings.rating)::numeric, 2) as cleanliness_avg,
  count(*)::integer as cleanliness_rating_count
from public.cleanliness_ratings
group by cleanliness_ratings.bathroom_id;

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
  bathrooms.updated_at
from public.bathrooms bathrooms
left join public.v_bathroom_code_summary code_summary
  on code_summary.bathroom_id = bathrooms.id
left join public.v_bathroom_cleanliness_summary cleanliness_summary
  on cleanliness_summary.bathroom_id = bathrooms.id
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
