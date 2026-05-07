-- ============================================================================
-- Business portal review hardening
-- 038_business_portal_review_hardening.sql
-- Fixes authorization, public visibility, and redemption race conditions
-- identified during PR review.
-- ============================================================================

create or replace function public.get_business_visit_stats(
  p_user_id uuid
)
returns table (
  bathroom_id uuid,
  total_visits bigint,
  visits_this_week bigint,
  visits_this_month bigint,
  unique_visitors bigint,
  top_source text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_viewer_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select exists (
    select 1
    from public.profiles profiles
    where profiles.id = v_viewer_id
      and profiles.role = 'admin'
  )
  into v_is_admin;

  if p_user_id is distinct from v_viewer_id and not v_is_admin then
    raise exception 'Forbidden: You can only access your own visit analytics';
  end if;

  return query
    select
      visits.bathroom_id,
      count(*) as total_visits,
      count(*) filter (where visits.visited_at > now() - interval '7 days') as visits_this_week,
      count(*) filter (where visits.visited_at > now() - interval '30 days') as visits_this_month,
      count(distinct visits.user_id) as unique_visitors,
      (
        select visit_sources.source
        from public.bathroom_stallpass_visits visit_sources
        where visit_sources.bathroom_id = visits.bathroom_id
        group by visit_sources.source
        order by count(*) desc, visit_sources.source asc
        limit 1
      ) as top_source
    from public.bathroom_stallpass_visits visits
    where exists (
      select 1
      from public.business_claims claims
      where claims.bathroom_id = visits.bathroom_id
        and claims.claimant_user_id = p_user_id
        and claims.review_status = 'approved'
    )
    group by visits.bathroom_id;
end;
$$;

create or replace function public.redeem_coupon(
  p_coupon_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_coupon public.business_coupons%rowtype;
  v_redemption_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select *
  into v_coupon
  from public.business_coupons
  where id = p_coupon_id
  for update;

  if v_coupon is null then
    raise exception 'Coupon not found';
  end if;

  if not v_coupon.is_active then
    raise exception 'This coupon is no longer active';
  end if;

  if v_coupon.starts_at > now() then
    raise exception 'This coupon is not available yet';
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    raise exception 'This coupon has expired';
  end if;

  if v_coupon.max_redemptions is not null
     and v_coupon.current_redemptions >= v_coupon.max_redemptions then
    raise exception 'This coupon has reached its redemption limit';
  end if;

  if v_coupon.premium_only then
    if not exists (
      select 1
      from public.profiles profiles
      where profiles.id = v_user_id
        and profiles.is_premium = true
        and (profiles.premium_expires_at is null or profiles.premium_expires_at > now())
    ) then
      raise exception 'This coupon is only available to StallPass Premium members';
    end if;
  end if;

  begin
    insert into public.coupon_redemptions (coupon_id, user_id)
    values (p_coupon_id, v_user_id)
    returning id into v_redemption_id;
  exception
    when unique_violation then
      raise exception 'You have already redeemed this coupon';
  end;

  update public.business_coupons
  set current_redemptions = current_redemptions + 1,
      updated_at = now()
  where id = p_coupon_id;

  perform public.record_stallpass_visit(v_coupon.bathroom_id, 'coupon_redeem');

  return jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'coupon_code', v_coupon.coupon_code,
    'title', v_coupon.title
  );
end;
$$;

create or replace function public.redeem_early_adopter_invite(
  p_invite_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.early_adopter_invites%rowtype;
  v_redeemed_invite_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select *
  into v_invite
  from public.early_adopter_invites
  where invite_token = upper(trim(p_invite_token));

  if v_invite is null then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.status = 'redeemed' then
    raise exception 'This invite has already been used';
  end if;

  if v_invite.status = 'expired' or v_invite.expires_at < now() then
    update public.early_adopter_invites
    set status = 'expired'
    where id = v_invite.id and status = 'pending';

    raise exception 'This invite has expired';
  end if;

  if v_invite.status = 'revoked' then
    raise exception 'This invite has been revoked';
  end if;

  update public.early_adopter_invites
  set status = 'redeemed',
      redeemed_by = v_user_id,
      redeemed_at = now()
  where id = v_invite.id
    and status = 'pending'
    and redeemed_by is null
    and redeemed_at is null
    and expires_at >= now()
  returning id into v_redeemed_invite_id;

  if v_redeemed_invite_id is null then
    raise exception 'This invite has already been used';
  end if;

  update public.business_claims
  set is_lifetime_free = true,
      invite_id = v_invite.id
  where claimant_user_id = v_user_id
    and review_status = 'approved';

  update public.profiles
  set role = 'business',
      updated_at = now()
  where id = v_user_id
    and role = 'user';

  return jsonb_build_object(
    'success', true,
    'invite_id', v_redeemed_invite_id,
    'is_lifetime_free', true,
    'message', 'Welcome to StallPass! Your business account is now lifetime-free.'
  );
end;
$$;

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
  distance_meters double precision
)
language sql
stable
as $$
  with viewer_flags as (
    select public.viewer_has_active_premium() as has_active_premium
  )
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
    st_distancesphere(
      st_makepoint(details.longitude, details.latitude),
      st_makepoint(lng, lat)
    ) as distance_meters
  from public.v_bathroom_detail_public details
  cross join viewer_flags flags
  where st_dwithin(
    geography(st_setsrid(st_makepoint(details.longitude, details.latitude), 4326)),
    geography(st_setsrid(st_makepoint(lng, lat), 4326)),
    radius_m
  )
    and (
      details.stallpass_access_tier = 'public'
      or coalesce(details.show_on_free_map, true)
      or flags.has_active_premium
    )
  order by distance_meters asc, details.updated_at desc;
$$;

drop function if exists public.search_bathrooms(text, double precision, double precision, double precision, boolean, boolean, boolean, boolean, integer, integer);

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
  viewer_flags as (
    select public.viewer_has_active_premium() as has_active_premium
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
      case
        when geography_input.ref_point is not null then st_distance(bathrooms.geom, geography_input.ref_point)
        else null::double precision
      end as distance_meters,
      case
        when parsed_query.q is not null then ts_rank_cd(bathrooms.search_vector, parsed_query.q)
        else 0.0::real
      end as text_rank
    from public.bathrooms bathrooms
    join public.v_bathroom_detail_public details
      on details.id = bathrooms.id
    cross join geography_input
    cross join parsed_query
    cross join viewer_flags
    where bathrooms.moderation_status = 'active'
      and (
        parsed_query.q is not null
        or geography_input.ref_point is not null
      )
      and (
        parsed_query.q is null
        or bathrooms.search_vector @@ parsed_query.q
      )
      and (
        geography_input.ref_point is null
        or st_dwithin(
          bathrooms.geom,
          geography_input.ref_point,
          greatest(coalesce(p_radius_meters, 8047), 250)
        )
      )
      and (p_is_accessible is null or details.is_accessible = p_is_accessible)
      and (p_is_locked is null or details.is_locked = p_is_locked)
      and (p_is_customer_only is null or details.is_customer_only = p_is_customer_only)
      and (
        p_has_code is null
        or (p_has_code = true and details.code_id is not null)
        or (p_has_code = false and details.code_id is null)
      )
      and (
        details.stallpass_access_tier = 'public'
        or coalesce(details.show_on_free_map, true)
        or viewer_flags.has_active_premium
      )
  )
  select
    candidates.id,
    candidates.place_name,
    candidates.address_line1,
    candidates.city,
    candidates.state,
    candidates.postal_code,
    candidates.country_code,
    candidates.latitude,
    candidates.longitude,
    candidates.is_locked,
    candidates.is_accessible,
    candidates.is_customer_only,
    candidates.hours_json,
    candidates.code_id,
    candidates.confidence_score,
    candidates.up_votes,
    candidates.down_votes,
    candidates.last_verified_at,
    candidates.expires_at,
    candidates.cleanliness_avg,
    candidates.updated_at,
    candidates.distance_meters,
    case
      when candidates.distance_meters is not null and candidates.text_rank > 0 then
        (candidates.text_rank / ln(greatest(candidates.distance_meters, 1.0) / 100.0 + 2.0))::real
      when candidates.text_rank > 0 then candidates.text_rank::real
      when candidates.distance_meters is not null then
        (1.0 / ln(greatest(candidates.distance_meters, 1.0) / 100.0 + 2.0))::real
      else 0.0::real
    end as rank
  from candidate_rows candidates
  order by
    rank desc,
    candidates.distance_meters asc nulls last,
    candidates.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 50))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.get_business_visit_stats(uuid) from public;
grant execute on function public.get_business_visit_stats(uuid) to authenticated;

revoke all on function public.redeem_coupon(uuid) from public;
grant execute on function public.redeem_coupon(uuid) to authenticated;

revoke all on function public.redeem_early_adopter_invite(text) from public;
grant execute on function public.redeem_early_adopter_invite(text) to authenticated;

revoke all on function public.get_bathrooms_near(double precision, double precision, integer) from public;
grant execute on function public.get_bathrooms_near(double precision, double precision, integer) to anon, authenticated;

revoke all on function public.search_bathrooms(text, double precision, double precision, double precision, boolean, boolean, boolean, boolean, integer, integer) from public;
grant execute on function public.search_bathrooms(text, double precision, double precision, double precision, boolean, boolean, boolean, boolean, integer, integer) to anon, authenticated;
