-- ============================================================================
-- 046_action_unlock_currency.sql
-- Server-enforced starter unlocks and point-spend one-off premium actions.
-- ============================================================================

alter table public.profiles
  add column if not exists free_code_reveal_used_at timestamptz,
  add column if not exists free_emergency_lookup_used_at timestamptz;

drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (
      select existing_profile.role
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and points_balance = (
      select existing_profile.points_balance
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and is_premium = (
      select existing_profile.is_premium
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and premium_expires_at is not distinct from (
      select existing_profile.premium_expires_at
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and is_suspended = (
      select existing_profile.is_suspended
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and current_streak = (
      select existing_profile.current_streak
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and longest_streak = (
      select existing_profile.longest_streak
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and last_contribution_date is not distinct from (
      select existing_profile.last_contribution_date
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and streak_multiplier = (
      select existing_profile.streak_multiplier
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and streak_multiplier_expires_at is not distinct from (
      select existing_profile.streak_multiplier_expires_at
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and free_code_reveal_used_at is not distinct from (
      select existing_profile.free_code_reveal_used_at
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and free_emergency_lookup_used_at is not distinct from (
      select existing_profile.free_emergency_lookup_used_at
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
  );

alter table public.code_reveal_grants
  drop constraint if exists code_reveal_grants_grant_source_check;

alter table public.code_reveal_grants
  add constraint code_reveal_grants_grant_source_check
  check (grant_source in ('rewarded_ad', 'starter_free', 'points_redeemed'));

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
      'code_verification_consensus',
      'consensus_denial_award',
      'code_reveal_redeemed',
      'emergency_lookup_redeemed'
    )
  );

create or replace function public.get_action_unlock_cost(
  p_feature_key text
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  case p_feature_key
    when 'code_reveal' then
      return 100;
    when 'emergency_lookup' then
      return 100;
    else
      raise exception 'INVALID_UNLOCK_METHOD' using errcode = 'P0001';
  end case;
end;
$$;

revoke all on function public.get_action_unlock_cost(text) from public;
grant execute on function public.get_action_unlock_cost(text) to authenticated, service_role;

create or replace function public.spend_points_for_action_unlock(
  p_user_id uuid,
  p_event_type text,
  p_feature_key text,
  p_points_cost integer,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_reference_id uuid := gen_random_uuid();
begin
  if p_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select *
  into v_profile
  from public.profiles profiles
  where profiles.id = p_user_id
  for update;

  if v_profile.id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_profile.points_balance < p_points_cost then
    raise exception 'INSUFFICIENT_UNLOCK_POINTS' using errcode = 'P0001';
  end if;

  update public.profiles
  set
    points_balance = v_profile.points_balance - p_points_cost,
    updated_at = now()
  where id = p_user_id;

  insert into public.point_events (
    user_id,
    event_type,
    reference_table,
    reference_id,
    points_awarded,
    metadata
  )
  values (
    p_user_id,
    p_event_type,
    'feature_unlocks',
    v_reference_id,
    -p_points_cost,
    coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object(
        'feature_key', p_feature_key,
        'points_spent', p_points_cost
      )
  );

  return v_profile.points_balance - p_points_cost;
end;
$$;

revoke all on function public.spend_points_for_action_unlock(uuid, text, text, integer, jsonb) from public;
grant execute on function public.spend_points_for_action_unlock(uuid, text, text, integer, jsonb) to authenticated, service_role;

drop function if exists public.grant_bathroom_code_reveal_access(uuid);

create function public.grant_bathroom_code_reveal_access(
  p_bathroom_id uuid,
  p_unlock_method text default 'rewarded_ad'
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
  profile_record public.profiles%rowtype;
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

  select *
  into profile_record
  from public.profiles profiles
  where profiles.id = auth.uid()
  for update;

  if profile_record.id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_remaining_points := profile_record.points_balance;

  if p_unlock_method = 'starter_free' then
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
      jsonb_build_object('bathroom_id', p_bathroom_id)
    );
    v_points_spent := v_points_cost;
  end if;

  return query
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
  returning
    grants.id,
    grants.bathroom_id,
    grants.user_id,
    grants.grant_source,
    grants.expires_at,
    grants.created_at,
    grants.updated_at,
    v_points_spent,
    v_remaining_points,
    v_used_free_unlock;
end;
$$;

grant execute on function public.grant_bathroom_code_reveal_access(uuid, text) to authenticated;

create or replace function public.consume_emergency_lookup_access(
  p_unlock_method text default 'rewarded_ad'
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

  select *
  into profile_record
  from public.profiles profiles
  where profiles.id = auth.uid()
  for update;

  if profile_record.id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_remaining_points := profile_record.points_balance;

  if p_unlock_method = 'starter_free' then
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
      '{}'::jsonb
    );
    v_points_spent := v_points_cost;
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

grant execute on function public.consume_emergency_lookup_access(text) to authenticated;
