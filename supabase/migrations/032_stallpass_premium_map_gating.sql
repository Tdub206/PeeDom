-- ============================================================================
-- StallPass Premium Map Gating & Visit Tracking
-- 031_stallpass_premium_map_gating.sql
-- ============================================================================

-- Businesses can choose whether their verified bathroom also shows on the
-- free-tier map. Default TRUE so existing bathrooms remain visible.
alter table public.bathrooms
  add column if not exists show_on_free_map boolean not null default true;

create index if not exists idx_bathrooms_free_map
  on public.bathrooms (show_on_free_map)
  where show_on_free_map = false;

-- -------------------------------------------------------------------------
-- Visit tracking: every time a user opens a bathroom detail screen we log
-- it so the business can see how many people StallPass is sending them.
-- -------------------------------------------------------------------------
create table if not exists public.bathroom_stallpass_visits (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  visited_at timestamptz not null default now(),
  source text not null default 'map_navigation'
    check (source in ('map_navigation', 'search', 'favorite', 'coupon_redeem', 'deep_link')),
  created_at timestamptz not null default now()
);

create index if not exists idx_stallpass_visits_bathroom_date
  on public.bathroom_stallpass_visits (bathroom_id, visited_at desc);

create index if not exists idx_stallpass_visits_user
  on public.bathroom_stallpass_visits (user_id, visited_at desc);

-- Deduplicate: unique per user + bathroom within a 4-hour window is enforced
-- at the application layer to keep the constraint simpler.

alter table public.bathroom_stallpass_visits enable row level security;

-- Users can insert their own visits
drop policy if exists "visits_insert_own" on public.bathroom_stallpass_visits;
create policy "visits_insert_own"
  on public.bathroom_stallpass_visits for insert
  with check (auth.uid() = user_id);

-- Business owners can read visits for their bathrooms
drop policy if exists "visits_select_business" on public.bathroom_stallpass_visits;
create policy "visits_select_business"
  on public.bathroom_stallpass_visits for select
  using (
    exists (
      select 1
      from public.business_claims bc
      where bc.bathroom_id = bathroom_stallpass_visits.bathroom_id
        and bc.claimant_user_id = auth.uid()
        and bc.review_status = 'approved'
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- -------------------------------------------------------------------------
-- Toggle free-map visibility: business owners only
-- -------------------------------------------------------------------------
create or replace function public.toggle_free_map_visibility(
  p_bathroom_id uuid,
  p_show_on_free_map boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if not user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'Forbidden: You do not manage this bathroom';
  end if;

  update public.bathrooms
  set show_on_free_map = p_show_on_free_map,
      updated_at = now()
  where id = p_bathroom_id;

  return jsonb_build_object(
    'success', true,
    'bathroom_id', p_bathroom_id,
    'show_on_free_map', p_show_on_free_map
  );
end;
$$;

revoke all on function public.toggle_free_map_visibility(uuid, boolean) from public;
grant execute on function public.toggle_free_map_visibility(uuid, boolean) to authenticated;

-- -------------------------------------------------------------------------
-- Record a StallPass visit (with 4-hour dedup)
-- -------------------------------------------------------------------------
create or replace function public.record_stallpass_visit(
  p_bathroom_id uuid,
  p_source text default 'map_navigation'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_visit_id uuid;
  v_recent_exists boolean;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  -- 4-hour dedup window
  select exists (
    select 1
    from public.bathroom_stallpass_visits v
    where v.bathroom_id = p_bathroom_id
      and v.user_id = v_user_id
      and v.visited_at > now() - interval '4 hours'
  ) into v_recent_exists;

  if v_recent_exists then
    return jsonb_build_object('success', true, 'deduplicated', true);
  end if;

  insert into public.bathroom_stallpass_visits (bathroom_id, user_id, source)
  values (p_bathroom_id, v_user_id, p_source)
  returning id into v_visit_id;

  return jsonb_build_object(
    'success', true,
    'deduplicated', false,
    'visit_id', v_visit_id
  );
end;
$$;

revoke all on function public.record_stallpass_visit(uuid, text) from public;
grant execute on function public.record_stallpass_visit(uuid, text) to authenticated;

-- -------------------------------------------------------------------------
-- Fetch visit stats for business dashboard
-- -------------------------------------------------------------------------
create or replace function public.get_business_visit_stats(
  p_user_id uuid
)
returns table (
  bathroom_id uuid,
  total_visits bigint,
  visits_this_week bigint,
  visits_this_month bigint,
  unique_visitors bigint,
  top_source text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.bathroom_id,
    count(*) as total_visits,
    count(*) filter (where v.visited_at > now() - interval '7 days') as visits_this_week,
    count(*) filter (where v.visited_at > now() - interval '30 days') as visits_this_month,
    count(distinct v.user_id) as unique_visitors,
    (
      select v2.source
      from public.bathroom_stallpass_visits v2
      where v2.bathroom_id = v.bathroom_id
      group by v2.source
      order by count(*) desc
      limit 1
    ) as top_source
  from public.bathroom_stallpass_visits v
  where exists (
    select 1
    from public.business_claims bc
    where bc.bathroom_id = v.bathroom_id
      and bc.claimant_user_id = p_user_id
      and bc.review_status = 'approved'
  )
  group by v.bathroom_id;
$$;

revoke all on function public.get_business_visit_stats(uuid) from public;
grant execute on function public.get_business_visit_stats(uuid) to authenticated;
