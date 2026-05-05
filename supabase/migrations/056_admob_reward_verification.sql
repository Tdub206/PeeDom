-- ============================================================================
-- 056_admob_reward_verification.sql
-- AdMob server-side verification and idempotent rewarded unlock grants.
-- Compatible with the source-import/artifact migration line where 054 is not
-- the restroom-intelligence layer.
-- ============================================================================

create table if not exists public.rewarded_unlock_verifications (
  verification_token text primary key check (length(verification_token) between 12 and 512),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null check (feature_key in ('code_reveal', 'emergency_lookup')),
  bathroom_id uuid null references public.bathrooms(id) on delete cascade,
  provider text not null default 'admob',
  verified_at timestamptz not null default now(),
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rewarded_unlock_verifications_user_feature
  on public.rewarded_unlock_verifications(user_id, feature_key, verified_at desc);

alter table public.rewarded_unlock_verifications enable row level security;

drop policy if exists "rewarded_unlock_verifications_select_own" on public.rewarded_unlock_verifications;
create policy "rewarded_unlock_verifications_select_own"
  on public.rewarded_unlock_verifications for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.action_unlock_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null check (feature_key in ('code_reveal', 'emergency_lookup')),
  unlock_method text not null check (unlock_method in ('rewarded_ad', 'starter_free', 'points_redeemed')),
  bathroom_id uuid null references public.bathrooms(id) on delete cascade,
  idempotency_key text not null check (length(idempotency_key) between 8 and 256),
  code_reveal_grant_id uuid null references public.code_reveal_grants(id) on delete set null,
  points_spent integer not null default 0 check (points_spent >= 0),
  remaining_points integer not null default 0 check (remaining_points >= 0),
  used_free_unlock boolean not null default false,
  unlocked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_action_unlock_idempotency_unique
  on public.action_unlock_idempotency_keys(
    user_id,
    feature_key,
    unlock_method,
    coalesce(bathroom_id, '00000000-0000-0000-0000-000000000000'::uuid),
    idempotency_key
  );

alter table public.action_unlock_idempotency_keys enable row level security;

drop policy if exists "action_unlock_idempotency_keys_select_own" on public.action_unlock_idempotency_keys;
create policy "action_unlock_idempotency_keys_select_own"
  on public.action_unlock_idempotency_keys for select
  to authenticated
  using (auth.uid() = user_id);

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
    and p_feature_key in ('code_reveal', 'emergency_lookup')
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

create or replace function public.verify_rewarded_unlock_token(
  p_feature_key text,
  p_bathroom_id uuid,
  p_reward_verification_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  verification_record public.rewarded_unlock_verifications%rowtype;
begin
  if p_reward_verification_token is null or length(trim(p_reward_verification_token)) < 12 then
    raise exception 'REWARD_VERIFICATION_REQUIRED' using errcode = 'P0001';
  end if;

  select *
  into verification_record
  from public.rewarded_unlock_verifications verifications
  where verifications.verification_token = trim(p_reward_verification_token)
    and verifications.user_id = auth.uid()
    and verifications.feature_key = p_feature_key
    and verifications.bathroom_id is not distinct from p_bathroom_id
    and verifications.consumed_at is null
    and verifications.verified_at >= now() - interval '30 minutes'
  for update;

  if verification_record.verification_token is null then
    raise exception 'REWARD_VERIFICATION_REQUIRED' using errcode = 'P0001';
  end if;

  update public.rewarded_unlock_verifications
  set consumed_at = now()
  where verification_token = verification_record.verification_token;
end;
$$;

revoke all on function public.verify_rewarded_unlock_token(text, uuid, text) from public;
grant execute on function public.verify_rewarded_unlock_token(text, uuid, text) to authenticated, service_role;

drop function if exists public.grant_bathroom_code_reveal_access(uuid, text);

create function public.grant_bathroom_code_reveal_access(
  p_bathroom_id uuid,
  p_unlock_method text default 'rewarded_ad',
  p_idempotency_key text default null,
  p_reward_verification_token text default null
)
returns table (
  id uuid,
  bathroom_id uuid,
  user_id uuid,
  grant_source text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  points_spent integer,
  remaining_points integer,
  used_free_unlock boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  active_code record;
  existing_grant public.code_reveal_grants%rowtype;
  inserted_grant public.code_reveal_grants%rowtype;
  profile_record public.profiles%rowtype;
  request_record public.action_unlock_idempotency_keys%rowtype;
  v_idempotency_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_points_cost integer := public.get_action_unlock_cost('code_reveal');
  v_points_spent integer := 0;
  v_remaining_points integer := 0;
  v_used_free_unlock boolean := false;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if p_unlock_method not in ('rewarded_ad', 'starter_free', 'points_redeemed') then
    raise exception 'INVALID_UNLOCK_METHOD' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('code_reveal:' || auth.uid()::text || ':' || p_bathroom_id::text));

  select *
  into profile_record
  from public.profiles profiles
  where profiles.id = auth.uid()
  for update;

  if profile_record.id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_remaining_points := profile_record.points_balance;

  select *
  into existing_grant
  from public.code_reveal_grants grants
  where grants.bathroom_id = p_bathroom_id
    and grants.user_id = auth.uid()
    and grants.expires_at > now()
  order by grants.updated_at desc
  limit 1
  for update;

  if existing_grant.id is not null then
    return query
    select
      existing_grant.id,
      existing_grant.bathroom_id,
      existing_grant.user_id,
      existing_grant.grant_source,
      existing_grant.expires_at,
      existing_grant.created_at,
      existing_grant.updated_at,
      0,
      v_remaining_points,
      false;
    return;
  end if;

  if p_unlock_method in ('points_redeemed', 'rewarded_ad') and v_idempotency_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = 'P0001';
  end if;

  if v_idempotency_key is not null then
    select *
    into request_record
    from public.action_unlock_idempotency_keys requests
    where requests.user_id = auth.uid()
      and requests.feature_key = 'code_reveal'
      and requests.unlock_method = p_unlock_method
      and requests.bathroom_id = p_bathroom_id
      and requests.idempotency_key = v_idempotency_key
    for update;

    if request_record.id is not null and request_record.code_reveal_grant_id is not null then
      select *
      into existing_grant
      from public.code_reveal_grants grants
      where grants.id = request_record.code_reveal_grant_id;

      if existing_grant.id is not null then
        return query
        select
          existing_grant.id,
          existing_grant.bathroom_id,
          existing_grant.user_id,
          existing_grant.grant_source,
          existing_grant.expires_at,
          existing_grant.created_at,
          existing_grant.updated_at,
          request_record.points_spent,
          request_record.remaining_points,
          request_record.used_free_unlock;
        return;
      end if;
    end if;
  end if;

  select
    codes.id,
    codes.expires_at
  into active_code
  from public.bathroom_access_codes codes
  where codes.bathroom_id = p_bathroom_id
    and codes.visibility_status = 'visible'
    and codes.lifecycle_status = 'active'
  order by codes.last_verified_at desc nulls last, codes.confidence_score desc
  limit 1;

  if active_code.id is null then
    raise exception 'CODE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if p_unlock_method = 'rewarded_ad' then
    perform public.verify_rewarded_unlock_token('code_reveal', p_bathroom_id, p_reward_verification_token);
  elsif p_unlock_method = 'starter_free' then
    if profile_record.free_code_reveal_used_at is not null then
      raise exception 'STARTER_UNLOCK_ALREADY_USED' using errcode = 'P0001';
    end if;

    update public.profiles
    set
      free_code_reveal_used_at = now(),
      updated_at = now()
    where id = auth.uid();

    v_used_free_unlock := true;
  elsif p_unlock_method = 'points_redeemed' then
    v_remaining_points := public.spend_points_for_action_unlock(
      auth.uid(),
      'code_reveal_redeemed',
      'code_reveal',
      v_points_cost,
      jsonb_build_object(
        'bathroom_id', p_bathroom_id,
        'idempotency_key', v_idempotency_key
      )
    );
    v_points_spent := v_points_cost;
  end if;

  insert into public.code_reveal_grants as grants (
    bathroom_id,
    user_id,
    grant_source,
    expires_at
  )
  values (
    p_bathroom_id,
    auth.uid(),
    p_unlock_method,
    public.compute_code_reveal_grant_expiry(active_code.expires_at)
  )
  on conflict on constraint code_reveal_grants_bathroom_id_user_id_key
  do update
  set
    grant_source = excluded.grant_source,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning grants.*
  into inserted_grant;

  if v_idempotency_key is not null then
    insert into public.action_unlock_idempotency_keys (
      user_id,
      feature_key,
      unlock_method,
      bathroom_id,
      idempotency_key,
      code_reveal_grant_id,
      points_spent,
      remaining_points,
      used_free_unlock,
      unlocked_at
    )
    values (
      auth.uid(),
      'code_reveal',
      p_unlock_method,
      p_bathroom_id,
      v_idempotency_key,
      inserted_grant.id,
      v_points_spent,
      v_remaining_points,
      v_used_free_unlock,
      now()
    )
    on conflict (
      user_id,
      feature_key,
      unlock_method,
      (coalesce(bathroom_id, '00000000-0000-0000-0000-000000000000'::uuid)),
      idempotency_key
    )
    do update
    set
      code_reveal_grant_id = excluded.code_reveal_grant_id,
      points_spent = excluded.points_spent,
      remaining_points = excluded.remaining_points,
      used_free_unlock = excluded.used_free_unlock,
      unlocked_at = excluded.unlocked_at,
      updated_at = now();
  end if;

  return query
  select
    inserted_grant.id,
    inserted_grant.bathroom_id,
    inserted_grant.user_id,
    inserted_grant.grant_source,
    inserted_grant.expires_at,
    inserted_grant.created_at,
    inserted_grant.updated_at,
    v_points_spent,
    v_remaining_points,
    v_used_free_unlock;
end;
$$;

grant execute on function public.grant_bathroom_code_reveal_access(uuid, text, text, text) to authenticated;

drop function if exists public.consume_emergency_lookup_access(text);

create function public.consume_emergency_lookup_access(
  p_unlock_method text default 'rewarded_ad',
  p_idempotency_key text default null,
  p_reward_verification_token text default null
)
returns table (
  user_id uuid,
  unlock_method text,
  points_spent integer,
  remaining_points integer,
  used_free_unlock boolean,
  unlocked_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_record public.profiles%rowtype;
  request_record public.action_unlock_idempotency_keys%rowtype;
  v_idempotency_key text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_points_cost integer := public.get_action_unlock_cost('emergency_lookup');
  v_points_spent integer := 0;
  v_remaining_points integer := 0;
  v_used_free_unlock boolean := false;
  v_unlocked_at timestamptz := now();
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if p_unlock_method not in ('rewarded_ad', 'starter_free', 'points_redeemed') then
    raise exception 'INVALID_UNLOCK_METHOD' using errcode = 'P0001';
  end if;

  if p_unlock_method in ('points_redeemed', 'rewarded_ad') and v_idempotency_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('emergency_lookup:' || auth.uid()::text || ':' || coalesce(v_idempotency_key, p_unlock_method)));

  if v_idempotency_key is not null then
    select *
    into request_record
    from public.action_unlock_idempotency_keys requests
    where requests.user_id = auth.uid()
      and requests.feature_key = 'emergency_lookup'
      and requests.unlock_method = p_unlock_method
      and requests.bathroom_id is null
      and requests.idempotency_key = v_idempotency_key
    for update;

    if request_record.id is not null then
      return query
      select
        request_record.user_id,
        request_record.unlock_method,
        request_record.points_spent,
        request_record.remaining_points,
        request_record.used_free_unlock,
        request_record.unlocked_at;
      return;
    end if;
  end if;

  select *
  into profile_record
  from public.profiles profiles
  where profiles.id = auth.uid()
  for update;

  if profile_record.id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_remaining_points := profile_record.points_balance;

  if p_unlock_method = 'rewarded_ad' then
    perform public.verify_rewarded_unlock_token('emergency_lookup', null, p_reward_verification_token);
  elsif p_unlock_method = 'starter_free' then
    if profile_record.free_emergency_lookup_used_at is not null then
      raise exception 'STARTER_UNLOCK_ALREADY_USED' using errcode = 'P0001';
    end if;

    update public.profiles
    set
      free_emergency_lookup_used_at = v_unlocked_at,
      updated_at = now()
    where id = auth.uid();

    v_used_free_unlock := true;
  elsif p_unlock_method = 'points_redeemed' then
    v_remaining_points := public.spend_points_for_action_unlock(
      auth.uid(),
      'emergency_lookup_redeemed',
      'emergency_lookup',
      v_points_cost,
      jsonb_build_object('idempotency_key', v_idempotency_key)
    );
    v_points_spent := v_points_cost;
  end if;

  if v_idempotency_key is not null then
    insert into public.action_unlock_idempotency_keys (
      user_id,
      feature_key,
      unlock_method,
      bathroom_id,
      idempotency_key,
      points_spent,
      remaining_points,
      used_free_unlock,
      unlocked_at
    )
    values (
      auth.uid(),
      'emergency_lookup',
      p_unlock_method,
      null,
      v_idempotency_key,
      v_points_spent,
      v_remaining_points,
      v_used_free_unlock,
      v_unlocked_at
    )
    on conflict (
      user_id,
      feature_key,
      unlock_method,
      (coalesce(bathroom_id, '00000000-0000-0000-0000-000000000000'::uuid)),
      idempotency_key
    )
    do update
    set
      points_spent = excluded.points_spent,
      remaining_points = excluded.remaining_points,
      used_free_unlock = excluded.used_free_unlock,
      unlocked_at = excluded.unlocked_at,
      updated_at = now();
  end if;

  return query
  select
    auth.uid(),
    p_unlock_method,
    v_points_spent,
    v_remaining_points,
    v_used_free_unlock,
    v_unlocked_at;
end;
$$;

grant execute on function public.consume_emergency_lookup_access(text, text, text) to authenticated;
