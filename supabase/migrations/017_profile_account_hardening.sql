-- ============================================================================
-- PeeDom profile account hardening
-- 017_profile_account_hardening.sql
-- ============================================================================

alter table public.profiles
  add column if not exists is_deactivated boolean not null default false,
  add column if not exists deactivated_at timestamptz,
  add column if not exists display_name_updated_at timestamptz;

create or replace function public.update_display_name(
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  normalized_display_name text := trim(coalesce(p_display_name, ''));
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated'
    );
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'profile_not_found'
    );
  end if;

  if current_profile.is_deactivated then
    return jsonb_build_object(
      'success', false,
      'error', 'account_deactivated'
    );
  end if;

  if char_length(normalized_display_name) < 2 then
    return jsonb_build_object(
      'success', false,
      'error', 'name_too_short'
    );
  end if;

  if char_length(normalized_display_name) > 50 then
    return jsonb_build_object(
      'success', false,
      'error', 'name_too_long'
    );
  end if;

  if coalesce(trim(current_profile.display_name), '') = normalized_display_name then
    return jsonb_build_object(
      'success', true
    );
  end if;

  if current_profile.display_name_updated_at is not null
     and current_profile.display_name_updated_at > now() - interval '24 hours' then
    return jsonb_build_object(
      'success', false,
      'error', 'rate_limited'
    );
  end if;

  update public.profiles
  set display_name = normalized_display_name,
      display_name_updated_at = now(),
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object(
    'success', true
  );
end;
$$;

revoke all on function public.update_display_name(text) from public;
grant execute on function public.update_display_name(text) to authenticated, service_role;

create or replace function public.deactivate_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deactivated_at timestamptz := now();
begin
  if v_user_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated'
    );
  end if;

  update public.profiles
  set is_deactivated = true,
      deactivated_at = coalesce(deactivated_at, v_deactivated_at),
      push_enabled = false,
      push_token = null,
      updated_at = v_deactivated_at
  where id = v_user_id;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'profile_not_found'
    );
  end if;

  delete from public.push_subscriptions
  where user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'deactivated_at', v_deactivated_at
  );
end;
$$;

revoke all on function public.deactivate_account() from public;
grant execute on function public.deactivate_account() to authenticated, service_role;
