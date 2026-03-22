-- ============================================================================
-- PeeDom bathroom report deduplication
-- 020_bathroom_report_dedup.sql
--
-- Adds a partial unique index to close the TOCTOU race in
-- create_bathroom_report(): two concurrent callers can both pass the
-- pre-insert EXISTS check and produce duplicate open reports for the same
-- (user, bathroom, report_type).
--
-- The fix moves enforcement to the database: a partial unique index covers
-- only rows in 'open' or 'reviewing' status, so resolved/dismissed rows
-- don't block re-reports.  The function now catches the unique_violation
-- (23505) instead of doing a pre-check.
--
-- Depends on:
--   001_foundation_schema.sql  – bathroom_reports table
--   019_deactivated_user_guard.sql – assert_active_user() helper
-- ============================================================================

-- ── Precheck: remove existing duplicate open/reviewing reports ────────────────
-- For each (reported_by, bathroom_id, report_type) group, keep the newest row
-- and delete the rest.  Without this step, CREATE UNIQUE INDEX fails when the
-- table already contains duplicates.
delete from public.bathroom_reports
where id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by reported_by, bathroom_id, report_type
        order by created_at desc
      ) as rn
    from public.bathroom_reports
    where status in ('open', 'reviewing')
  ) ranked
  where rn > 1
);

-- Only one open/reviewing report per (user, bathroom, report_type) is allowed.
-- Resolved or dismissed rows are intentionally excluded so users can re-report
-- a previously-closed issue.
create unique index if not exists uq_reports_open_per_user_type
  on public.bathroom_reports (reported_by, bathroom_id, report_type)
  where status in ('open', 'reviewing');

-- ── Patch create_bathroom_report ──────────────────────────────────────────────
-- Removes the pre-insert EXISTS check (which had a TOCTOU window) and instead
-- lets the unique index enforce atomicity.  The unique_violation exception is
-- caught and re-raised as REPORT_ALREADY_OPEN so the client contract is
-- unchanged.
create or replace function public.create_bathroom_report(
  p_bathroom_id uuid,
  p_report_type text,
  p_notes       text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid;
  v_notes     text;
  v_report_id uuid;
begin
  v_user_id := public.assert_active_user();

  if p_report_type not in (
    'wrong_code', 'closed', 'unsafe', 'duplicate',
    'incorrect_hours', 'no_restroom', 'other'
  ) then
    raise exception 'INVALID_REPORT_TYPE' using errcode = 'P0001';
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'INVALID_REPORT_NOTES' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id                = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- No pre-insert duplicate check.  The partial unique index
  -- uq_reports_open_per_user_type enforces the constraint atomically.
  -- Catching 23505 here translates it to the same client-facing error code.
  begin
    insert into public.bathroom_reports (bathroom_id, reported_by, report_type, notes)
    values (p_bathroom_id, v_user_id, p_report_type, v_notes)
    returning id into v_report_id;
  exception
    when unique_violation then
      raise exception 'REPORT_ALREADY_OPEN' using errcode = 'P0001';
  end;

  return jsonb_build_object(
    'report_id',  v_report_id,
    'created_at', timezone('utc', now())
  );
end;
$$;
