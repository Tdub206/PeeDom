-- ============================================================================
-- Option A: NFC and lock integration preparation
-- 044_option_a_nfc_schema.sql
-- Adds future-proof hardware integration tables without changing the current
-- Expo + Supabase runtime contract.
-- ============================================================================

create table if not exists public.bathroom_lock_integrations (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null unique references public.bathrooms(id) on delete cascade,
  vendor_id uuid references public.hardware_lock_vendors(id) on delete set null,
  integration_status text not null default 'planned' check (
    integration_status in ('planned', 'testing', 'live')
  ),
  remote_lock_id text,
  supports_temporary_tokens boolean not null default false,
  notes text,
  last_handshake_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bathroom_lock_integrations_vendor
  on public.bathroom_lock_integrations (vendor_id, integration_status);

alter table public.bathroom_lock_integrations enable row level security;

drop policy if exists "bathroom_lock_integrations_select_managers" on public.bathroom_lock_integrations;
create policy "bathroom_lock_integrations_select_managers"
  on public.bathroom_lock_integrations for select
  using (
    public.is_admin_user(auth.uid())
    or public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
  );

create table if not exists public.bathroom_lock_access_audit (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.bathroom_lock_integrations(id) on delete cascade,
  requested_by uuid references public.profiles(id) on delete set null,
  access_outcome text not null check (
    access_outcome in ('granted', 'denied', 'expired', 'error')
  ),
  request_source text not null check (
    request_source in ('manual', 'nfc', 'support_override')
  ),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_bathroom_lock_access_audit_integration
  on public.bathroom_lock_access_audit (integration_id, created_at desc);

create index if not exists idx_bathroom_lock_access_audit_requested_by
  on public.bathroom_lock_access_audit (requested_by, created_at desc)
  where requested_by is not null;

alter table public.bathroom_lock_access_audit enable row level security;

drop policy if exists "bathroom_lock_access_audit_select_managers" on public.bathroom_lock_access_audit;
create policy "bathroom_lock_access_audit_select_managers"
  on public.bathroom_lock_access_audit for select
  using (
    public.is_admin_user(auth.uid())
    or exists (
      select 1
      from public.bathroom_lock_integrations integrations
      where integrations.id = integration_id
        and public.user_can_manage_business_bathroom(auth.uid(), integrations.bathroom_id)
    )
  );

create or replace function public.set_bathroom_lock_integrations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_bathroom_lock_integrations_updated_at on public.bathroom_lock_integrations;
create trigger set_bathroom_lock_integrations_updated_at
  before update on public.bathroom_lock_integrations
  for each row
  execute function public.set_bathroom_lock_integrations_updated_at();
