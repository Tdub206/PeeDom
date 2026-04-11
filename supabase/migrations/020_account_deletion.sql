-- ============================================================================
-- PeeDom account deletion (hard delete)
-- 020_account_deletion.sql
--
-- Google Play User Data policy requires apps that allow account creation to
-- offer full account deletion from within the app and from a web surface.
-- This migration adds delete_account() which purges personal data and
-- anonymizes contributions so community data integrity is preserved.
-- ============================================================================

-- ---------------------------------------------------------------
-- Step 0: Make contributor FK columns nullable and change from
-- CASCADE to SET NULL so community data survives user deletion.
-- ---------------------------------------------------------------

-- bathrooms.created_by
alter table public.bathrooms alter column created_by drop not null;
alter table public.bathrooms drop constraint if exists bathrooms_created_by_fkey;
alter table public.bathrooms
  add constraint bathrooms_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- bathroom_access_codes.submitted_by
alter table public.bathroom_access_codes alter column submitted_by drop not null;
alter table public.bathroom_access_codes drop constraint if exists bathroom_access_codes_submitted_by_fkey;
alter table public.bathroom_access_codes
  add constraint bathroom_access_codes_submitted_by_fkey
  foreign key (submitted_by) references public.profiles(id) on delete set null;

-- bathroom_photos.uploaded_by
alter table public.bathroom_photos alter column uploaded_by drop not null;
alter table public.bathroom_photos drop constraint if exists bathroom_photos_uploaded_by_fkey;
alter table public.bathroom_photos
  add constraint bathroom_photos_uploaded_by_fkey
  foreign key (uploaded_by) references public.profiles(id) on delete set null;

-- bathroom_reports.reported_by  (named reported_by in the schema)
alter table public.bathroom_reports alter column reported_by drop not null;
alter table public.bathroom_reports drop constraint if exists bathroom_reports_reported_by_fkey;
alter table public.bathroom_reports
  add constraint bathroom_reports_reported_by_fkey
  foreign key (reported_by) references public.profiles(id) on delete set null;

-- cleanliness_ratings.user_id
alter table public.cleanliness_ratings alter column user_id drop not null;
alter table public.cleanliness_ratings drop constraint if exists cleanliness_ratings_user_id_fkey;
alter table public.cleanliness_ratings
  add constraint cleanliness_ratings_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

-- bathroom_status_events.reported_by
alter table public.bathroom_status_events alter column reported_by drop not null;
alter table public.bathroom_status_events drop constraint if exists bathroom_status_events_reported_by_fkey;
alter table public.bathroom_status_events
  add constraint bathroom_status_events_reported_by_fkey
  foreign key (reported_by) references public.profiles(id) on delete set null;

-- business_hours_updates.updated_by
alter table public.business_hours_updates alter column updated_by drop not null;
alter table public.business_hours_updates drop constraint if exists business_hours_updates_updated_by_fkey;
alter table public.business_hours_updates
  add constraint business_hours_updates_updated_by_fkey
  foreign key (updated_by) references public.profiles(id) on delete set null;

-- ---------------------------------------------------------------

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

  -- Verify profile exists
  if not exists (select 1 from public.profiles where id = v_user_id) then
    return jsonb_build_object(
      'success', false,
      'error', 'profile_not_found'
    );
  end if;

  -- ---------------------------------------------------------------
  -- Phase 1: Delete user-specific rows (personal data)
  -- ---------------------------------------------------------------
  delete from public.push_subscriptions where user_id = v_user_id;
  delete from public.premium_arrival_alerts where user_id = v_user_id;
  delete from public.user_accessibility_preferences where user_id = v_user_id;
  delete from public.user_badges where user_id = v_user_id;
  delete from public.point_events where user_id = v_user_id;
  delete from public.favorites where user_id = v_user_id;
  delete from public.code_reveal_grants where user_id = v_user_id;
  delete from public.code_votes where voter_id = v_user_id;

  -- ---------------------------------------------------------------
  -- Phase 2: Anonymize contributions (preserve community data)
  -- ---------------------------------------------------------------
  -- Bathroom submissions: set created_by to null so the bathroom persists
  update public.bathrooms
  set created_by = null
  where created_by = v_user_id;

  -- Access codes: anonymize submitter
  update public.bathroom_access_codes
  set submitted_by = null
  where submitted_by = v_user_id;

  -- Photos: anonymize uploader
  update public.bathroom_photos
  set uploaded_by = null
  where uploaded_by = v_user_id;

  -- Reports: anonymize reporter
  update public.bathroom_reports
  set reported_by = null
  where reported_by = v_user_id;

  -- Cleanliness ratings: anonymize
  update public.cleanliness_ratings
  set user_id = null
  where user_id = v_user_id;

  -- Live status events: anonymize
  update public.bathroom_status_events
  set reported_by = null
  where reported_by = v_user_id;

  -- Business hours updates: anonymize
  update public.business_hours_updates
  set updated_by = null
  where updated_by = v_user_id;

  -- ---------------------------------------------------------------
  -- Phase 3: Remove business claims and related data
  -- ---------------------------------------------------------------
  -- Delete featured placements owned by this user
  delete from public.business_featured_placements
  where business_user_id = v_user_id;

  -- Delete verification badges tied to this user's claims
  delete from public.business_verification_badges
  where claim_id in (
    select id from public.business_claims where claimant_user_id = v_user_id
  );

  -- Delete business claims
  delete from public.business_claims
  where claimant_user_id = v_user_id;

  -- ---------------------------------------------------------------
  -- Phase 4: Delete profile (personal data)
  -- ---------------------------------------------------------------
  delete from public.profiles
  where id = v_user_id;

  -- ---------------------------------------------------------------
  -- Phase 5: Delete auth user via Supabase admin API
  -- Note: This requires the function to run as security definer.
  -- The auth.users row deletion is handled by the calling client
  -- via supabase.auth.admin.deleteUser() in the Edge Function,
  -- since plpgsql cannot directly delete from auth.users.
  -- ---------------------------------------------------------------

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'deleted_at', v_deleted_at
  );
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated, service_role;
