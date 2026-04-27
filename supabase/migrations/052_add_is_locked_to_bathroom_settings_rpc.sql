-- ============================================================================
-- 052_add_is_locked_to_bathroom_settings_rpc.sql
-- Adds p_is_locked parameter to upsert_business_bathroom_settings so business
-- owners can toggle the "Require access code" flag from the dashboard.
-- The flag propagates directly to bathrooms.is_locked within the same call.
-- ============================================================================

-- Drop the 4-parameter signature so Postgres allows us to add the 5th param.
drop function if exists public.upsert_business_bathroom_settings(uuid, boolean, boolean, boolean);

create or replace function public.upsert_business_bathroom_settings(
  p_bathroom_id uuid,
  p_requires_premium_access boolean default false,
  p_show_on_free_map boolean default false,
  p_is_location_verified boolean default false,
  p_is_locked boolean default false
)
returns setof public.business_bathroom_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_verified_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'BUSINESS_ACCESS_REQUIRED';
  end if;

  update public.bathrooms
  set is_locked = p_is_locked
  where id = p_bathroom_id;

  select settings.location_verified_at
  into v_existing_verified_at
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;

  insert into public.business_bathroom_settings (
    bathroom_id,
    requires_premium_access,
    show_on_free_map,
    is_location_verified,
    location_verified_at,
    updated_by
  )
  values (
    p_bathroom_id,
    p_requires_premium_access,
    case when p_requires_premium_access then p_show_on_free_map else true end,
    p_is_location_verified,
    case
      when p_is_location_verified then coalesce(v_existing_verified_at, now())
      else null
    end,
    v_user_id
  )
  on conflict (bathroom_id) do update
  set
    requires_premium_access = excluded.requires_premium_access,
    show_on_free_map = excluded.show_on_free_map,
    is_location_verified = excluded.is_location_verified,
    location_verified_at = excluded.location_verified_at,
    updated_by = excluded.updated_by;

  perform public.sync_business_verification_badge_state(p_bathroom_id);

  return query
  select settings.*
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;
end;
$$;

revoke all on function public.upsert_business_bathroom_settings(uuid, boolean, boolean, boolean, boolean) from public;
grant execute on function public.upsert_business_bathroom_settings(uuid, boolean, boolean, boolean, boolean) to authenticated, service_role;
