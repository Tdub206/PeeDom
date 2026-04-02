-- ============================================================================
-- Fix: include show_on_free_map in get_business_dashboard_analytics
-- 035_fix_dashboard_show_on_free_map.sql
-- ============================================================================
-- The original function joined only mv_business_analytics which was created
-- before the show_on_free_map column existed (migration 031). We recreate the
-- function here to join bathrooms directly and expose the column so the
-- business dashboard can render FreeMapToggle with the correct initial value.

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
    coalesce(bathrooms.show_on_free_map, true) as show_on_free_map
  from public.mv_business_analytics analytics
  join public.bathrooms bathrooms
    on bathrooms.id = analytics.bathroom_id
  where analytics.owner_user_id = p_user_id
  order by analytics.last_data_update desc, analytics.place_name asc;
end;
$$;

revoke all on function public.get_business_dashboard_analytics(uuid) from public;
grant execute on function public.get_business_dashboard_analytics(uuid) to authenticated, service_role;
