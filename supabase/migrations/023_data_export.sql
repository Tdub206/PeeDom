-- ============================================================================
-- PeeDom GDPR data export
-- 023_data_export.sql
--
-- Right to data portability: users can download all personal data in JSON.
-- ============================================================================

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

  -- Profile
  select to_jsonb(p) - 'push_token' into v_profile
  from public.profiles p where p.id = v_user_id;

  -- Favorites
  select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb) into v_favorites
  from public.favorites f where f.user_id = v_user_id;

  -- Submitted bathrooms
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'place_name', b.place_name,
    'address_line1', b.address_line1, 'city', b.city, 'state', b.state,
    'latitude', b.latitude, 'longitude', b.longitude,
    'created_at', b.created_at
  )), '[]'::jsonb) into v_submitted_bathrooms
  from public.bathrooms b where b.created_by = v_user_id;

  -- Access codes (value excluded for security)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', ac.id, 'bathroom_id', ac.bathroom_id,
    'created_at', ac.created_at
  )), '[]'::jsonb) into v_access_codes
  from public.bathroom_access_codes ac where ac.submitted_by = v_user_id;

  -- Cleanliness ratings
  select coalesce(jsonb_agg(to_jsonb(cr)), '[]'::jsonb) into v_cleanliness_ratings
  from public.cleanliness_ratings cr where cr.user_id = v_user_id;

  -- Reports
  select coalesce(jsonb_agg(to_jsonb(br)), '[]'::jsonb) into v_reports
  from public.bathroom_reports br where br.reporter_id = v_user_id;

  -- Live status events
  select coalesce(jsonb_agg(to_jsonb(se)), '[]'::jsonb) into v_live_status_events
  from public.bathroom_status_events se where se.reported_by = v_user_id;

  -- Badges
  select coalesce(jsonb_agg(to_jsonb(ub)), '[]'::jsonb) into v_badges
  from public.user_badges ub where ub.user_id = v_user_id;

  -- Point events
  select coalesce(jsonb_agg(to_jsonb(pe)), '[]'::jsonb) into v_point_events
  from public.point_events pe where pe.user_id = v_user_id;

  -- Business claims
  select coalesce(jsonb_agg(to_jsonb(bc)), '[]'::jsonb) into v_business_claims
  from public.business_claims bc where bc.claimant_user_id = v_user_id;

  -- Accessibility preferences
  select coalesce(jsonb_agg(to_jsonb(uap)), '[]'::jsonb) into v_accessibility_prefs
  from public.user_accessibility_preferences uap where uap.user_id = v_user_id;

  -- Photos metadata
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

revoke all on function public.export_my_data() from public;
grant execute on function public.export_my_data() to authenticated;
