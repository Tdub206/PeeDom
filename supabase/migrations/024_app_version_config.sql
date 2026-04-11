-- ============================================================================
-- PeeDom app version configuration
-- 024_app_version_config.sql
--
-- Remote version config for force-update and soft-update prompts.
-- Allows pushing users off broken builds without a store update.
-- ============================================================================

create table if not exists public.app_version_config (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('ios', 'android', 'all')),
  min_supported_version text not null default '1.0.0',
  latest_version text not null default '1.0.0',
  force_update boolean not null default false,
  update_message text default 'A new version of Pee-Dom is available. Please update for the best experience.',
  force_update_message text default 'This version of Pee-Dom is no longer supported. Please update to continue.',
  store_url_ios text,
  store_url_android text,
  updated_at timestamptz not null default now(),

  constraint app_version_config_platform_unique unique (platform)
);

alter table public.app_version_config enable row level security;

-- Everyone can read version config (needed at app boot before auth)
create policy "app_version_config_select_public"
  on public.app_version_config for select
  using (true);

-- Seed with initial config
insert into public.app_version_config (platform, min_supported_version, latest_version)
values
  ('all', '1.0.0', '1.0.0')
on conflict (platform) do nothing;

-- RPC to fetch version config (works without auth)
create or replace function public.get_app_version_config(p_platform text default 'all')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.app_version_config%rowtype;
begin
  -- Try platform-specific first, fall back to 'all'
  select * into v_config
  from public.app_version_config
  where platform = p_platform;

  if not found then
    select * into v_config
    from public.app_version_config
    where platform = 'all';
  end if;

  if not found then
    return jsonb_build_object(
      'min_supported_version', '1.0.0',
      'latest_version', '1.0.0',
      'force_update', false,
      'update_message', null,
      'force_update_message', null,
      'store_url_ios', null,
      'store_url_android', null
    );
  end if;

  return jsonb_build_object(
    'min_supported_version', v_config.min_supported_version,
    'latest_version', v_config.latest_version,
    'force_update', v_config.force_update,
    'update_message', v_config.update_message,
    'force_update_message', v_config.force_update_message,
    'store_url_ios', v_config.store_url_ios,
    'store_url_android', v_config.store_url_android
  );
end;
$$;

-- Allow anonymous + authenticated access (checked before auth)
revoke all on function public.get_app_version_config(text) from public;
grant execute on function public.get_app_version_config(text) to anon, authenticated, service_role;
