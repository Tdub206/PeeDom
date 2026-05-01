-- ============================================================================
-- StallPass Favorites & Profile Surface
-- 010_favorites_profile.sql
-- ============================================================================

-- ─── Favorites RPC ───────────────────────────────────────────────────────────

create or replace function public.get_user_favorites(
  p_user_lat double precision default null,
  p_user_lng double precision default null
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
  favorited_at     timestamptz
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
      when p_user_lat is not null and p_user_lng is not null then
        ST_Distance(
          bathrooms.geom,
          ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography
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

revoke all on function public.get_user_favorites(double precision, double precision) from public;
grant execute on function public.get_user_favorites(double precision, double precision) to authenticated, service_role;

-- ─── Display Name Update RPC ─────────────────────────────────────────────────

create or replace function public.update_display_name(
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_display_name text := trim(coalesce(p_display_name, ''));
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated'
    );
  end if;

  if char_length(normalized_display_name) < 2 then
    return jsonb_build_object(
      'success', false,
      'error', 'name_too_short'
    );
  end if;

  if char_length(normalized_display_name) > 50 then
    return jsonb_build_object(
      'success', false,
      'error', 'name_too_long'
    );
  end if;

  update public.profiles
  set display_name = normalized_display_name,
      updated_at = now()
  where id = auth.uid();

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'profile_not_found'
    );
  end if;

  return jsonb_build_object(
    'success', true
  );
end;
$$;

revoke all on function public.update_display_name(text) from public;
grant execute on function public.update_display_name(text) to authenticated, service_role;

-- ─── Public leaderboard preview ──────────────────────────────────────────────

grant execute on function public.get_contributor_leaderboard(text, text, text, text, integer)
  to anon, authenticated;
