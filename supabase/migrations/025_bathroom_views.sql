-- ============================================================================
-- PeeDom Bathroom View Tracking
-- 025_bathroom_views.sql
-- ============================================================================

create table if not exists public.bathroom_views (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_bathroom_views_bathroom_date
  on public.bathroom_views (bathroom_id, viewed_at desc);

create index if not exists idx_bathroom_views_viewer_bathroom
  on public.bathroom_views (viewer_id, bathroom_id, viewed_at desc)
  where viewer_id is not null;

alter table public.bathroom_views enable row level security;

-- Users can only insert their own views
drop policy if exists "bathroom_views_insert_own" on public.bathroom_views;
create policy "bathroom_views_insert_own"
  on public.bathroom_views for insert
  with check (auth.uid() = viewer_id);

-- No select policy for regular users — views are aggregated server-side only

-- Rate-limited view recording: max 1 per user per bathroom per hour
create or replace function public.record_bathroom_view(
  p_bathroom_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return; -- fail silently for unauthenticated
  end if;

  -- Check rate limit: 1 view per user per bathroom per hour
  if exists (
    select 1
    from public.bathroom_views views
    where views.bathroom_id = p_bathroom_id
      and views.viewer_id = v_user_id
      and views.viewed_at > now() - interval '1 hour'
  ) then
    return; -- already viewed recently, skip silently
  end if;

  insert into public.bathroom_views (bathroom_id, viewer_id)
  values (p_bathroom_id, v_user_id);
end;
$$;

revoke all on function public.record_bathroom_view(uuid) from public;
grant execute on function public.record_bathroom_view(uuid) to authenticated;

-- Update the materialized view to include real weekly_views
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
),
weekly_view_counts as (
  select
    views.bathroom_id,
    count(*)::bigint as weekly_views
  from public.bathroom_views views
  where views.viewed_at > now() - interval '7 days'
  group by views.bathroom_id
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
  coalesce(weekly_view_counts.weekly_views, 0)::bigint as weekly_views,
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
left join weekly_view_counts
  on weekly_view_counts.bathroom_id = bathrooms.id
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
  featured_rollup.active_featured_placements,
  weekly_view_counts.weekly_views;

create unique index if not exists idx_mv_business_analytics_bathroom
  on public.mv_business_analytics (bathroom_id);

create index if not exists idx_mv_business_analytics_owner
  on public.mv_business_analytics (owner_user_id);

refresh materialized view public.mv_business_analytics;
