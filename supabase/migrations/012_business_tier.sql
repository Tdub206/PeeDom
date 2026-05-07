-- ============================================================================
-- StallPass Business Tier
-- 012_business_tier.sql
-- ============================================================================

create unique index if not exists idx_business_claims_single_approved_per_bathroom
  on public.business_claims (bathroom_id)
  where review_status = 'approved';

create or replace function public.user_can_manage_business_bathroom(
  p_user_id uuid,
  p_bathroom_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id = p_bathroom_id
      and (
        bathrooms.created_by = p_user_id
        or exists (
          select 1
          from public.business_claims claims
          where claims.bathroom_id = bathrooms.id
            and claims.claimant_user_id = p_user_id
            and claims.review_status = 'approved'
        )
        or exists (
          select 1
          from public.profiles profiles
          where profiles.id = p_user_id
            and profiles.role = 'admin'
        )
      )
  );
$$;

create or replace function public.user_has_business_dashboard_access(
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profiles
    where profiles.id = p_user_id
      and profiles.role in ('business', 'admin')
  ) or exists (
    select 1
    from public.business_claims claims
    where claims.claimant_user_id = p_user_id
      and claims.review_status = 'approved'
  ) or exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.created_by = p_user_id
      and bathrooms.moderation_status = 'active'
  );
$$;

revoke all on function public.user_can_manage_business_bathroom(uuid, uuid) from public;
grant execute on function public.user_can_manage_business_bathroom(uuid, uuid) to authenticated, service_role;

revoke all on function public.user_has_business_dashboard_access(uuid) from public;
grant execute on function public.user_has_business_dashboard_access(uuid) to authenticated, service_role;

create table if not exists public.business_verification_badges (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  claim_id uuid not null references public.business_claims(id) on delete cascade,
  verified_at timestamptz not null default now(),
  verified_by uuid references public.profiles(id),
  badge_type text not null default 'standard' check (
    badge_type in ('standard', 'premium', 'featured')
  ),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bathroom_id)
);

create index if not exists idx_business_verification_badges_bathroom
  on public.business_verification_badges (bathroom_id);

create index if not exists idx_business_verification_badges_claim
  on public.business_verification_badges (claim_id);

create table if not exists public.business_featured_placements (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  business_user_id uuid not null references public.profiles(id) on delete cascade,
  placement_type text not null check (
    placement_type in ('search_top', 'map_priority', 'nearby_featured')
  ),
  geographic_scope jsonb not null check (jsonb_typeof(geographic_scope) = 'object'),
  start_date timestamptz not null,
  end_date timestamptz not null,
  impressions_count integer not null default 0,
  clicks_count integer not null default 0,
  status text not null default 'active' check (
    status in ('active', 'paused', 'expired', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date > start_date),
  check (impressions_count >= 0),
  check (clicks_count >= 0)
);

create index if not exists idx_business_featured_placements_bathroom
  on public.business_featured_placements (bathroom_id);

create index if not exists idx_business_featured_placements_owner
  on public.business_featured_placements (business_user_id, status, end_date desc);

create index if not exists idx_business_featured_placements_status_dates
  on public.business_featured_placements (status, start_date, end_date);

create table if not exists public.business_hours_updates (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  updated_by uuid not null references public.profiles(id) on delete cascade,
  old_hours jsonb,
  new_hours jsonb not null,
  update_source text not null check (
    update_source in ('business_dashboard', 'admin_panel', 'community_report')
  ),
  created_at timestamptz not null default now(),
  check (old_hours is null or jsonb_typeof(old_hours) = 'object'),
  check (jsonb_typeof(new_hours) = 'object')
);

create index if not exists idx_business_hours_updates_bathroom
  on public.business_hours_updates (bathroom_id, created_at desc);

create or replace function public.set_business_featured_placements_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_featured_placements_updated_at on public.business_featured_placements;
create trigger set_business_featured_placements_updated_at
  before update on public.business_featured_placements
  for each row
  execute function public.set_business_featured_placements_updated_at();

create or replace function public.sync_business_verification_badge_state(
  p_bathroom_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_id uuid;
  v_verified_at timestamptz;
  v_verified_by uuid;
  v_badge_type text := 'standard';
begin
  select
    claims.id,
    coalesce(claims.reviewed_at, claims.updated_at, claims.created_at),
    claims.reviewed_by
  into
    v_claim_id,
    v_verified_at,
    v_verified_by
  from public.business_claims claims
  where claims.bathroom_id = p_bathroom_id
    and claims.review_status = 'approved'
  order by claims.reviewed_at desc nulls last, claims.updated_at desc, claims.created_at desc
  limit 1;

  if v_claim_id is null then
    delete from public.business_verification_badges
    where bathroom_id = p_bathroom_id;

    return;
  end if;

  if exists (
    select 1
    from public.business_featured_placements placements
    where placements.bathroom_id = p_bathroom_id
      and placements.status = 'active'
      and placements.start_date <= now()
      and placements.end_date >= now()
  ) then
    v_badge_type := 'featured';
  end if;

  insert into public.business_verification_badges (
    bathroom_id,
    claim_id,
    verified_at,
    verified_by,
    badge_type
  )
  values (
    p_bathroom_id,
    v_claim_id,
    v_verified_at,
    v_verified_by,
    v_badge_type
  )
  on conflict (bathroom_id) do update
  set
    claim_id = excluded.claim_id,
    verified_at = excluded.verified_at,
    verified_by = excluded.verified_by,
    badge_type = excluded.badge_type,
    expires_at = null;
end;
$$;

revoke all on function public.sync_business_verification_badge_state(uuid) from public;
grant execute on function public.sync_business_verification_badge_state(uuid) to service_role;

create or replace function public.handle_business_claim_badge_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_business_verification_badge_state(coalesce(new.bathroom_id, old.bathroom_id));

  if tg_op <> 'DELETE' and new.review_status = 'approved' then
    update public.profiles
    set role = case when role = 'user' then 'business' else role end,
        updated_at = now()
    where id = new.claimant_user_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists handle_business_claim_badge_sync on public.business_claims;
create trigger handle_business_claim_badge_sync
  after insert or update or delete on public.business_claims
  for each row
  execute function public.handle_business_claim_badge_sync();

create or replace function public.handle_business_featured_badge_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_business_verification_badge_state(coalesce(new.bathroom_id, old.bathroom_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists handle_business_featured_badge_sync on public.business_featured_placements;
create trigger handle_business_featured_badge_sync
  after insert or update or delete on public.business_featured_placements
  for each row
  execute function public.handle_business_featured_badge_sync();

alter table public.business_verification_badges enable row level security;
alter table public.business_featured_placements enable row level security;
alter table public.business_hours_updates enable row level security;

drop policy if exists "business_verification_badges_select_public" on public.business_verification_badges;
create policy "business_verification_badges_select_public"
  on public.business_verification_badges for select
  using (true);

drop policy if exists "business_featured_placements_select_own" on public.business_featured_placements;
create policy "business_featured_placements_select_own"
  on public.business_featured_placements for select
  using (auth.uid() = business_user_id);

drop policy if exists "business_featured_placements_insert_own" on public.business_featured_placements;
create policy "business_featured_placements_insert_own"
  on public.business_featured_placements for insert
  with check (
    auth.uid() = business_user_id
    and public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
  );

drop policy if exists "business_featured_placements_update_own" on public.business_featured_placements;
create policy "business_featured_placements_update_own"
  on public.business_featured_placements for update
  using (auth.uid() = business_user_id)
  with check (
    auth.uid() = business_user_id
    and public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
  );

drop policy if exists "business_featured_placements_delete_own" on public.business_featured_placements;
create policy "business_featured_placements_delete_own"
  on public.business_featured_placements for delete
  using (auth.uid() = business_user_id);

drop policy if exists "business_hours_updates_select_own_bathroom" on public.business_hours_updates;
create policy "business_hours_updates_select_own_bathroom"
  on public.business_hours_updates for select
  using (public.user_can_manage_business_bathroom(auth.uid(), bathroom_id));

drop materialized view if exists public.mv_business_analytics;
create materialized view public.mv_business_analytics as
with approved_claims as (
  select distinct on (claims.bathroom_id)
    claims.bathroom_id,
    claims.id as claim_id,
    claims.claimant_user_id as owner_user_id,
    claims.business_name
  from public.business_claims claims
  where claims.review_status = 'approved'
  order by claims.bathroom_id, claims.reviewed_at desc nulls last, claims.updated_at desc, claims.created_at desc
),
active_badges as (
  select
    badges.bathroom_id,
    badges.badge_type
  from public.business_verification_badges badges
  where badges.expires_at is null
     or badges.expires_at > now()
),
featured_rollup as (
  select
    placements.bathroom_id,
    count(*) filter (
      where placements.status = 'active'
        and placements.start_date <= now()
        and placements.end_date >= now()
    )::bigint as active_featured_placements
  from public.business_featured_placements placements
  group by placements.bathroom_id
)
select
  bathrooms.id as bathroom_id,
  coalesce(approved_claims.owner_user_id, bathrooms.created_by) as owner_user_id,
  approved_claims.claim_id,
  bathrooms.place_name,
  approved_claims.business_name,
  count(distinct favorites.user_id)::bigint as total_favorites,
  count(distinct reports.id) filter (where reports.status = 'open')::bigint as open_reports,
  round(coalesce(avg(ratings.rating), 0)::numeric, 2) as avg_cleanliness_rating,
  count(distinct ratings.id)::bigint as total_ratings,
  0::bigint as weekly_views,
  active_badges.badge_type as verification_badge_type,
  coalesce(featured_rollup.active_featured_placements, 0) > 0 as has_active_featured_placement,
  coalesce(featured_rollup.active_featured_placements, 0)::bigint as active_featured_placements,
  greatest(
    bathrooms.updated_at,
    coalesce(max(reports.updated_at), bathrooms.updated_at),
    coalesce(max(ratings.created_at), bathrooms.updated_at)
  ) as last_data_update
from public.bathrooms bathrooms
left join approved_claims
  on approved_claims.bathroom_id = bathrooms.id
left join active_badges
  on active_badges.bathroom_id = bathrooms.id
left join featured_rollup
  on featured_rollup.bathroom_id = bathrooms.id
left join public.favorites favorites
  on favorites.bathroom_id = bathrooms.id
left join public.bathroom_reports reports
  on reports.bathroom_id = bathrooms.id
left join public.cleanliness_ratings ratings
  on ratings.bathroom_id = bathrooms.id
where bathrooms.moderation_status = 'active'
  and coalesce(approved_claims.owner_user_id, bathrooms.created_by) is not null
group by
  bathrooms.id,
  coalesce(approved_claims.owner_user_id, bathrooms.created_by),
  approved_claims.claim_id,
  bathrooms.place_name,
  approved_claims.business_name,
  active_badges.badge_type,
  featured_rollup.active_featured_placements;

create unique index if not exists idx_mv_business_analytics_bathroom
  on public.mv_business_analytics (bathroom_id);

create index if not exists idx_mv_business_analytics_owner
  on public.mv_business_analytics (owner_user_id);

create or replace function public.refresh_business_analytics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.mv_business_analytics;
end;
$$;

create or replace function public.get_business_dashboard_analytics(
  p_user_id uuid
)
returns table (
  bathroom_id uuid,
  claim_id uuid,
  place_name text,
  business_name text,
  total_favorites bigint,
  open_reports bigint,
  avg_cleanliness numeric,
  total_ratings bigint,
  weekly_views bigint,
  verification_badge_type text,
  has_verification_badge boolean,
  has_active_featured_placement boolean,
  active_featured_placements bigint,
  last_updated timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_user_id uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_current_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select exists (
    select 1
    from public.profiles profiles
    where profiles.id = v_current_user_id
      and profiles.role = 'admin'
  ) into v_is_admin;

  if v_current_user_id <> p_user_id and not v_is_admin then
    raise exception 'Unauthorized: You can only access your own business analytics';
  end if;

  if not public.user_has_business_dashboard_access(p_user_id) then
    raise exception 'Unauthorized: User does not have business access';
  end if;

  return query
  select
    analytics.bathroom_id,
    analytics.claim_id,
    analytics.place_name,
    analytics.business_name,
    analytics.total_favorites,
    analytics.open_reports,
    analytics.avg_cleanliness_rating as avg_cleanliness,
    analytics.total_ratings,
    analytics.weekly_views,
    analytics.verification_badge_type,
    analytics.verification_badge_type is not null as has_verification_badge,
    analytics.has_active_featured_placement,
    analytics.active_featured_placements,
    analytics.last_data_update as last_updated
  from public.mv_business_analytics analytics
  where analytics.owner_user_id = p_user_id
  order by analytics.last_data_update desc, analytics.place_name asc;
end;
$$;

create or replace function public.update_business_bathroom_hours(
  p_bathroom_id uuid,
  p_new_hours jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_hours jsonb;
  v_updated_at timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_new_hours, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid hours payload';
  end if;

  if not public.user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'Unauthorized: User does not own or manage this bathroom';
  end if;

  select bathrooms.hours_json
  into v_old_hours
  from public.bathrooms bathrooms
  where bathrooms.id = p_bathroom_id;

  insert into public.business_hours_updates (
    bathroom_id,
    updated_by,
    old_hours,
    new_hours,
    update_source
  )
  values (
    p_bathroom_id,
    v_user_id,
    v_old_hours,
    p_new_hours,
    'business_dashboard'
  );

  update public.bathrooms
  set hours_json = p_new_hours,
      updated_at = v_updated_at
  where id = p_bathroom_id;

  return jsonb_build_object(
    'success', true,
    'bathroom_id', p_bathroom_id,
    'updated_at', v_updated_at
  );
end;
$$;

revoke all on function public.refresh_business_analytics() from public;
grant execute on function public.refresh_business_analytics() to service_role;

revoke all on function public.get_business_dashboard_analytics(uuid) from public;
grant execute on function public.get_business_dashboard_analytics(uuid) to authenticated, service_role;

revoke all on function public.update_business_bathroom_hours(uuid, jsonb) from public;
grant execute on function public.update_business_bathroom_hours(uuid, jsonb) to authenticated, service_role;

refresh materialized view public.mv_business_analytics;
