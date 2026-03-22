create extension if not exists postgis;

create index if not exists idx_bathrooms_geography
  on public.bathrooms
  using gist (geography(st_setsrid(st_makepoint(longitude, latitude), 4326)));

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

grant execute on function public.get_bathrooms_near(double precision, double precision, integer) to anon;
grant execute on function public.get_bathrooms_near(double precision, double precision, integer) to authenticated;

drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (
      select existing_profile.role
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
  );
