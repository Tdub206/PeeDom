-- ============================================================================
-- Fix: generate_early_adopter_invite – retry on token collision and
--      validate p_expiry_days > 0.
-- 037_early_adopter_invite_hardening.sql
-- ============================================================================

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

  -- Admin check
  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.role = 'admin'
  ) then
    raise exception 'Forbidden: Only administrators can generate invites';
  end if;

  -- Validate expiry window
  if p_expiry_days is null or p_expiry_days <= 0 then
    raise exception 'Invalid expiry: p_expiry_days must be greater than 0';
  end if;

  v_expires_at := now() + (p_expiry_days || ' days')::interval;

  -- Generate a short, human-friendly token (8 chars alphanumeric uppercase).
  -- Retry on unique-violation so a collision never fails the caller.
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
        invite_token, invited_by, target_email,
        target_business_name, notes, expires_at
      )
      values (
        v_token, v_user_id, p_target_email,
        p_target_business_name, p_notes, v_expires_at
      )
      returning id into v_invite_id;

      -- Insert succeeded — exit the loop.
      exit;
    exception
      when unique_violation then
        -- Token collision: generate a new one and retry.
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
