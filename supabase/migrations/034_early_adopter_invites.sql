-- ============================================================================
-- Early Adopter Lifetime-Free Invite System
-- 034_early_adopter_invites.sql
-- ============================================================================

create table if not exists public.early_adopter_invites (
  id uuid primary key default gen_random_uuid(),
  invite_token text not null unique,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  target_email text,
  target_business_name text,
  notes text check (length(notes) <= 500),
  expires_at timestamptz not null,
  redeemed_by uuid references public.profiles(id),
  redeemed_at timestamptz,
  grants_lifetime boolean not null default true,
  status text not null default 'pending'
    check (status in ('pending', 'redeemed', 'expired', 'revoked')),
  created_at timestamptz not null default now()
);

create index if not exists idx_early_adopter_token
  on public.early_adopter_invites (invite_token);

create index if not exists idx_early_adopter_invited_by
  on public.early_adopter_invites (invited_by, created_at desc);

create index if not exists idx_early_adopter_status
  on public.early_adopter_invites (status, expires_at)
  where status = 'pending';

alter table public.early_adopter_invites enable row level security;

-- Admin can see all invites
drop policy if exists "invites_select_admin" on public.early_adopter_invites;
create policy "invites_select_admin"
  on public.early_adopter_invites for select
  using (
    invited_by = auth.uid()
    or redeemed_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Only admins can create invites
drop policy if exists "invites_insert_admin" on public.early_adopter_invites;
create policy "invites_insert_admin"
  on public.early_adopter_invites for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Add lifetime tracking to business claims
alter table public.business_claims
  add column if not exists is_lifetime_free boolean not null default false;

alter table public.business_claims
  add column if not exists invite_id uuid references public.early_adopter_invites(id);

-- -------------------------------------------------------------------------
-- Generate an early adopter invite (admin only)
-- -------------------------------------------------------------------------
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

  -- Generate a short, human-friendly token (8 chars alphanumeric uppercase)
  v_token := upper(substring(
    replace(replace(encode(gen_random_bytes(6), 'base64'), '+', ''), '/', '')
    from 1 for 8
  ));

  v_expires_at := now() + (p_expiry_days || ' days')::interval;

  insert into public.early_adopter_invites (
    invite_token, invited_by, target_email,
    target_business_name, notes, expires_at
  )
  values (
    v_token, v_user_id, p_target_email,
    p_target_business_name, p_notes, v_expires_at
  )
  returning id into v_invite_id;

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

-- -------------------------------------------------------------------------
-- Redeem an early adopter invite (business owner registering)
-- -------------------------------------------------------------------------
create or replace function public.redeem_early_adopter_invite(
  p_invite_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.early_adopter_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select * into v_invite
  from public.early_adopter_invites
  where invite_token = upper(trim(p_invite_token));

  if v_invite is null then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.status = 'redeemed' then
    raise exception 'This invite has already been used';
  end if;

  if v_invite.status = 'expired' or v_invite.expires_at < now() then
    -- Auto-expire if not already marked
    update public.early_adopter_invites
    set status = 'expired'
    where id = v_invite.id and status = 'pending';

    raise exception 'This invite has expired';
  end if;

  if v_invite.status = 'revoked' then
    raise exception 'This invite has been revoked';
  end if;

  -- Mark invite as redeemed
  update public.early_adopter_invites
  set status = 'redeemed',
      redeemed_by = v_user_id,
      redeemed_at = now()
  where id = v_invite.id;

  -- Mark ALL existing approved claims by this user as lifetime
  update public.business_claims
  set is_lifetime_free = true,
      invite_id = v_invite.id
  where claimant_user_id = v_user_id
    and review_status = 'approved';

  -- Upgrade the user to business role if not already
  update public.profiles
  set role = 'business',
      updated_at = now()
  where id = v_user_id
    and role = 'user';

  return jsonb_build_object(
    'success', true,
    'invite_id', v_invite.id,
    'is_lifetime_free', true,
    'message', 'Welcome to StallPass! Your business account is now lifetime-free.'
  );
end;
$$;

revoke all on function public.redeem_early_adopter_invite(text) from public;
grant execute on function public.redeem_early_adopter_invite(text) to authenticated;

-- -------------------------------------------------------------------------
-- Fetch invite status (for admin dashboard)
-- -------------------------------------------------------------------------
create or replace function public.fetch_early_adopter_invites(
  p_status_filter text default null
)
returns table (
  id uuid,
  invite_token text,
  target_business_name text,
  target_email text,
  notes text,
  expires_at timestamptz,
  status text,
  redeemed_by uuid,
  redeemed_at timestamptz,
  created_at timestamptz,
  redeemer_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.invite_token,
    i.target_business_name,
    i.target_email,
    i.notes,
    i.expires_at,
    i.status,
    i.redeemed_by,
    i.redeemed_at,
    i.created_at,
    p.display_name as redeemer_display_name
  from public.early_adopter_invites i
  left join public.profiles p on p.id = i.redeemed_by
  where i.invited_by = auth.uid()
    and (p_status_filter is null or i.status = p_status_filter)
  order by i.created_at desc;
$$;

revoke all on function public.fetch_early_adopter_invites(text) from public;
grant execute on function public.fetch_early_adopter_invites(text) to authenticated;

-- -------------------------------------------------------------------------
-- Auto-expire cron: mark pending invites past their expiry date
-- (Run via pg_cron or Supabase Edge Function daily)
-- -------------------------------------------------------------------------
create or replace function public.expire_stale_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.early_adopter_invites
  set status = 'expired'
  where status = 'pending'
    and expires_at < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
