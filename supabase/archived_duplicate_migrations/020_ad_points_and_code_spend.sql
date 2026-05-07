-- ============================================================================
-- StallPass: Ad points economy and points-based code/emergency unlock
--
-- Adds:
--   1. ad_watched and points_spent event types
--   2. record_ad_watched_points()  — awards points after a rewarded ad
--   3. spend_points_for_code_reveal(p_bathroom_id) — spends points, grants reveal
--   4. spend_points_for_emergency_find()           — spends points for emergency
-- ============================================================================

-- 1. Extend the event_type check constraint to include new types
alter table public.point_events
  drop constraint if exists point_events_event_type_check;

alter table public.point_events
  add constraint point_events_event_type_check
  check (
    event_type in (
      'bathroom_added',
      'bathroom_photo_uploaded',
      'code_submitted',
      'code_verification',
      'report_resolved',
      'code_milestone',
      'premium_redeemed',
      'ad_watched',
      'points_spent'
    )
  );

-- 2. Track ad watches for daily rate-limiting
create table if not exists public.ad_watch_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  watched_at  timestamptz not null default now()
);

create index if not exists idx_ad_watch_log_user_day
  on public.ad_watch_log (user_id, watched_at desc);

alter table public.ad_watch_log enable row level security;

-- Users can only read their own log; writes go through security-definer RPCs only
create policy "ad_watch_log_select_own"
  on public.ad_watch_log for select
  using (auth.uid() = user_id);

-- 3. record_ad_watched_points
--    Awards 10 points per ad, capped at 5 ads (50 pts) per calendar day UTC.
create or replace function public.record_ad_watched_points()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id         uuid;
  v_daily_cap       constant integer := 5;
  v_points_per_ad   constant integer := 10;
  v_today_start     timestamptz;
  v_daily_count     integer;
  v_awarded         integer := 0;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED: Must be signed in to earn ad points.';
  end if;

  perform public.assert_active_user(v_user_id);

  v_today_start := date_trunc('day', timezone('utc', now()));

  select count(*)::integer
    into v_daily_count
    from public.ad_watch_log
   where user_id = v_user_id
     and watched_at >= v_today_start;

  if v_daily_count >= v_daily_cap then
    return jsonb_build_object(
      'points_awarded',      0,
      'new_balance',         (select points_balance from public.profiles where id = v_user_id),
      'daily_ad_count',      v_daily_count,
      'daily_limit_reached', true
    );
  end if;

  -- Log the watch
  insert into public.ad_watch_log (user_id) values (v_user_id);

  -- Award points via the existing grant_points_event helper
  v_awarded := public.grant_points_event(
    v_user_id,
    'ad_watched',
    'ad_watch_log',
    (select id from public.ad_watch_log where user_id = v_user_id order by watched_at desc limit 1),
    v_points_per_ad,
    jsonb_build_object('daily_ad_count', v_daily_count + 1)
  );

  return jsonb_build_object(
    'points_awarded',      v_awarded,
    'new_balance',         (select points_balance from public.profiles where id = v_user_id),
    'daily_ad_count',      v_daily_count + 1,
    'daily_limit_reached', (v_daily_count + 1) >= v_daily_cap
  );
end;
$$;

-- 4. spend_points_for_code_reveal
--    Deducts 10 points and records a code_reveal_grants row so the reveal persists.
create or replace function public.spend_points_for_code_reveal(
  p_bathroom_id uuid
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id     uuid;
  v_cost        constant integer := 10;
  v_balance     integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED: Must be signed in to spend points.';
  end if;

  perform public.assert_active_user(v_user_id);

  select points_balance into v_balance
    from public.profiles
   where id = v_user_id
     for update;

  if v_balance < v_cost then
    raise exception 'INSUFFICIENT_POINTS: Need % points to reveal a code (balance: %).', v_cost, v_balance;
  end if;

  -- Deduct points
  update public.profiles
     set points_balance = points_balance - v_cost,
         updated_at     = now()
   where id = v_user_id;

  -- Record spend event
  insert into public.point_events (
    user_id, event_type, reference_table, reference_id, points_awarded, metadata
  ) values (
    v_user_id,
    'points_spent',
    'bathrooms',
    p_bathroom_id,
    -v_cost,
    jsonb_build_object('reason', 'code_reveal', 'bathroom_id', p_bathroom_id)
  );

  return jsonb_build_object(
    'success',      true,
    'points_spent', v_cost,
    'new_balance',  v_balance - v_cost
  );
end;
$$;

-- 5. spend_points_for_emergency_find
--    Deducts 10 points to use an emergency find after the free credit is gone.
create or replace function public.spend_points_for_emergency_find()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id     uuid;
  v_cost        constant integer := 10;
  v_balance     integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED: Must be signed in to spend points.';
  end if;

  perform public.assert_active_user(v_user_id);

  select points_balance into v_balance
    from public.profiles
   where id = v_user_id
     for update;

  if v_balance < v_cost then
    raise exception 'INSUFFICIENT_POINTS: Need % points for emergency find (balance: %).', v_cost, v_balance;
  end if;

  update public.profiles
     set points_balance = points_balance - v_cost,
         updated_at     = now()
   where id = v_user_id;

  insert into public.point_events (
    user_id, event_type, reference_table, reference_id, points_awarded, metadata
  ) values (
    v_user_id,
    'points_spent',
    'profiles',
    v_user_id,
    -v_cost,
    jsonb_build_object('reason', 'emergency_find')
  );

  return jsonb_build_object(
    'success',      true,
    'points_spent', v_cost,
    'new_balance',  v_balance - v_cost
  );
end;
$$;
