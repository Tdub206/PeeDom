-- ============================================================================
-- Business hours Google sync hardening
-- 038_business_hours_google_sync.sql
-- ============================================================================

alter table public.business_hours_updates
  drop constraint if exists business_hours_updates_update_source_check;

alter table public.business_hours_updates
  add constraint business_hours_updates_update_source_check
    check (
      update_source in (
        'business_dashboard',
        'admin_panel',
        'community_report',
        'manual',
        'google',
        'preset_offset'
      )
    );

create or replace function public.get_business_bathroom_hours_config(
  p_bathroom_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bathroom public.bathrooms%rowtype;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if not user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'Forbidden: You do not manage this bathroom';
  end if;

  select *
  into v_bathroom
  from public.bathrooms
  where id = p_bathroom_id;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'bathroom_id', v_bathroom.id,
    'place_name', v_bathroom.place_name,
    'hours_json', v_bathroom.hours_json,
    'hours_source', v_bathroom.hours_source,
    'hours_offset_minutes', v_bathroom.hours_offset_minutes,
    'google_place_id', v_bathroom.google_place_id,
    'updated_at', v_bathroom.updated_at
  );
end;
$$;

revoke all on function public.get_business_bathroom_hours_config(uuid) from public;
grant execute on function public.get_business_bathroom_hours_config(uuid) to authenticated;
