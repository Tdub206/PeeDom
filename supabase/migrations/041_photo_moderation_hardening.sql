-- ============================================================================
-- StallPass photo moderation hardening
-- 041_photo_moderation_hardening.sql
--
-- Aligns the database with the active app moderation contract:
-- approved | pending | rejected. New uploads stay pending until manually
-- reviewed instead of being auto-approved.
-- ============================================================================

update public.bathroom_photos
set moderation_status = 'pending',
    moderated_at = null
where moderation_status in ('pending_review', 'flagged');

alter table public.bathroom_photos
  alter column moderation_status set default 'pending';

alter table public.bathroom_photos
  drop constraint if exists bathroom_photos_moderation_status_check;

alter table public.bathroom_photos
  add constraint bathroom_photos_moderation_status_check
  check (moderation_status in ('approved', 'pending', 'rejected'));

drop index if exists idx_bathroom_photos_moderation;

create index if not exists idx_bathroom_photos_moderation
  on public.bathroom_photos (moderation_status)
  where moderation_status = 'pending';

create or replace function public.auto_moderate_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.moderation_status := 'pending';
  new.moderated_at := null;
  new.moderation_reason := null;
  return new;
end;
$$;

create or replace function public.moderate_photo(
  p_photo_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_role text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  select role into v_user_role
  from public.profiles
  where id = v_user_id;

  if v_user_role not in ('admin', 'moderator') then
    return jsonb_build_object('success', false, 'error', 'insufficient_permissions');
  end if;

  if p_status not in ('approved', 'pending', 'rejected') then
    return jsonb_build_object('success', false, 'error', 'invalid_status');
  end if;

  update public.bathroom_photos
  set moderation_status = p_status,
      moderated_at = case when p_status = 'pending' then null else now() end,
      moderation_reason = p_reason
  where id = p_photo_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'photo_not_found');
  end if;

  return jsonb_build_object('success', true);
end;
$$;
