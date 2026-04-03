-- ============================================================================
-- StallPass Business Coupon & Discount System
-- 032_coupon_system.sql
-- ============================================================================

create table if not exists public.business_coupons (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  business_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 100),
  description text check (length(description) <= 500),
  coupon_type text not null
    check (coupon_type in ('percent_off', 'dollar_off', 'bogo', 'free_item', 'custom')),
  value numeric check (value is null or value > 0),
  min_purchase numeric check (min_purchase is null or min_purchase >= 0),
  coupon_code text not null check (length(coupon_code) between 1 and 30),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  current_redemptions integer not null default 0,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_active boolean not null default true,
  premium_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_coupons_bathroom
  on public.business_coupons (bathroom_id, is_active, expires_at);

create index if not exists idx_business_coupons_owner
  on public.business_coupons (business_user_id, is_active);

alter table public.business_coupons enable row level security;

-- Business owners can manage their own coupons
drop policy if exists "coupons_select_own" on public.business_coupons;
create policy "coupons_select_own"
  on public.business_coupons for select
  using (
    business_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "coupons_insert_own" on public.business_coupons;
create policy "coupons_insert_own"
  on public.business_coupons for insert
  with check (
    business_user_id = auth.uid()
    and exists (
      select 1 from public.business_claims bc
      where bc.bathroom_id = business_coupons.bathroom_id
        and bc.claimant_user_id = auth.uid()
        and bc.review_status = 'approved'
    )
  );

drop policy if exists "coupons_update_own" on public.business_coupons;
create policy "coupons_update_own"
  on public.business_coupons for update
  using (business_user_id = auth.uid())
  with check (business_user_id = auth.uid());

-- -------------------------------------------------------------------------
-- Coupon redemption tracking
-- -------------------------------------------------------------------------
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.business_coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

create index if not exists idx_coupon_redemptions_coupon
  on public.coupon_redemptions (coupon_id);

create index if not exists idx_coupon_redemptions_user
  on public.coupon_redemptions (user_id, redeemed_at desc);

alter table public.coupon_redemptions enable row level security;

-- Users can see their own redemptions
drop policy if exists "redemptions_select_own" on public.coupon_redemptions;
create policy "redemptions_select_own"
  on public.coupon_redemptions for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.business_coupons bc
      where bc.id = coupon_redemptions.coupon_id
        and bc.business_user_id = auth.uid()
    )
  );

-- Users can insert their own redemptions
drop policy if exists "redemptions_insert_own" on public.coupon_redemptions;
create policy "redemptions_insert_own"
  on public.coupon_redemptions for insert
  with check (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- Public-facing: fetch active coupons for a bathroom
-- -------------------------------------------------------------------------
create or replace function public.fetch_bathroom_coupons(
  p_bathroom_id uuid
)
returns table (
  id uuid,
  title text,
  description text,
  coupon_type text,
  value numeric,
  min_purchase numeric,
  coupon_code text,
  starts_at timestamptz,
  expires_at timestamptz,
  premium_only boolean,
  already_redeemed boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.title,
    c.description,
    c.coupon_type,
    c.value,
    c.min_purchase,
    c.coupon_code,
    c.starts_at,
    c.expires_at,
    c.premium_only,
    exists (
      select 1 from public.coupon_redemptions cr
      where cr.coupon_id = c.id
        and cr.user_id = auth.uid()
    ) as already_redeemed
  from public.business_coupons c
  where c.bathroom_id = p_bathroom_id
    and c.is_active = true
    and c.starts_at <= now()
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_redemptions is null or c.current_redemptions < c.max_redemptions);
$$;

revoke all on function public.fetch_bathroom_coupons(uuid) from public;
grant execute on function public.fetch_bathroom_coupons(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- Redeem a coupon
-- -------------------------------------------------------------------------
create or replace function public.redeem_coupon(
  p_coupon_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_coupon public.business_coupons%rowtype;
  v_redemption_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select * into v_coupon
  from public.business_coupons
  where id = p_coupon_id;

  if v_coupon is null then
    raise exception 'Coupon not found';
  end if;

  if not v_coupon.is_active then
    raise exception 'This coupon is no longer active';
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at < now() then
    raise exception 'This coupon has expired';
  end if;

  if v_coupon.max_redemptions is not null
     and v_coupon.current_redemptions >= v_coupon.max_redemptions then
    raise exception 'This coupon has reached its redemption limit';
  end if;

  -- Check premium requirement
  if v_coupon.premium_only then
    if not exists (
      select 1 from public.profiles p
      where p.id = v_user_id
        and p.is_premium = true
        and (p.premium_expires_at is null or p.premium_expires_at > now())
    ) then
      raise exception 'This coupon is only available to StallPass Premium members';
    end if;
  end if;

  -- Check for duplicate redemption
  if exists (
    select 1 from public.coupon_redemptions cr
    where cr.coupon_id = p_coupon_id and cr.user_id = v_user_id
  ) then
    raise exception 'You have already redeemed this coupon';
  end if;

  -- Insert redemption
  insert into public.coupon_redemptions (coupon_id, user_id)
  values (p_coupon_id, v_user_id)
  returning id into v_redemption_id;

  -- Increment counter
  update public.business_coupons
  set current_redemptions = current_redemptions + 1,
      updated_at = now()
  where id = p_coupon_id;

  -- Also record as a visit from coupon source
  perform public.record_stallpass_visit(v_coupon.bathroom_id, 'coupon_redeem');

  return jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'coupon_code', v_coupon.coupon_code,
    'title', v_coupon.title
  );
end;
$$;

revoke all on function public.redeem_coupon(uuid) from public;
grant execute on function public.redeem_coupon(uuid) to authenticated;

-- -------------------------------------------------------------------------
-- Create coupon RPC (validates business ownership)
-- -------------------------------------------------------------------------
create or replace function public.create_business_coupon(
  p_bathroom_id uuid,
  p_title text,
  p_description text default null,
  p_coupon_type text default 'percent_off',
  p_value numeric default null,
  p_min_purchase numeric default null,
  p_coupon_code text default null,
  p_max_redemptions integer default null,
  p_starts_at timestamptz default now(),
  p_expires_at timestamptz default null,
  p_premium_only boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_coupon_id uuid;
  v_code text;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if not user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'Forbidden: You do not manage this bathroom';
  end if;

  -- Generate code if not provided
  v_code := coalesce(
    nullif(trim(p_coupon_code), ''),
    upper(substring(md5(random()::text) from 1 for 8))
  );

  insert into public.business_coupons (
    bathroom_id, business_user_id, title, description,
    coupon_type, value, min_purchase, coupon_code,
    max_redemptions, starts_at, expires_at, premium_only
  )
  values (
    p_bathroom_id, v_user_id, p_title, p_description,
    p_coupon_type, p_value, p_min_purchase, v_code,
    p_max_redemptions, p_starts_at, p_expires_at, p_premium_only
  )
  returning id into v_coupon_id;

  return jsonb_build_object(
    'success', true,
    'coupon_id', v_coupon_id,
    'coupon_code', v_code
  );
end;
$$;

revoke all on function public.create_business_coupon(uuid, text, text, text, numeric, numeric, text, integer, timestamptz, timestamptz, boolean) from public;
grant execute on function public.create_business_coupon(uuid, text, text, text, numeric, numeric, text, integer, timestamptz, timestamptz, boolean) to authenticated;
