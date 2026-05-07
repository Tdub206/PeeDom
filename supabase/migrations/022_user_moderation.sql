-- ============================================================================
-- StallPass user moderation (report + block)
-- 022_user_moderation.sql
--
-- Google UGC policy expects user-level moderation, not just content reporting.
-- ============================================================================

-- ---------------------------------------------------------------
-- User reports
-- ---------------------------------------------------------------
create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in (
    'spam', 'harassment', 'false_info', 'impersonation', 'inappropriate_content', 'other'
  )),
  notes text check (char_length(notes) <= 500),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,

  constraint user_reports_no_self_report check (reporter_id <> reported_user_id)
);

create index if not exists idx_user_reports_reported on public.user_reports(reported_user_id);
create index if not exists idx_user_reports_reporter on public.user_reports(reporter_id);
create index if not exists idx_user_reports_status on public.user_reports(status) where status = 'pending';

-- Prevent duplicate active reports from the same reporter
create unique index if not exists idx_user_reports_unique_active
  on public.user_reports(reporter_id, reported_user_id)
  where status in ('pending', 'reviewed');

alter table public.user_reports enable row level security;

create policy "user_reports_insert_own"
  on public.user_reports for insert
  with check (auth.uid() = reporter_id);

create policy "user_reports_select_own"
  on public.user_reports for select
  using (auth.uid() = reporter_id);

-- ---------------------------------------------------------------
-- User blocks
-- ---------------------------------------------------------------
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint user_blocks_no_self_block check (blocker_id <> blocked_user_id)
);

create unique index if not exists idx_user_blocks_unique
  on public.user_blocks(blocker_id, blocked_user_id);

create index if not exists idx_user_blocks_blocker on public.user_blocks(blocker_id);

alter table public.user_blocks enable row level security;

create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

create policy "user_blocks_select_own"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

-- ---------------------------------------------------------------
-- RPC: report a user
-- ---------------------------------------------------------------
create or replace function public.report_user(
  p_reported_user_id uuid,
  p_reason text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_id uuid := auth.uid();
begin
  if v_reporter_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if v_reporter_id = p_reported_user_id then
    return jsonb_build_object('success', false, 'error', 'cannot_report_self');
  end if;

  if not exists (select 1 from public.profiles where id = p_reported_user_id) then
    return jsonb_build_object('success', false, 'error', 'user_not_found');
  end if;

  -- Check for existing active report
  if exists (
    select 1 from public.user_reports
    where reporter_id = v_reporter_id
      and reported_user_id = p_reported_user_id
      and status in ('pending', 'reviewed')
  ) then
    return jsonb_build_object('success', false, 'error', 'already_reported');
  end if;

  insert into public.user_reports (reporter_id, reported_user_id, reason, notes)
  values (v_reporter_id, p_reported_user_id, p_reason, p_notes);

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.report_user(uuid, text, text) from public;
grant execute on function public.report_user(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------
-- RPC: block a user
-- ---------------------------------------------------------------
create or replace function public.block_user(p_blocked_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocker_id uuid := auth.uid();
begin
  if v_blocker_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  if v_blocker_id = p_blocked_user_id then
    return jsonb_build_object('success', false, 'error', 'cannot_block_self');
  end if;

  insert into public.user_blocks (blocker_id, blocked_user_id)
  values (v_blocker_id, p_blocked_user_id)
  on conflict (blocker_id, blocked_user_id) do nothing;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.block_user(uuid) from public;
grant execute on function public.block_user(uuid) to authenticated;

-- ---------------------------------------------------------------
-- RPC: unblock a user
-- ---------------------------------------------------------------
create or replace function public.unblock_user(p_blocked_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blocker_id uuid := auth.uid();
begin
  if v_blocker_id is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  delete from public.user_blocks
  where blocker_id = v_blocker_id
    and blocked_user_id = p_blocked_user_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.unblock_user(uuid) to authenticated;
