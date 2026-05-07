-- ============================================================================
-- 064_reissue_duplicate_prefix_migrations.sql
-- Reissues the still-relevant parts of local migrations that used duplicate
-- numeric prefixes and therefore could not be tracked by Supabase migration
-- history on the remote database.
-- ============================================================================

-- Reissue the contribution points rebalance from the duplicate local 021 file.
-- Store ad rewards are intentionally not reissued here; migration 063 replaces
-- that path with AdMob server-side verification and idempotency.
create or replace function public.award_bathroom_submission_points()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function public.award_code_submission_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Points are awarded after the first upvote via
  -- award_first_code_verification_submitter_points().
  return new;
end;
$$;

create or replace function public.award_code_verification_points()
returns trigger
language plpgsql
security definer
set search_path = public
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

create or replace function public.award_first_code_verification_submitter_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

-- Reissue the early-adopter invite hardening from the duplicate local 038 file.
create or replace function public.generate_early_adopter_invite(
  p_target_business_name text default null,
  p_target_email text default null,
  p_notes text default null,
  p_expiry_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite_id uuid;
  v_token text;
  v_expires_at timestamptz;
  v_attempts integer := 0;
  v_max_attempts constant integer := 10;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = v_user_id and p.role = 'admin'
  ) then
    raise exception 'Forbidden: Only administrators can generate invites';
  end if;

  if p_expiry_days is null or p_expiry_days <= 0 then
    raise exception 'Invalid expiry: p_expiry_days must be greater than 0';
  end if;

  v_expires_at := now() + (p_expiry_days || ' days')::interval;

  loop
    v_attempts := v_attempts + 1;

    if v_attempts > v_max_attempts then
      raise exception 'Unable to generate a unique invite token after % attempts', v_max_attempts;
    end if;

    v_token := upper(substring(
      replace(replace(encode(gen_random_bytes(6), 'base64'), '+', ''), '/', '')
      from 1 for 8
    ));

    begin
      insert into public.early_adopter_invites (
        invite_token,
        invited_by,
        target_email,
        target_business_name,
        notes,
        expires_at
      )
      values (
        v_token,
        v_user_id,
        p_target_email,
        p_target_business_name,
        p_notes,
        v_expires_at
      )
      returning id into v_invite_id;

      exit;
    exception
      when unique_violation then
        continue;
    end;
  end loop;

  return jsonb_build_object(
    'success', true,
    'invite_id', v_invite_id,
    'invite_token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

revoke all on function public.generate_early_adopter_invite(text, text, text, integer) from public;
grant execute on function public.generate_early_adopter_invite(text, text, text, integer) to authenticated;
