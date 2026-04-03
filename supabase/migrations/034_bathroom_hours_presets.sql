-- ============================================================================
-- Enhanced Bathroom Hours with Presets & Google Places
-- 033_bathroom_hours_presets.sql
-- ============================================================================

-- Track how hours were sourced so the UI can show the right editor state
alter table public.bathrooms
  add column if not exists hours_source text not null default 'manual'
    check (hours_source in ('manual', 'google', 'preset_offset'));

-- Offset in minutes to subtract from closing time (negative = before close)
alter table public.bathrooms
  add column if not exists hours_offset_minutes integer default null;

-- Google Place ID for fetching hours from Google Places API
alter table public.bathrooms
  add column if not exists google_place_id text default null;

-- -------------------------------------------------------------------------
-- Update hours with source tracking
-- -------------------------------------------------------------------------
create or replace function public.update_business_bathroom_hours_v2(
  p_bathroom_id uuid,
  p_new_hours jsonb,
  p_hours_source text default 'manual',
  p_offset_minutes integer default null,
  p_google_place_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_hours jsonb;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if not user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'Forbidden: You do not manage this bathroom';
  end if;

  -- Capture old hours for audit trail
  select hours_json into v_old_hours
  from public.bathrooms
  where id = p_bathroom_id;

  -- Update bathroom record
  update public.bathrooms
  set hours_json = p_new_hours,
      hours_source = p_hours_source,
      hours_offset_minutes = p_offset_minutes,
      google_place_id = coalesce(p_google_place_id, google_place_id),
      updated_at = now()
  where id = p_bathroom_id;

  -- Log to audit trail
  insert into public.business_hours_updates (
    bathroom_id, updated_by, old_hours, new_hours, update_source
  )
  values (
    p_bathroom_id, v_user_id, v_old_hours, p_new_hours, p_hours_source
  );

  return jsonb_build_object(
    'success', true,
    'bathroom_id', p_bathroom_id,
    'hours_source', p_hours_source,
    'updated_at', now()
  );
end;
$$;

revoke all on function public.update_business_bathroom_hours_v2(uuid, jsonb, text, integer, text) from public;
grant execute on function public.update_business_bathroom_hours_v2(uuid, jsonb, text, integer, text) to authenticated;
