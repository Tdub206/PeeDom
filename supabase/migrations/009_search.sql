-- ============================================================================
-- PeeDom Search Surface
-- 009_search.sql
-- ============================================================================

-- ─── Full-text search vector ────────────────────────────────────────────────

alter table public.bathrooms
  add column if not exists search_vector tsvector;

update public.bathrooms
set search_vector =
  setweight(to_tsvector('english', coalesce(place_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(address_line1, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(city, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(state, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(postal_code, '')), 'B')
where search_vector is null;

create index if not exists idx_bathrooms_search_vector
  on public.bathrooms using gin (search_vector);

create or replace function public.update_bathroom_search_vector()
returns trigger
language plpgsql
set search_path = public
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

drop trigger if exists bathroom_search_vector_update on public.bathrooms;

create trigger bathroom_search_vector_update
  before insert or update of place_name, address_line1, city, state, postal_code
  on public.bathrooms
  for each row
  execute function public.update_bathroom_search_vector();

-- ─── Search RPC ──────────────────────────────────────────────────────────────

create or replace function public.search_bathrooms(
  p_query    text,
  p_user_lat double precision default null,
  p_user_lng double precision default null,
  p_limit    integer default 40
)
returns table (
  id               uuid,
  place_name       text,
  address_line1    text,
  city             text,
  state            text,
  postal_code      text,
  country_code     text,
  latitude         double precision,
  longitude        double precision,
  is_locked        boolean,
  is_accessible    boolean,
  is_customer_only boolean,
  hours_json       jsonb,
  code_id          uuid,
  confidence_score numeric,
  up_votes         integer,
  down_votes       integer,
  last_verified_at timestamptz,
  expires_at       timestamptz,
  cleanliness_avg  numeric,
  updated_at       timestamptz,
  distance_meters  double precision,
  rank             real
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
          ST_Distance(
            b.geom,
            ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
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

-- ─── City browse ─────────────────────────────────────────────────────────────

create or replace function public.get_city_browse(p_limit integer default 30)
returns table (
  city text,
  state text,
  bathroom_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    city,
    state,
    count(*) as bathroom_count
  from public.bathrooms
  where moderation_status = 'active'
    and city is not null
    and state is not null
  group by city, state
  order by bathroom_count desc, city asc, state asc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;
