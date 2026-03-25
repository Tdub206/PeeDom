-- ============================================================================
-- Favorites surface upgrade
-- Adds an atomic toggle RPC plus richer favorites reads for the Favorites tab
-- and global heart-state hydration.
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
  v_user_id uuid := auth.uid();
  v_existing_favorite_id uuid;
  v_action text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED: Must be authenticated to favorite a bathroom';
  end if;

  if not exists (
    select 1
    from public.bathrooms
    where id = p_bathroom_id
      and moderation_status = 'active'
  ) then
    raise exception 'NOT_FOUND: Bathroom does not exist or is not active';
  end if;

  select favorites.id
  into v_existing_favorite_id
  from public.favorites favorites
  where favorites.user_id = v_user_id
    and favorites.bathroom_id = p_bathroom_id
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
    'action', v_action,
    'bathroom_id', p_bathroom_id,
    'user_id', v_user_id,
    'toggled_at', now()
  );
end;
$$;

create or replace function public.get_favorites_with_detail(
  p_user_id uuid,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_sort_by text default 'date_added',
  p_limit integer default 50,
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
  distance_meters double precision,
  favorited_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_point geography;
  v_sort_by text := lower(coalesce(trim(p_sort_by), 'date_added'));
begin
  if v_user_id is null or v_user_id != p_user_id then
    raise exception 'AUTH_REQUIRED: Cannot access favorites for another user';
  end if;

  if p_latitude is not null and p_longitude is not null then
    v_point := st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography;
  end if;

  return query
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
    case
      when v_point is not null then st_distance(bathrooms.geom, v_point)
      else null::double precision
    end as distance_meters,
    favorites.created_at as favorited_at
  from public.favorites favorites
  join public.bathrooms bathrooms
    on bathrooms.id = favorites.bathroom_id
   and bathrooms.moderation_status = 'active'
  join public.v_bathroom_detail_public detail
    on detail.id = bathrooms.id
  where favorites.user_id = p_user_id
  order by
    case when v_sort_by = 'name' then lower(detail.place_name) end asc nulls last,
    case
      when v_sort_by = 'distance' and v_point is not null then
        st_distance(bathrooms.geom, v_point)
    end asc nulls last,
    favorites.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.get_favorite_ids(
  p_user_id uuid,
  p_bathroom_ids uuid[]
)
returns table (
  bathroom_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() != p_user_id then
    return;
  end if;

  return query
  select favorites.bathroom_id
  from public.favorites favorites
  where favorites.user_id = p_user_id
    and favorites.bathroom_id = any(p_bathroom_ids);
end;
$$;

revoke all on function public.toggle_favorite(uuid) from public;
revoke all on function public.get_favorites_with_detail(uuid, double precision, double precision, text, integer, integer) from public;
revoke all on function public.get_favorite_ids(uuid, uuid[]) from public;

grant execute on function public.toggle_favorite(uuid) to authenticated, service_role;
grant execute on function public.get_favorites_with_detail(uuid, double precision, double precision, text, integer, integer) to authenticated, service_role;
grant execute on function public.get_favorite_ids(uuid, uuid[]) to authenticated, service_role;

alter table public.favorites replica identity full;
