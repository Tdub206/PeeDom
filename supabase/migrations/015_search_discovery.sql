-- ============================================================================
-- Search discovery upgrade
-- Extends the existing search RPC with geo filters, feature filters, and
-- typeahead suggestions without introducing a second search surface.
-- ============================================================================

create index if not exists idx_bathrooms_search_vector
  on public.bathrooms using gin (search_vector);

drop function if exists public.search_bathrooms(text, double precision, double precision, integer);

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
    c.hours_json,
    c.code_id,
    c.confidence_score,
    c.up_votes,
    c.down_votes,
    c.last_verified_at,
    c.expires_at,
    c.cleanliness_avg,
    c.updated_at,
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

create or replace function public.get_search_suggestions(
  p_query text,
  p_user_lat double precision default null,
  p_user_lng double precision default null,
  p_limit integer default 8
)
returns table (
  bathroom_id uuid,
  place_name text,
  city text,
  state text,
  distance_meters double precision
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
  )
  select
    b.id as bathroom_id,
    b.place_name,
    b.city,
    b.state,
    case
      when g.ref_point is not null then st_distance(b.geom, g.ref_point)
      else null::double precision
    end as distance_meters
  from public.bathrooms b
  cross join geography_input g
  cross join parsed_query pq
  where b.moderation_status = 'active'
    and pq.q is not null
    and b.search_vector @@ pq.q
    and (
      g.ref_point is null
      or st_dwithin(b.geom, g.ref_point, 25000)
    )
  order by
    ts_rank_cd(b.search_vector, pq.q) desc,
    case when g.ref_point is not null then st_distance(b.geom, g.ref_point) end asc nulls last,
    b.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 8), 8));
$$;

grant execute on function public.search_bathrooms(
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
) to anon, authenticated;

grant execute on function public.get_search_suggestions(
  text,
  double precision,
  double precision,
  integer
) to anon, authenticated;
