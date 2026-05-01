-- ============================================================================
-- StallPass photo moderation infrastructure
-- 021_photo_moderation.sql
--
-- Adds a moderation pipeline for user-uploaded bathroom photos.
-- New photos default to 'pending_review'. Only 'approved' photos are
-- visible to the public. Uploaders can always see their own photos.
-- ============================================================================

-- Add moderation columns to bathroom_photos
alter table public.bathroom_photos
  add column if not exists moderation_status text not null default 'pending_review',
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_reason text;

-- Constrain valid statuses
alter table public.bathroom_photos
  drop constraint if exists bathroom_photos_moderation_status_check;

alter table public.bathroom_photos
  add constraint bathroom_photos_moderation_status_check
  check (moderation_status in ('pending_review', 'approved', 'rejected', 'flagged'));

-- Index for moderation queue queries
create index if not exists idx_bathroom_photos_moderation
  on public.bathroom_photos(moderation_status)
  where moderation_status = 'pending_review';

-- ---------------------------------------------------------------
-- Update the select policy so only approved photos are public
-- ---------------------------------------------------------------
drop policy if exists "bathroom_photos_select_public_or_owner" on public.bathroom_photos;

create policy "bathroom_photos_select_public_or_owner"
  on public.bathroom_photos for select
  using (
    -- Uploaders can always see their own photos (including pending/rejected)
    auth.uid() = uploaded_by
    or (
      -- Public can only see approved photos on active bathrooms
      moderation_status = 'approved'
      and exists (
        select 1
        from public.bathrooms bathrooms
        where bathrooms.id = bathroom_id
          and bathrooms.moderation_status = 'active'
      )
    )
  );

-- ---------------------------------------------------------------
-- Auto-approve function (placeholder for external moderation)
-- In production, replace the body with a call to your moderation
-- service (e.g., AWS Rekognition, Google Cloud Vision Safety).
-- For now, auto-approves all photos so existing flow isn't broken,
-- but the infrastructure is in place for moderation review.
-- ---------------------------------------------------------------
create or replace function public.auto_moderate_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Placeholder: auto-approve for now.
  -- When a moderation API is integrated, this trigger should
  -- instead set moderation_status = 'pending_review' and fire
  -- an async webhook/edge function to perform NSFW detection.
  new.moderation_status := 'approved';
  new.moderated_at := now();
  return new;
end;
$$;

drop trigger if exists on_bathroom_photo_moderate on public.bathroom_photos;

create trigger on_bathroom_photo_moderate
  before insert on public.bathroom_photos
  for each row execute function public.auto_moderate_photo();

-- ---------------------------------------------------------------
-- Admin moderation function for manual review
-- ---------------------------------------------------------------
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

  if p_status not in ('approved', 'rejected', 'flagged') then
    return jsonb_build_object('success', false, 'error', 'invalid_status');
  end if;

  update public.bathroom_photos
  set moderation_status = p_status,
      moderated_at = now(),
      moderation_reason = p_reason
  where id = p_photo_id;

  if not found then
    return jsonb_build_object('success', false, 'error', 'photo_not_found');
  end if;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.moderate_photo(uuid, text, text) from public;
grant execute on function public.moderate_photo(uuid, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------
-- Backfill: approve all existing photos
-- ---------------------------------------------------------------
update public.bathroom_photos
set moderation_status = 'approved',
    moderated_at = now()
where moderation_status = 'pending_review';
