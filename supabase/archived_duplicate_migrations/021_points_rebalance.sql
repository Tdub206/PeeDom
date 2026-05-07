-- ============================================================================
-- StallPass: Points economy rebalance
--
-- Changes:
--   bathroom_added:          50  → 100 pts
--   code_submitted:          25 immediate → 50 pts deferred (first verification)
--   code_verification:        5  → 10 pts (to verifier)
--   ad_watched earn:         10  → 25 pts
--   code reveal spend:       10  → 25 pts
--   emergency find spend:    10  → 25 pts
-- ============================================================================

-- 1. bathroom_added: 50 → 100
create or replace function public.award_bathroom_submission_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.created_by is not null and new.source_type = 'community' then
    perform public.grant_points_event(
      new.created_by,
      'bathroom_added',
      'bathrooms',
      new.id,
      100,
      jsonb_build_object('bathroom_id', new.id)
    );
  end if;

  return new;
end;
$$;

-- 2. code_submitted: no longer awarded on INSERT — deferred to first verification.
--    Redefine the trigger function as a no-op so the trigger itself stays in place
--    (removing it would break idempotent re-runs of migration 006).
create or replace function public.award_code_submission_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Points are now awarded after the first upvote via
  -- award_first_code_verification_submitter_points() below.
  return new;
end;
$$;

-- 3. code_verification: 5 → 10 pts (to the verifier)
create or replace function public.award_code_verification_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (TG_OP = 'INSERT' and new.vote = 1)
    or (TG_OP = 'UPDATE' and new.vote = 1 and coalesce(old.vote, 0) <> 1) then
    perform public.grant_points_event(
      new.user_id,
      'code_verification',
      'bathroom_access_codes',
      new.code_id,
      10,
      jsonb_build_object(
        'code_id', new.code_id,
        'vote', new.vote
      )
    );
  end if;

  return coalesce(new, old);
end;
$$;

-- 4. New trigger: award 50 pts to the code submitter on the first upvote.
--    Fires on UPDATE OF up_votes on bathroom_access_codes, same pattern as
--    the existing code_milestone trigger.
create or replace function public.award_first_code_verification_submitter_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Only fire on the transition from 0 → first upvote
  if coalesce(old.up_votes, 0) = 0 and new.up_votes >= 1 and new.submitted_by is not null then
    perform public.grant_points_event(
      new.submitted_by,
      'code_submitted',
      'bathroom_access_codes',
      new.id,
      50,
      jsonb_build_object(
        'bathroom_id', new.bathroom_id,
        'first_verification', true
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_first_code_verification_submitter_points on public.bathroom_access_codes;

create trigger on_first_code_verification_submitter_points
  after update of up_votes on public.bathroom_access_codes
  for each row execute function public.award_first_code_verification_submitter_points();

-- 5. record_ad_watched_points: 10 → 25 pts per ad
create or replace function public.record_ad_watched_points()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id         uuid;
  v_daily_cap       constant integer := 5;
  v_points_per_ad   constant integer := 25;
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

  insert into public.ad_watch_log (user_id) values (v_user_id);

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

-- 6. spend_points_for_code_reveal: 10 → 25 pts
create or replace function public.spend_points_for_code_reveal(
  p_bathroom_id uuid
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id     uuid;
  v_cost        constant integer := 25;
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

  update public.profiles
     set points_balance = points_balance - v_cost,
         updated_at     = now()
   where id = v_user_id;

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

-- 7. spend_points_for_emergency_find: 10 → 25 pts
create or replace function public.spend_points_for_emergency_find()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id     uuid;
  v_cost        constant integer := 25;
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
