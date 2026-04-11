-- ============================================================================
-- Fix app-owned database functions flagged by `supabase db lint`
-- 039_fix_app_db_lint_functions.sql
-- ============================================================================

create or replace function public.grant_bathroom_code_reveal_access(
  p_bathroom_id uuid
)
returns table (
  id uuid,
  bathroom_id uuid,
  user_id uuid,
  grant_source text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  active_code record;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select
    codes.id,
    codes.expires_at
  into active_code
  from public.bathroom_access_codes codes
  where codes.bathroom_id = p_bathroom_id
    and codes.visibility_status = 'visible'
    and codes.lifecycle_status = 'active'
  order by codes.last_verified_at desc nulls last, codes.confidence_score desc
  limit 1;

  if active_code.id is null then
    raise exception 'CODE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  return query
  insert into public.code_reveal_grants as grants (
    bathroom_id,
    user_id,
    grant_source,
    expires_at
  )
  values (
    p_bathroom_id,
    auth.uid(),
    'rewarded_ad',
    public.compute_code_reveal_grant_expiry(active_code.expires_at)
  )
  on conflict on constraint code_reveal_grants_bathroom_id_user_id_key
  do update
  set
    grant_source = excluded.grant_source,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning
    grants.id,
    grants.bathroom_id,
    grants.user_id,
    grants.grant_source,
    grants.expires_at,
    grants.created_at,
    grants.updated_at;
end;
$$;

create or replace function public.calculate_code_confidence(
  p_up_votes bigint,
  p_down_votes bigint,
  p_last_verified_at timestamptz
)
returns numeric
language sql
stable
as $$
  select public.calculate_code_confidence(
    least(greatest(coalesce(p_up_votes, 0), 0), 2147483647)::integer,
    least(greatest(coalesce(p_down_votes, 0), 0), 2147483647)::integer,
    p_last_verified_at
  );
$$;

create or replace function public.delete_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_at timestamptz := now();
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated'
    );
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'profile_not_found'
    );
  end if;

  delete from public.push_subscriptions where user_id = v_user_id;
  delete from public.premium_arrival_alerts where user_id = v_user_id;
  delete from public.user_accessibility_preferences where user_id = v_user_id;
  delete from public.user_badges where user_id = v_user_id;
  delete from public.point_events where user_id = v_user_id;
  delete from public.favorites where user_id = v_user_id;
  delete from public.code_reveal_grants where user_id = v_user_id;
  delete from public.code_votes where user_id = v_user_id;

  update public.bathrooms
  set created_by = null
  where created_by = v_user_id;

  update public.bathroom_access_codes
  set submitted_by = null
  where submitted_by = v_user_id;

  update public.bathroom_photos
  set uploaded_by = null
  where uploaded_by = v_user_id;

  update public.bathroom_reports
  set reported_by = null
  where reported_by = v_user_id;

  update public.cleanliness_ratings
  set user_id = null
  where user_id = v_user_id;

  update public.bathroom_status_events
  set reported_by = null
  where reported_by = v_user_id;

  update public.business_hours_updates
  set updated_by = null
  where updated_by = v_user_id;

  delete from public.business_featured_placements
  where business_user_id = v_user_id;

  delete from public.business_verification_badges
  where claim_id in (
    select id from public.business_claims where claimant_user_id = v_user_id
  );

  delete from public.business_claims
  where claimant_user_id = v_user_id;

  delete from public.profiles
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'deleted_at', v_deleted_at
  );
end;
$$;

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_favorites jsonb;
  v_submitted_bathrooms jsonb;
  v_access_codes jsonb;
  v_cleanliness_ratings jsonb;
  v_reports jsonb;
  v_live_status_events jsonb;
  v_badges jsonb;
  v_point_events jsonb;
  v_business_claims jsonb;
  v_accessibility_prefs jsonb;
  v_photos jsonb;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select to_jsonb(p) - 'push_token' into v_profile
  from public.profiles p where p.id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) into v_favorites
  from public.favorites f where f.user_id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'place_name', b.place_name,
    'address_line1', b.address_line1, 'city', b.city, 'state', b.state,
    'latitude', b.latitude, 'longitude', b.longitude,
    'created_at', b.created_at
  )), '[]'::jsonb) into v_submitted_bathrooms
  from public.bathrooms b where b.created_by = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ac.id, 'bathroom_id', ac.bathroom_id,
    'created_at', ac.created_at
  )), '[]'::jsonb) into v_access_codes
  from public.bathroom_access_codes ac where ac.submitted_by = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(cr)), '[]'::jsonb) into v_cleanliness_ratings
  from public.cleanliness_ratings cr where cr.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(br)), '[]'::jsonb) into v_reports
  from public.bathroom_reports br where br.reported_by = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(se)), '[]'::jsonb) into v_live_status_events
  from public.bathroom_status_events se where se.reported_by = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(ub)), '[]'::jsonb) into v_badges
  from public.user_badges ub where ub.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(pe)), '[]'::jsonb) into v_point_events
  from public.point_events pe where pe.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(bc)), '[]'::jsonb) into v_business_claims
  from public.business_claims bc where bc.claimant_user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(uap)), '[]'::jsonb) into v_accessibility_prefs
  from public.user_accessibility_preferences uap where uap.user_id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', bp.id, 'bathroom_id', bp.bathroom_id,
    'content_type', bp.content_type, 'file_size_bytes', bp.file_size_bytes,
    'created_at', bp.created_at
  )), '[]'::jsonb) into v_photos
  from public.bathroom_photos bp where bp.uploaded_by = v_user_id;

  return jsonb_build_object(
    'success', true,
    'exported_at', now(),
    'data', jsonb_build_object(
      'profile', v_profile,
      'favorites', v_favorites,
      'submitted_bathrooms', v_submitted_bathrooms,
      'access_codes', v_access_codes,
      'cleanliness_ratings', v_cleanliness_ratings,
      'reports', v_reports,
      'live_status_events', v_live_status_events,
      'badges', v_badges,
      'point_events', v_point_events,
      'business_claims', v_business_claims,
      'accessibility_preferences', v_accessibility_prefs,
      'photos', v_photos
    )
  );
end;
$$;
