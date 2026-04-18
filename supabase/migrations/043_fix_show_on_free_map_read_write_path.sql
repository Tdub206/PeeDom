-- ============================================================================
-- Fix: align show_on_free_map read/write path
-- 043_fix_show_on_free_map_read_write_path.sql
-- ============================================================================
-- BUG: toggle_free_map_visibility writes to bathrooms.show_on_free_map, but
-- v_bathroom_detail_public (and therefore get_bathrooms_near / search_bathrooms)
-- reads from business_bathroom_settings.show_on_free_map. Toggling visibility
-- had no effect on map/search results.
--
-- FIX: Rewrite toggle_free_map_visibility to upsert into
-- business_bathroom_settings, and update get_business_dashboard_analytics to
-- read from the same table so the dashboard toggle shows the correct state.
-- ============================================================================

-- 1. Fix toggle_free_map_visibility to write to business_bathroom_settings
-- -------------------------------------------------------------------------
create or replace function public.toggle_free_map_visibility(
  p_bathroom_id uuid,
  p_show_on_free_map boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if not user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'Forbidden: You do not manage this bathroom';
  end if;

  insert into public.business_bathroom_settings (bathroom_id, show_on_free_map, updated_by, updated_at)
  values (p_bathroom_id, p_show_on_free_map, v_user_id, now())
  on conflict (bathroom_id)
  do update set
    show_on_free_map = excluded.show_on_free_map,
    updated_by       = excluded.updated_by,
    updated_at       = excluded.updated_at;

  return jsonb_build_object(
    'success', true,
    'bathroom_id', p_bathroom_id,
    'show_on_free_map', p_show_on_free_map
  );
end;
$$;

-- Permissions unchanged
revoke all on function public.toggle_free_map_visibility(uuid, boolean) from public;
grant execute on function public.toggle_free_map_visibility(uuid, boolean) to authenticated;


-- 2. Fix get_business_dashboard_analytics to read from business_bathroom_settings
-- -------------------------------------------------------------------------
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
  verification_badge_type text,
  has_verification_badge boolean,
  has_active_featured_placement boolean,
  active_featured_placements bigint,
  last_updated timestamptz,
  show_on_free_map boolean
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
    analytics.verification_badge_type,
    analytics.verification_badge_type is not null as has_verification_badge,
    analytics.has_active_featured_placement,
    analytics.active_featured_placements,
    analytics.last_data_update as last_updated,
    coalesce(settings.show_on_free_map, true) as show_on_free_map
  from public.mv_business_analytics analytics
  left join public.business_bathroom_settings settings
    on settings.bathroom_id = analytics.bathroom_id
  where analytics.owner_user_id = p_user_id
  order by analytics.last_data_update desc, analytics.place_name asc;
end;
$$;

revoke all on function public.get_business_dashboard_analytics(uuid) from public;
grant execute on function public.get_business_dashboard_analytics(uuid) to authenticated, service_role;


-- 3. Backfill: copy any existing bathrooms.show_on_free_map values into
--    business_bathroom_settings so previously-toggled bathrooms are not lost.
-- -------------------------------------------------------------------------
-- Reconcile ALL bathrooms where the toggle was previously used (wrote to
-- bathrooms.show_on_free_map).  The ON CONFLICT clause ensures rows that
-- already exist in business_bathroom_settings are updated to match.
insert into public.business_bathroom_settings (bathroom_id, show_on_free_map, updated_at)
select b.id, b.show_on_free_map, now()
from public.bathrooms b
where b.show_on_free_map is not null
on conflict (bathroom_id)
do update set
  show_on_free_map = excluded.show_on_free_map,
  updated_at       = excluded.updated_at;
