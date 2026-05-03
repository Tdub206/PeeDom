create or replace function public.set_default_saved_need_profile(
  p_profile_id uuid
)
returns public.saved_need_profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  selected_profile public.saved_need_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('saved_need_profile_default:' || auth.uid()::text));

  select *
  into selected_profile
  from public.saved_need_profiles profiles
  where profiles.id = p_profile_id
    and profiles.user_id = auth.uid()
  for update;

  if selected_profile.id is null then
    raise exception 'SAVED_NEED_PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.saved_need_profiles
  set
    is_default = false,
    updated_at = now()
  where user_id = auth.uid()
    and is_default = true
    and id <> p_profile_id;

  update public.saved_need_profiles
  set
    is_default = true,
    updated_at = now()
  where id = p_profile_id
    and user_id = auth.uid()
  returning *
  into selected_profile;

  return selected_profile;
end;
$$;

revoke all on function public.set_default_saved_need_profile(uuid) from public;
grant execute on function public.set_default_saved_need_profile(uuid) to authenticated;
