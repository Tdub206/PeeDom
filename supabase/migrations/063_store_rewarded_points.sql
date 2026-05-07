-- ============================================================================
-- 063_store_rewarded_points.sql
-- Store earn flow backed by AdMob server-side verification.
-- ============================================================================

alter table public.rewarded_unlock_verifications
  drop constraint if exists rewarded_unlock_verifications_feature_key_check;

alter table public.rewarded_unlock_verifications
  add constraint rewarded_unlock_verifications_feature_key_check
  check (feature_key in ('code_reveal', 'emergency_lookup', 'earn_points'));

create table if not exists public.ad_watch_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  watched_at timestamptz not null default now()
);

create index if not exists idx_ad_watch_log_user_day
  on public.ad_watch_log(user_id, watched_at desc);

alter table public.ad_watch_log enable row level security;

drop policy if exists "ad_watch_log_select_own" on public.ad_watch_log;
create policy "ad_watch_log_select_own"
  on public.ad_watch_log for select
  to authenticated
  using (auth.uid() = user_id);

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
      'points_spent',
      'code_verification_consensus',
      'consensus_denial_award',
      'code_reveal_redeemed',
      'emergency_lookup_redeemed'
    )
  );

alter table public.ad_watch_log
  add column if not exists verification_token text,
  add column if not exists idempotency_key text;

alter table public.ad_watch_log
  drop constraint if exists ad_watch_log_verification_token_length,
  drop constraint if exists ad_watch_log_idempotency_key_length;

alter table public.ad_watch_log
  add constraint ad_watch_log_verification_token_length
  check (verification_token is null or length(verification_token) between 12 and 512),
  add constraint ad_watch_log_idempotency_key_length
  check (idempotency_key is null or length(idempotency_key) between 8 and 256);

create unique index if not exists idx_ad_watch_log_verification_token_unique
  on public.ad_watch_log(verification_token)
  where verification_token is not null;

create unique index if not exists idx_ad_watch_log_user_idempotency_unique
  on public.ad_watch_log(user_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.has_rewarded_unlock_verification(
  p_feature_key text,
  p_bathroom_id uuid,
  p_reward_verification_token text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_feature_key in ('code_reveal', 'emergency_lookup', 'earn_points')
    and p_reward_verification_token is not null
    and length(trim(p_reward_verification_token)) between 12 and 512
    and exists (
      select 1
      from public.rewarded_unlock_verifications verifications
      where verifications.verification_token = trim(p_reward_verification_token)
        and verifications.user_id = auth.uid()
        and verifications.feature_key = p_feature_key
        and verifications.bathroom_id is not distinct from p_bathroom_id
        and verifications.consumed_at is null
        and verifications.verified_at >= now() - interval '30 minutes'
    );
$$;

revoke all on function public.has_rewarded_unlock_verification(text, uuid, text) from public;
grant execute on function public.has_rewarded_unlock_verification(text, uuid, text) to authenticated;

drop function if exists public.record_ad_watched_points();
drop function if exists public.record_ad_watched_points(text, text);

create function public.record_ad_watched_points(
  p_reward_verification_token text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_daily_cap constant integer := 5;
  v_points_per_ad constant integer := 25;
  v_today_start timestamptz;
  v_daily_count integer := 0;
  v_awarded integer := 0;
  v_ad_watch_id uuid;
  v_existing_watch public.ad_watch_log%rowtype;
  v_existing_points integer := 0;
  v_reward_verification_token text := nullif(trim(coalesce(p_reward_verification_token, '')), '');
  v_idempotency_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  perform public.assert_active_user(v_user_id);

  if v_reward_verification_token is null or length(v_reward_verification_token) not between 12 and 512 then
    raise exception 'REWARD_VERIFICATION_REQUIRED' using errcode = 'P0001';
  end if;

  if v_idempotency_key is null or length(v_idempotency_key) not between 8 and 256 then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('earn_points:' || v_user_id::text));

  v_today_start := date_trunc('day', timezone('utc', now()));

  select *
  into v_existing_watch
  from public.ad_watch_log watches
  where watches.user_id = v_user_id
    and watches.idempotency_key = v_idempotency_key
  for update;

  if v_existing_watch.id is not null then
    select coalesce(sum(events.points_awarded), 0)::integer
    into v_existing_points
    from public.point_events events
    where events.user_id = v_user_id
      and events.event_type = 'ad_watched'
      and events.reference_table = 'ad_watch_log'
      and events.reference_id = v_existing_watch.id;

    select count(*)::integer
    into v_daily_count
    from public.ad_watch_log watches
    where watches.user_id = v_user_id
      and watches.watched_at >= v_today_start;

    return jsonb_build_object(
      'points_awarded', v_existing_points,
      'new_balance', (select points_balance from public.profiles where id = v_user_id),
      'daily_ad_count', v_daily_count,
      'daily_limit_reached', v_daily_count >= v_daily_cap,
      'duplicate', true
    );
  end if;

  perform public.verify_rewarded_unlock_token('earn_points', null, v_reward_verification_token);

  select count(*)::integer
  into v_daily_count
  from public.ad_watch_log watches
  where watches.user_id = v_user_id
    and watches.watched_at >= v_today_start;

  insert into public.ad_watch_log (user_id, verification_token, idempotency_key)
  values (v_user_id, v_reward_verification_token, v_idempotency_key)
  returning id into v_ad_watch_id;

  if v_daily_count >= v_daily_cap then
    return jsonb_build_object(
      'points_awarded', 0,
      'new_balance', (select points_balance from public.profiles where id = v_user_id),
      'daily_ad_count', v_daily_count + 1,
      'daily_limit_reached', true,
      'duplicate', false
    );
  end if;

  v_awarded := public.grant_points_event(
    v_user_id,
    'ad_watched',
    'ad_watch_log',
    v_ad_watch_id,
    v_points_per_ad,
    jsonb_build_object(
      'daily_ad_count', v_daily_count + 1,
      'reward_source', 'admob_ssv'
    )
  );

  return jsonb_build_object(
    'points_awarded', v_awarded,
    'new_balance', (select points_balance from public.profiles where id = v_user_id),
    'daily_ad_count', v_daily_count + 1,
    'daily_limit_reached', (v_daily_count + 1) >= v_daily_cap,
    'duplicate', false
  );
end;
$$;

revoke all on function public.record_ad_watched_points(text, text) from public;
grant execute on function public.record_ad_watched_points(text, text) to authenticated;

