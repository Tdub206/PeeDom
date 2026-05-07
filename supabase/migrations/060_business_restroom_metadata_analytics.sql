-- ============================================================================
-- 060_business_restroom_metadata_analytics.sql
-- Restores the full business dashboard analytics contract after the legacy
-- show_on_free_map patch and adds a controlled business-owner metadata RPC.
-- ============================================================================

drop function if exists public.get_business_dashboard_analytics(uuid);

create or replace function public.get_business_dashboard_analytics(
  p_user_id uuid
)
returns table (
  bathroom_id uuid,
  claim_id uuid,
  place_name text,
  business_name text,
  total_favorites bigint,
  open_reports bigint,
  avg_cleanliness numeric,
  total_ratings bigint,
  weekly_views bigint,
  weekly_unique_visitors bigint,
  monthly_unique_visitors bigint,
  weekly_navigation_count bigint,
  verification_badge_type text,
  has_verification_badge boolean,
  has_active_featured_placement boolean,
  active_featured_placements bigint,
  active_offer_count bigint,
  requires_premium_access boolean,
  show_on_free_map boolean,
  is_location_verified boolean,
  location_verified_at timestamptz,
  pricing_plan text,
  last_updated timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_current_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select exists (
    select 1
    from public.profiles profiles
    where profiles.id = v_current_user_id
      and profiles.role = 'admin'
  ) into v_is_admin;

  if v_current_user_id <> p_user_id and not v_is_admin then
    raise exception 'Unauthorized: You can only access your own business analytics';
  end if;

  if not public.user_has_business_dashboard_access(p_user_id) then
    raise exception 'Unauthorized: User does not have business access';
  end if;

  return query
  select
    analytics.bathroom_id,
    analytics.claim_id,
    analytics.place_name,
    analytics.business_name,
    analytics.total_favorites,
    analytics.open_reports,
    analytics.avg_cleanliness_rating as avg_cleanliness,
    analytics.total_ratings,
    analytics.weekly_views,
    analytics.weekly_unique_visitors,
    analytics.monthly_unique_visitors,
    analytics.weekly_navigation_count,
    analytics.verification_badge_type,
    analytics.has_verification_badge,
    analytics.has_active_featured_placement,
    analytics.active_featured_placements,
    analytics.active_offer_count,
    coalesce(settings.requires_premium_access, analytics.requires_premium_access, false) as requires_premium_access,
    coalesce(settings.show_on_free_map, analytics.show_on_free_map, true) as show_on_free_map,
    coalesce(settings.is_location_verified, analytics.is_location_verified, false) as is_location_verified,
    coalesce(settings.location_verified_at, analytics.location_verified_at) as location_verified_at,
    coalesce(settings.pricing_plan, analytics.pricing_plan, 'standard') as pricing_plan,
    greatest(
      analytics.last_data_update,
      coalesce(settings.updated_at, analytics.last_data_update)
    ) as last_updated
  from public.mv_business_analytics analytics
  left join public.business_bathroom_settings settings
    on settings.bathroom_id = analytics.bathroom_id
  where analytics.owner_user_id = p_user_id
  order by greatest(
    analytics.last_data_update,
    coalesce(settings.updated_at, analytics.last_data_update)
  ) desc, analytics.place_name asc;
end;
$$;

revoke all on function public.get_business_dashboard_analytics(uuid) from public;
grant execute on function public.get_business_dashboard_analytics(uuid) to authenticated, service_role;

create or replace function public.upsert_business_restroom_metadata(
  p_bathroom_id uuid,
  p_has_toilet_paper boolean default null,
  p_has_soap boolean default null,
  p_has_hand_dryer boolean default null,
  p_has_paper_towels boolean default null,
  p_has_changing_table boolean default null,
  p_has_family_restroom boolean default null,
  p_is_gender_neutral boolean default null,
  p_is_single_user boolean default null,
  p_is_private_room boolean default null,
  p_stall_count integer default null,
  p_privacy_level text default null,
  p_access_type text default null,
  p_code_required boolean default null,
  p_key_required boolean default null,
  p_customer_only boolean default null,
  p_ask_employee boolean default null,
  p_medical_urgency_friendly boolean default null,
  p_child_friendly boolean default null,
  p_outdoor_traveler_reliable boolean default null,
  p_wheelchair_accessible boolean default null,
  p_door_clear_width_inches numeric default null,
  p_turning_space_inches numeric default null,
  p_stall_width_inches numeric default null,
  p_stall_depth_inches numeric default null,
  p_has_grab_bars boolean default null,
  p_has_accessible_sink boolean default null,
  p_has_step_free_access boolean default null,
  p_has_power_door boolean default null,
  p_accessibility_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_claim_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select claims.id
  into v_claim_id
  from public.business_claims claims
  where claims.bathroom_id = p_bathroom_id
    and claims.claimant_user_id = v_user_id
    and claims.review_status = 'approved'
  order by claims.reviewed_at desc nulls last, claims.created_at desc
  limit 1;

  if v_claim_id is null and not public.is_admin_user(v_user_id) then
    raise exception 'BUSINESS_ACCESS_REQUIRED';
  end if;

  insert into public.bathroom_need_metadata (
    bathroom_id,
    has_toilet_paper,
    has_soap,
    has_hand_dryer,
    has_paper_towels,
    has_changing_table,
    has_family_restroom,
    is_gender_neutral,
    is_single_user,
    is_private_room,
    stall_count,
    privacy_level,
    access_type,
    code_required,
    key_required,
    customer_only,
    ask_employee,
    medical_urgency_friendly,
    child_friendly,
    outdoor_traveler_reliable
  )
  values (
    p_bathroom_id,
    p_has_toilet_paper,
    p_has_soap,
    p_has_hand_dryer,
    p_has_paper_towels,
    p_has_changing_table,
    p_has_family_restroom,
    p_is_gender_neutral,
    p_is_single_user,
    p_is_private_room,
    p_stall_count,
    p_privacy_level,
    p_access_type,
    p_code_required,
    p_key_required,
    p_customer_only,
    p_ask_employee,
    p_medical_urgency_friendly,
    p_child_friendly,
    p_outdoor_traveler_reliable
  )
  on conflict (bathroom_id) do update
  set
    has_toilet_paper = excluded.has_toilet_paper,
    has_soap = excluded.has_soap,
    has_hand_dryer = excluded.has_hand_dryer,
    has_paper_towels = excluded.has_paper_towels,
    has_changing_table = excluded.has_changing_table,
    has_family_restroom = excluded.has_family_restroom,
    is_gender_neutral = excluded.is_gender_neutral,
    is_single_user = excluded.is_single_user,
    is_private_room = excluded.is_private_room,
    stall_count = excluded.stall_count,
    privacy_level = excluded.privacy_level,
    access_type = excluded.access_type,
    code_required = excluded.code_required,
    key_required = excluded.key_required,
    customer_only = excluded.customer_only,
    ask_employee = excluded.ask_employee,
    medical_urgency_friendly = excluded.medical_urgency_friendly,
    child_friendly = excluded.child_friendly,
    outdoor_traveler_reliable = excluded.outdoor_traveler_reliable;

  insert into public.bathroom_accessibility_details (
    bathroom_id,
    wheelchair_accessible,
    door_clear_width_inches,
    turning_space_inches,
    stall_width_inches,
    stall_depth_inches,
    has_grab_bars,
    has_accessible_sink,
    has_step_free_access,
    has_power_door,
    notes
  )
  values (
    p_bathroom_id,
    p_wheelchair_accessible,
    p_door_clear_width_inches,
    p_turning_space_inches,
    p_stall_width_inches,
    p_stall_depth_inches,
    p_has_grab_bars,
    p_has_accessible_sink,
    p_has_step_free_access,
    p_has_power_door,
    nullif(trim(coalesce(p_accessibility_notes, '')), '')
  )
  on conflict (bathroom_id) do update
  set
    wheelchair_accessible = excluded.wheelchair_accessible,
    door_clear_width_inches = excluded.door_clear_width_inches,
    turning_space_inches = excluded.turning_space_inches,
    stall_width_inches = excluded.stall_width_inches,
    stall_depth_inches = excluded.stall_depth_inches,
    has_grab_bars = excluded.has_grab_bars,
    has_accessible_sink = excluded.has_accessible_sink,
    has_step_free_access = excluded.has_step_free_access,
    has_power_door = excluded.has_power_door,
    notes = excluded.notes;

  insert into public.bathroom_attribute_confirmations (
    bathroom_id,
    field_name,
    field_value_snapshot,
    source_type,
    source_user_id,
    business_id,
    confidence_score,
    last_confirmed_at,
    notes
  )
  select
    p_bathroom_id,
    fields.field_name,
    jsonb_build_object('value', fields.field_value),
    'business_verified',
    v_user_id,
    null,
    0.9500,
    now(),
    'Verified from StallPass Business Hub'
  from (
    values
      ('access_type', to_jsonb(p_access_type)),
      ('has_toilet_paper', to_jsonb(p_has_toilet_paper)),
      ('has_soap', to_jsonb(p_has_soap)),
      ('has_hand_dryer', to_jsonb(p_has_hand_dryer)),
      ('has_paper_towels', to_jsonb(p_has_paper_towels)),
      ('has_changing_table', to_jsonb(p_has_changing_table)),
      ('has_family_restroom', to_jsonb(p_has_family_restroom)),
      ('is_gender_neutral', to_jsonb(p_is_gender_neutral)),
      ('is_single_user', to_jsonb(p_is_single_user)),
      ('is_private_room', to_jsonb(p_is_private_room)),
      ('stall_count', to_jsonb(p_stall_count)),
      ('privacy_level', to_jsonb(p_privacy_level)),
      ('medical_urgency_friendly', to_jsonb(p_medical_urgency_friendly)),
      ('child_friendly', to_jsonb(p_child_friendly))
  ) as fields(field_name, field_value)
  where fields.field_value is not null
    and fields.field_value <> 'null'::jsonb
    and not (
      fields.field_name in ('access_type', 'privacy_level')
      and fields.field_value = '"unknown"'::jsonb
    );

  return jsonb_build_object(
    'bathroom_id', p_bathroom_id,
    'claim_id', v_claim_id,
    'updated_at', now()
  );
end;
$$;

revoke all on function public.upsert_business_restroom_metadata(
  uuid,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  integer,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  numeric,
  numeric,
  numeric,
  numeric,
  boolean,
  boolean,
  boolean,
  boolean,
  text
) from public;

grant execute on function public.upsert_business_restroom_metadata(
  uuid,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  integer,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  boolean,
  numeric,
  numeric,
  numeric,
  numeric,
  boolean,
  boolean,
  boolean,
  boolean,
  text
) to authenticated, service_role;
