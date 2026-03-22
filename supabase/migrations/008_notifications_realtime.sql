-- ============================================================================
-- Pee-Dom Notifications And Realtime
-- Adds push token persistence, favorite subscription syncing, and live
-- bathroom status reporting with Supabase Realtime support.
-- ============================================================================

alter table public.profiles
  add column if not exists push_token text,
  add column if not exists push_enabled boolean not null default true,
  add column if not exists notification_prefs jsonb not null default '{
    "code_verified": true,
    "favorite_update": true,
    "nearby_new": false,
    "streak_reminder": true
  }'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_notification_prefs_object_check;

alter table public.profiles
  add constraint profiles_notification_prefs_object_check
  check (jsonb_typeof(notification_prefs) = 'object');

create index if not exists idx_profiles_push_token
  on public.profiles(push_token)
  where push_token is not null;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  subscribed_at timestamptz not null default now(),
  unique (user_id, bathroom_id)
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions(user_id, subscribed_at desc);

create index if not exists idx_push_subscriptions_bathroom
  on public.push_subscriptions(bathroom_id, subscribed_at desc);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

create or replace function public.sync_push_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.push_subscriptions (user_id, bathroom_id, subscribed_at)
    values (new.user_id, new.bathroom_id, coalesce(new.created_at, now()))
    on conflict (user_id, bathroom_id) do nothing;

    return new;
  end if;

  if tg_op = 'DELETE' then
    delete from public.push_subscriptions
    where user_id = old.user_id
      and bathroom_id = old.bathroom_id;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists on_favorite_change_sync_push_subscription on public.favorites;
create trigger on_favorite_change_sync_push_subscription
  after insert or delete on public.favorites
  for each row execute function public.sync_push_subscription();

insert into public.push_subscriptions (user_id, bathroom_id, subscribed_at)
select
  favorites.user_id,
  favorites.bathroom_id,
  favorites.created_at
from public.favorites favorites
on conflict (user_id, bathroom_id) do nothing;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'bathroom_live_status'
  ) then
    create type public.bathroom_live_status as enum (
      'clean',
      'dirty',
      'closed',
      'out_of_order',
      'long_wait'
    );
  end if;
end;
$$;

create table if not exists public.bathroom_status_events (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  status public.bathroom_live_status not null,
  note text,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now()
);

create index if not exists idx_bathroom_status_events_bathroom
  on public.bathroom_status_events(bathroom_id, created_at desc);

create index if not exists idx_bathroom_status_events_reporter
  on public.bathroom_status_events(reported_by, bathroom_id, created_at desc);

alter table public.bathroom_status_events enable row level security;

drop policy if exists "bathroom_status_events_select_active" on public.bathroom_status_events;
create policy "bathroom_status_events_select_active"
  on public.bathroom_status_events for select
  using (expires_at > now());

drop policy if exists "bathroom_status_events_insert_authenticated" on public.bathroom_status_events;
create policy "bathroom_status_events_insert_authenticated"
  on public.bathroom_status_events for insert
  with check (auth.uid() = reported_by);

create or replace function public.register_push_token(
  p_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_token is null
    or length(trim(p_token)) = 0
    or (
      trim(p_token) not like 'ExpoPushToken[%'
      and trim(p_token) not like 'ExponentPushToken[%'
    ) then
    raise exception 'INVALID_PUSH_TOKEN';
  end if;

  update public.profiles
  set push_token = trim(p_token),
      push_enabled = true,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.register_push_token(text) from public;
grant execute on function public.register_push_token(text) to authenticated, service_role;

create or replace function public.clear_push_token()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  update public.profiles
  set push_token = null,
      updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.clear_push_token() from public;
grant execute on function public.clear_push_token() to authenticated, service_role;

create or replace function public.update_notification_settings(
  p_push_enabled boolean default null,
  p_notification_prefs jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_keys constant text[] := array[
    'code_verified',
    'favorite_update',
    'nearby_new',
    'streak_reminder'
  ];
  invalid_pref_key text;
  invalid_pref_value text;
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated'
    );
  end if;

  if p_notification_prefs is not null then
    select key
    into invalid_pref_key
    from jsonb_object_keys(p_notification_prefs) as pref_key(key)
    where key <> all (allowed_keys)
    limit 1;

    if invalid_pref_key is not null then
      return jsonb_build_object(
        'success', false,
        'error', 'invalid_notification_pref_key',
        'key', invalid_pref_key
      );
    end if;

    select key
    into invalid_pref_value
    from jsonb_each(p_notification_prefs) as pref_entry(key, value)
    where jsonb_typeof(value) <> 'boolean'
    limit 1;

    if invalid_pref_value is not null then
      return jsonb_build_object(
        'success', false,
        'error', 'invalid_notification_pref_value',
        'key', invalid_pref_value
      );
    end if;
  end if;

  update public.profiles
  set push_enabled = coalesce(p_push_enabled, push_enabled),
      push_token = case
        when p_push_enabled = false then null
        else push_token
      end,
      notification_prefs = case
        when p_notification_prefs is null then notification_prefs
        else jsonb_strip_nulls(notification_prefs || p_notification_prefs)
      end,
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.update_notification_settings(boolean, jsonb) from public;
grant execute on function public.update_notification_settings(boolean, jsonb) to authenticated, service_role;

create or replace function public.get_subscribers_for_bathroom(
  p_bathroom_id uuid
)
returns table (
  user_id uuid,
  push_token text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id as user_id,
    profiles.push_token
  from public.push_subscriptions subscriptions
  join public.profiles profiles
    on profiles.id = subscriptions.user_id
  where subscriptions.bathroom_id = p_bathroom_id
    and profiles.push_enabled = true
    and profiles.push_token is not null
    and coalesce((profiles.notification_prefs ->> 'favorite_update')::boolean, true) = true;
$$;

revoke all on function public.get_subscribers_for_bathroom(uuid) from public;
grant execute on function public.get_subscribers_for_bathroom(uuid) to service_role;

create or replace function public.report_bathroom_status(
  p_bathroom_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_status text := trim(lower(coalesce(p_status, '')));
begin
  if auth.uid() is null then
    return jsonb_build_object(
      'success', false,
      'error', 'not_authenticated'
    );
  end if;

  if normalized_status not in ('clean', 'dirty', 'closed', 'out_of_order', 'long_wait') then
    return jsonb_build_object(
      'success', false,
      'error', 'invalid_status'
    );
  end if;

  if exists (
    select 1
    from public.bathroom_status_events status_events
    where status_events.bathroom_id = p_bathroom_id
      and status_events.reported_by = auth.uid()
      and status_events.created_at > now() - interval '30 minutes'
  ) then
    return jsonb_build_object(
      'success', false,
      'error', 'rate_limited'
    );
  end if;

  insert into public.bathroom_status_events (
    bathroom_id,
    reported_by,
    status,
    note
  )
  values (
    p_bathroom_id,
    auth.uid(),
    normalized_status::public.bathroom_live_status,
    nullif(trim(coalesce(p_note, '')), '')
  );

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.report_bathroom_status(uuid, text, text) from public;
grant execute on function public.report_bathroom_status(uuid, text, text) to authenticated, service_role;

do $$
begin
  begin
    alter publication supabase_realtime add table public.bathroom_access_codes;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.bathroom_status_events;
  exception
    when duplicate_object then null;
  end;
end;
$$;
