-- ============================================================================
-- StallPass Business Portal Expansion
-- 031_stallpass_business_portal.sql
-- Adds premium-only StallPass visibility controls, business promotions,
-- attributable navigation analytics, and growth invite redemption.
-- ============================================================================

create table if not exists public.business_bathroom_settings (
  bathroom_id uuid primary key references public.bathrooms(id) on delete cascade,
  requires_premium_access boolean not null default false,
  show_on_free_map boolean not null default false,
  is_location_verified boolean not null default false,
  location_verified_at timestamptz,
  pricing_plan text not null default 'standard' check (pricing_plan in ('standard', 'lifetime')),
  pricing_plan_granted_at timestamptz,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (is_location_verified = false and location_verified_at is null)
    or (is_location_verified = true and location_verified_at is not null)
  ),
  check (
    (pricing_plan = 'standard' and pricing_plan_granted_at is null)
    or (pricing_plan = 'lifetime' and pricing_plan_granted_at is not null)
  )
);

create index if not exists idx_business_bathroom_settings_plan
  on public.business_bathroom_settings (pricing_plan, updated_at desc);

create table if not exists public.bathroom_navigation_events (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now()
);

create index if not exists idx_bathroom_navigation_events_bathroom_date
  on public.bathroom_navigation_events (bathroom_id, opened_at desc);

create index if not exists idx_bathroom_navigation_events_viewer_bathroom
  on public.bathroom_navigation_events (viewer_id, bathroom_id, opened_at desc)
  where viewer_id is not null;

create table if not exists public.business_promotions (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  business_user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  offer_type text not null check (
    offer_type in ('percentage', 'amount_off', 'freebie', 'custom')
  ),
  offer_value numeric(10, 2),
  promo_code text,
  redemption_instructions text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  redemptions_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (redemptions_count >= 0),
  check (
    ends_at is null
    or starts_at is null
    or ends_at > starts_at
  ),
  check (
    (
      offer_type in ('percentage', 'amount_off')
      and offer_value is not null
      and offer_value > 0
    )
    or (
      offer_type in ('freebie', 'custom')
      and offer_value is null
    )
  ),
  check (
    offer_type <> 'percentage'
    or offer_value <= 100
  )
);

create index if not exists idx_business_promotions_bathroom
  on public.business_promotions (bathroom_id, is_active, updated_at desc);

create index if not exists idx_business_promotions_owner
  on public.business_promotions (business_user_id, updated_at desc);

create table if not exists public.business_growth_invites (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  invite_code text not null unique,
  contacted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  benefit_type text not null default 'lifetime' check (benefit_type = 'lifetime'),
  created_by uuid references public.profiles(id),
  redeemed_by uuid references public.profiles(id),
  redeemed_claim_id uuid references public.business_claims(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > contacted_at),
  check (
    (redeemed_at is null and redeemed_by is null and redeemed_claim_id is null)
    or (redeemed_at is not null and redeemed_by is not null and redeemed_claim_id is not null)
  )
);

create index if not exists idx_business_growth_invites_bathroom
  on public.business_growth_invites (bathroom_id, expires_at desc);

create index if not exists idx_business_growth_invites_redeemed
  on public.business_growth_invites (redeemed_by, redeemed_at desc)
  where redeemed_by is not null;

create or replace function public.set_business_portal_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_business_bathroom_settings_updated_at on public.business_bathroom_settings;
create trigger set_business_bathroom_settings_updated_at
  before update on public.business_bathroom_settings
  for each row
  execute function public.set_business_portal_updated_at();

drop trigger if exists set_business_promotions_updated_at on public.business_promotions;
create trigger set_business_promotions_updated_at
  before update on public.business_promotions
  for each row
  execute function public.set_business_portal_updated_at();

drop trigger if exists set_business_growth_invites_updated_at on public.business_growth_invites;
create trigger set_business_growth_invites_updated_at
  before update on public.business_growth_invites
  for each row
  execute function public.set_business_portal_updated_at();

alter table public.business_bathroom_settings enable row level security;
alter table public.bathroom_navigation_events enable row level security;
alter table public.business_promotions enable row level security;
alter table public.business_growth_invites enable row level security;

drop policy if exists "business_bathroom_settings_select_own" on public.business_bathroom_settings;
create policy "business_bathroom_settings_select_own"
  on public.business_bathroom_settings for select
  using (public.user_can_manage_business_bathroom(auth.uid(), bathroom_id));

drop policy if exists "business_bathroom_settings_insert_own" on public.business_bathroom_settings;
create policy "business_bathroom_settings_insert_own"
  on public.business_bathroom_settings for insert
  with check (public.user_can_manage_business_bathroom(auth.uid(), bathroom_id));

drop policy if exists "business_bathroom_settings_update_own" on public.business_bathroom_settings;
create policy "business_bathroom_settings_update_own"
  on public.business_bathroom_settings for update
  using (public.user_can_manage_business_bathroom(auth.uid(), bathroom_id))
  with check (public.user_can_manage_business_bathroom(auth.uid(), bathroom_id));

drop policy if exists "bathroom_navigation_events_insert_own" on public.bathroom_navigation_events;
create policy "bathroom_navigation_events_insert_own"
  on public.bathroom_navigation_events for insert
  with check (auth.uid() = viewer_id);

drop policy if exists "business_promotions_select_own" on public.business_promotions;
create policy "business_promotions_select_own"
  on public.business_promotions for select
  using (public.user_can_manage_business_bathroom(auth.uid(), bathroom_id));

drop policy if exists "business_promotions_insert_own" on public.business_promotions;
create policy "business_promotions_insert_own"
  on public.business_promotions for insert
  with check (
    auth.uid() = business_user_id
    and public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
  );

drop policy if exists "business_promotions_update_own" on public.business_promotions;
create policy "business_promotions_update_own"
  on public.business_promotions for update
  using (
    auth.uid() = business_user_id
    and public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
  )
  with check (
    auth.uid() = business_user_id
    and public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
  );

drop policy if exists "business_promotions_delete_own" on public.business_promotions;
create policy "business_promotions_delete_own"
  on public.business_promotions for delete
  using (
    auth.uid() = business_user_id
    and public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
  );

drop policy if exists "business_growth_invites_select_manager_or_admin" on public.business_growth_invites;
create policy "business_growth_invites_select_manager_or_admin"
  on public.business_growth_invites for select
  using (
    public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
    or exists (
      select 1
      from public.profiles profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create or replace function public.viewer_has_active_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profiles
    where profiles.id = auth.uid()
      and public.profile_has_active_premium(
        profiles.is_premium,
        profiles.premium_expires_at
      )
  );
$$;

create or replace function public.record_bathroom_navigation(
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
    return;
  end if;

  if exists (
    select 1
    from public.bathroom_navigation_events events
    where events.bathroom_id = p_bathroom_id
      and events.viewer_id = v_user_id
      and events.opened_at > now() - interval '30 minutes'
  ) then
    return;
  end if;

  insert into public.bathroom_navigation_events (bathroom_id, viewer_id)
  values (p_bathroom_id, v_user_id);
end;
$$;

create or replace function public.upsert_business_bathroom_settings(
  p_bathroom_id uuid,
  p_requires_premium_access boolean default false,
  p_show_on_free_map boolean default false,
  p_is_location_verified boolean default false
)
returns setof public.business_bathroom_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_verified_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'BUSINESS_ACCESS_REQUIRED';
  end if;

  select settings.location_verified_at
  into v_existing_verified_at
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;

  insert into public.business_bathroom_settings (
    bathroom_id,
    requires_premium_access,
    show_on_free_map,
    is_location_verified,
    location_verified_at,
    updated_by
  )
  values (
    p_bathroom_id,
    p_requires_premium_access,
    case when p_requires_premium_access then p_show_on_free_map else true end,
    p_is_location_verified,
    case
      when p_is_location_verified then coalesce(v_existing_verified_at, now())
      else null
    end,
    v_user_id
  )
  on conflict (bathroom_id) do update
  set
    requires_premium_access = excluded.requires_premium_access,
    show_on_free_map = excluded.show_on_free_map,
    is_location_verified = excluded.is_location_verified,
    location_verified_at = excluded.location_verified_at,
    updated_by = excluded.updated_by;

  perform public.sync_business_verification_badge_state(p_bathroom_id);

  return query
  select settings.*
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;
end;
$$;

create or replace function public.upsert_business_promotion(
  p_promotion_id uuid default null,
  p_bathroom_id uuid default null,
  p_title text default null,
  p_description text default null,
  p_offer_type text default null,
  p_offer_value numeric default null,
  p_promo_code text default null,
  p_redemption_instructions text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_is_active boolean default true
)
returns setof public.business_promotions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_bathroom_id uuid := p_bathroom_id;
  v_promotion_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_promotion_id is not null then
    select promotions.bathroom_id
    into v_target_bathroom_id
    from public.business_promotions promotions
    where promotions.id = p_promotion_id;
  end if;

  if v_target_bathroom_id is null then
    raise exception 'PROMOTION_BATHROOM_REQUIRED';
  end if;

  if not public.user_can_manage_business_bathroom(v_user_id, v_target_bathroom_id) then
    raise exception 'BUSINESS_ACCESS_REQUIRED';
  end if;

  if p_offer_type not in ('percentage', 'amount_off', 'freebie', 'custom') then
    raise exception 'INVALID_PROMOTION_TYPE';
  end if;

  if p_offer_type in ('percentage', 'amount_off') and (p_offer_value is null or p_offer_value <= 0) then
    raise exception 'PROMOTION_VALUE_REQUIRED';
  end if;

  if p_offer_type = 'percentage' and p_offer_value > 100 then
    raise exception 'PROMOTION_VALUE_TOO_LARGE';
  end if;

  if p_offer_type in ('freebie', 'custom') and p_offer_value is not null then
    raise exception 'PROMOTION_VALUE_NOT_ALLOWED';
  end if;

  if p_starts_at is not null and p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'PROMOTION_WINDOW_INVALID';
  end if;

  if p_promotion_id is null then
    insert into public.business_promotions (
      bathroom_id,
      business_user_id,
      title,
      description,
      offer_type,
      offer_value,
      promo_code,
      redemption_instructions,
      starts_at,
      ends_at,
      is_active
    )
    values (
      v_target_bathroom_id,
      v_user_id,
      trim(coalesce(p_title, '')),
      trim(coalesce(p_description, '')),
      p_offer_type,
      case when p_offer_type in ('percentage', 'amount_off') then p_offer_value else null end,
      nullif(upper(trim(coalesce(p_promo_code, ''))), ''),
      trim(coalesce(p_redemption_instructions, '')),
      p_starts_at,
      p_ends_at,
      p_is_active
    )
    returning id into v_promotion_id;
  else
    update public.business_promotions
    set
      title = trim(coalesce(p_title, title)),
      description = trim(coalesce(p_description, description)),
      offer_type = coalesce(p_offer_type, offer_type),
      offer_value = case
        when coalesce(p_offer_type, offer_type) in ('percentage', 'amount_off') then p_offer_value
        else null
      end,
      promo_code = nullif(upper(trim(coalesce(p_promo_code, promo_code, ''))), ''),
      redemption_instructions = trim(coalesce(p_redemption_instructions, redemption_instructions)),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      is_active = p_is_active
    where id = p_promotion_id
      and business_user_id = v_user_id
    returning id into v_promotion_id;
  end if;

  return query
  select promotions.*
  from public.business_promotions promotions
  where promotions.id = v_promotion_id;
end;
$$;

create or replace function public.redeem_business_growth_invite(
  p_bathroom_id uuid,
  p_claim_id uuid,
  p_invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.business_growth_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select invites.*
  into v_invite
  from public.business_growth_invites invites
  where invites.bathroom_id = p_bathroom_id
    and upper(invites.invite_code) = upper(trim(coalesce(p_invite_code, '')))
  order by invites.expires_at desc
  limit 1;

  if v_invite.id is null then
    raise exception 'INVITE_NOT_FOUND';
  end if;

  if v_invite.redeemed_at is not null then
    raise exception 'INVITE_ALREADY_REDEEMED';
  end if;

  if v_invite.expires_at <= now() then
    raise exception 'INVITE_EXPIRED';
  end if;

  if not exists (
    select 1
    from public.business_claims claims
    where claims.id = p_claim_id
      and claims.bathroom_id = p_bathroom_id
      and claims.claimant_user_id = v_user_id
  ) then
    raise exception 'CLAIM_NOT_FOUND';
  end if;

  update public.business_growth_invites
  set
    redeemed_by = v_user_id,
    redeemed_claim_id = p_claim_id,
    redeemed_at = now()
  where id = v_invite.id;

  insert into public.business_bathroom_settings (
    bathroom_id,
    pricing_plan,
    pricing_plan_granted_at,
    updated_by
  )
  values (
    p_bathroom_id,
    'lifetime',
    now(),
    v_user_id
  )
  on conflict (bathroom_id) do update
  set
    pricing_plan = 'lifetime',
    pricing_plan_granted_at = coalesce(
      public.business_bathroom_settings.pricing_plan_granted_at,
      now()
    ),
    updated_by = v_user_id;

  return jsonb_build_object(
    'success', true,
    'bathroom_id', p_bathroom_id,
    'pricing_plan', 'lifetime'
  );
end;
$$;

create or replace function public.create_business_growth_invite(
  p_bathroom_id uuid,
  p_contacted_at timestamptz default now(),
  p_expires_at timestamptz default now() + interval '30 days'
)
returns table (
  invite_id uuid,
  invite_code text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_invite_code text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select exists (
    select 1
    from public.profiles profiles
    where profiles.id = v_user_id
      and profiles.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'ADMIN_REQUIRED';
  end if;

  v_invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  return query
  insert into public.business_growth_invites (
    bathroom_id,
    invite_code,
    contacted_at,
    expires_at,
    created_by
  )
  values (
    p_bathroom_id,
    v_invite_code,
    p_contacted_at,
    p_expires_at,
    v_user_id
  )
  returning
    public.business_growth_invites.id,
    public.business_growth_invites.invite_code,
    public.business_growth_invites.expires_at;
end;
$$;

create or replace function public.submit_business_claim(
  p_bathroom_id uuid,
  p_business_name text,
  p_contact_email text,
  p_contact_phone text default null,
  p_evidence_url text default null,
  p_growth_invite_code text default null
)
returns setof public.business_claims
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_claim public.business_claims%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if exists (
    select 1
    from public.business_claims claims
    where claims.claimant_user_id = v_user_id
      and claims.bathroom_id = p_bathroom_id
      and claims.review_status in ('pending', 'approved')
  ) then
    raise exception 'BUSINESS_CLAIM_EXISTS';
  end if;

  insert into public.business_claims (
    bathroom_id,
    claimant_user_id,
    business_name,
    contact_email,
    contact_phone,
    evidence_url
  )
  values (
    p_bathroom_id,
    v_user_id,
    trim(coalesce(p_business_name, '')),
    lower(trim(coalesce(p_contact_email, ''))),
    nullif(trim(coalesce(p_contact_phone, '')), ''),
    nullif(trim(coalesce(p_evidence_url, '')), '')
  )
  returning *
  into v_claim;

  if nullif(trim(coalesce(p_growth_invite_code, '')), '') is not null then
    perform public.redeem_business_growth_invite(
      p_bathroom_id,
      v_claim.id,
      p_growth_invite_code
    );
  end if;

  return query
  select claims.*
  from public.business_claims claims
  where claims.id = v_claim.id;
end;
$$;

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
  v_requires_premium_access boolean := false;
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

  select coalesce(settings.requires_premium_access, false)
  into v_requires_premium_access
  from public.business_bathroom_settings settings
  where settings.bathroom_id = p_bathroom_id;

  if exists (
    select 1
    from public.business_featured_placements placements
    where placements.bathroom_id = p_bathroom_id
      and placements.status = 'active'
      and placements.start_date <= now()
      and placements.end_date >= now()
  ) then
    v_badge_type := 'featured';
  elsif v_requires_premium_access then
    v_badge_type := 'premium';
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
    count(*)::bigint as weekly_views,
    count(distinct views.viewer_id)::bigint as weekly_unique_visitors
  from public.bathroom_views views
  where views.viewed_at > now() - interval '7 days'
  group by views.bathroom_id
),
monthly_view_counts as (
  select
    views.bathroom_id,
    count(distinct views.viewer_id)::bigint as monthly_unique_visitors
  from public.bathroom_views views
  where views.viewed_at > now() - interval '30 days'
  group by views.bathroom_id
),
weekly_navigation_counts as (
  select
    events.bathroom_id,
    count(*)::bigint as weekly_navigation_count
  from public.bathroom_navigation_events events
  where events.opened_at > now() - interval '7 days'
  group by events.bathroom_id
),
active_offer_rollup as (
  select
    promotions.bathroom_id,
    count(*) filter (
      where promotions.is_active = true
        and (promotions.starts_at is null or promotions.starts_at <= now())
        and (promotions.ends_at is null or promotions.ends_at >= now())
    )::bigint as active_offer_count
  from public.business_promotions promotions
  group by promotions.bathroom_id
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
  coalesce(weekly_view_counts.weekly_unique_visitors, 0)::bigint as weekly_unique_visitors,
  coalesce(monthly_view_counts.monthly_unique_visitors, 0)::bigint as monthly_unique_visitors,
  coalesce(weekly_navigation_counts.weekly_navigation_count, 0)::bigint as weekly_navigation_count,
  active_badges.badge_type as verification_badge_type,
  active_badges.badge_type is not null as has_verification_badge,
  coalesce(featured_rollup.active_featured_placements, 0) > 0 as has_active_featured_placement,
  coalesce(featured_rollup.active_featured_placements, 0)::bigint as active_featured_placements,
  coalesce(active_offer_rollup.active_offer_count, 0)::bigint as active_offer_count,
  coalesce(settings.requires_premium_access, false) as requires_premium_access,
  coalesce(settings.show_on_free_map, true) as show_on_free_map,
  coalesce(settings.is_location_verified, false) as is_location_verified,
  settings.location_verified_at,
  coalesce(settings.pricing_plan, 'standard') as pricing_plan,
  greatest(
    bathrooms.updated_at,
    coalesce(max(reports.updated_at), bathrooms.updated_at),
    coalesce(max(ratings.created_at), bathrooms.updated_at),
    coalesce(settings.updated_at, bathrooms.updated_at)
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
left join monthly_view_counts
  on monthly_view_counts.bathroom_id = bathrooms.id
left join weekly_navigation_counts
  on weekly_navigation_counts.bathroom_id = bathrooms.id
left join active_offer_rollup
  on active_offer_rollup.bathroom_id = bathrooms.id
left join public.business_bathroom_settings settings
  on settings.bathroom_id = bathrooms.id
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
  weekly_view_counts.weekly_views,
  weekly_view_counts.weekly_unique_visitors,
  monthly_view_counts.monthly_unique_visitors,
  weekly_navigation_counts.weekly_navigation_count,
  active_badges.badge_type,
  featured_rollup.active_featured_placements,
  active_offer_rollup.active_offer_count,
  settings.requires_premium_access,
  settings.show_on_free_map,
  settings.is_location_verified,
  settings.location_verified_at,
  settings.pricing_plan,
  settings.updated_at;

create unique index if not exists idx_mv_business_analytics_bathroom
  on public.mv_business_analytics (bathroom_id);

create index if not exists idx_mv_business_analytics_owner
  on public.mv_business_analytics (owner_user_id);

drop function if exists public.get_business_dashboard_analytics(uuid);

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
  weekly_unique_visitors bigint,
  monthly_unique_visitors bigint,
  weekly_navigation_count bigint,
  verification_badge_type text,
  has_verification_badge boolean,
  has_active_featured_placement boolean,
  active_featured_placements bigint,
  active_offer_count bigint,
  requires_premium_access boolean,
  show_on_free_map boolean,
  is_location_verified boolean,
  location_verified_at timestamptz,
  pricing_plan text,
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
    analytics.weekly_unique_visitors,
    analytics.monthly_unique_visitors,
    analytics.weekly_navigation_count,
    analytics.verification_badge_type,
    analytics.has_verification_badge,
    analytics.has_active_featured_placement,
    analytics.active_featured_placements,
    analytics.active_offer_count,
    analytics.requires_premium_access,
    analytics.show_on_free_map,
    analytics.is_location_verified,
    analytics.location_verified_at,
    analytics.pricing_plan,
    analytics.last_data_update as last_updated
  from public.mv_business_analytics analytics
  where analytics.owner_user_id = p_user_id
  order by analytics.last_data_update desc, analytics.place_name asc;
end;
$$;

create or replace view public.v_bathroom_detail_public as
with active_offer_rollup as (
  select
    promotions.bathroom_id,
    count(*) filter (
      where promotions.is_active = true
        and (promotions.starts_at is null or promotions.starts_at <= now())
        and (promotions.ends_at is null or promotions.ends_at >= now())
    )::integer as active_offer_count
  from public.business_promotions promotions
  group by promotions.bathroom_id
)
select
  bathrooms.id,
  bathrooms.place_name,
  bathrooms.address_line1,
  bathrooms.city,
  bathrooms.state,
  bathrooms.postal_code,
  bathrooms.country_code,
  bathrooms.latitude,
  bathrooms.longitude,
  bathrooms.is_locked,
  bathrooms.is_accessible,
  bathrooms.is_customer_only,
  bathrooms.hours_json,
  code_summary.code_id,
  code_summary.confidence_score,
  code_summary.up_votes,
  code_summary.down_votes,
  code_summary.last_verified_at,
  code_summary.expires_at,
  cleanliness_summary.cleanliness_avg,
  bathrooms.updated_at,
  bathrooms.accessibility_features,
  public.calculate_accessibility_score(
    bathrooms.is_accessible,
    bathrooms.accessibility_features
  ) as accessibility_score,
  badges.badge_type as verification_badge_type,
  case
    when coalesce(settings.requires_premium_access, false) then 'premium'
    else 'public'
  end as stallpass_access_tier,
  coalesce(settings.show_on_free_map, true) as show_on_free_map,
  coalesce(settings.is_location_verified, false) as is_business_location_verified,
  settings.location_verified_at,
  coalesce(active_offer_rollup.active_offer_count, 0) as active_offer_count
from public.bathrooms bathrooms
left join public.v_bathroom_code_summary code_summary
  on code_summary.bathroom_id = bathrooms.id
left join public.v_bathroom_cleanliness_summary cleanliness_summary
  on cleanliness_summary.bathroom_id = bathrooms.id
left join public.business_verification_badges badges
  on badges.bathroom_id = bathrooms.id
  and (badges.expires_at is null or badges.expires_at > now())
left join public.business_bathroom_settings settings
  on settings.bathroom_id = bathrooms.id
left join active_offer_rollup
  on active_offer_rollup.bathroom_id = bathrooms.id
where bathrooms.moderation_status = 'active';

drop function if exists public.get_bathrooms_near(double precision, double precision, integer);

create or replace function public.get_bathrooms_near(
  lat double precision,
  lng double precision,
  radius_m integer default 1000
)
returns table (
  id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean,
  accessibility_features jsonb,
  accessibility_score integer,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  verification_badge_type text,
  stallpass_access_tier text,
  show_on_free_map boolean,
  is_business_location_verified boolean,
  location_verified_at timestamptz,
  active_offer_count integer,
  distance_meters double precision
)
language sql
stable
as $$
  select
    details.id,
    details.place_name,
    details.address_line1,
    details.city,
    details.state,
    details.postal_code,
    details.country_code,
    details.latitude,
    details.longitude,
    details.is_locked,
    details.is_accessible,
    details.is_customer_only,
    details.accessibility_features,
    details.accessibility_score,
    details.hours_json,
    details.code_id,
    details.confidence_score,
    details.up_votes,
    details.down_votes,
    details.last_verified_at,
    details.expires_at,
    details.cleanliness_avg,
    details.updated_at,
    details.verification_badge_type,
    details.stallpass_access_tier,
    details.show_on_free_map,
    details.is_business_location_verified,
    details.location_verified_at,
    details.active_offer_count,
    st_distancesphere(
      st_makepoint(details.longitude, details.latitude),
      st_makepoint(lng, lat)
    ) as distance_meters
  from public.v_bathroom_detail_public details
  where st_dwithin(
    geography(st_setsrid(st_makepoint(details.longitude, details.latitude), 4326)),
    geography(st_setsrid(st_makepoint(lng, lat), 4326)),
    radius_m
  )
  order by distance_meters asc, details.updated_at desc;
$$;

revoke all on function public.viewer_has_active_premium() from public;
grant execute on function public.viewer_has_active_premium() to anon, authenticated, service_role;

revoke all on function public.record_bathroom_navigation(uuid) from public;
grant execute on function public.record_bathroom_navigation(uuid) to authenticated;

revoke all on function public.upsert_business_bathroom_settings(uuid, boolean, boolean, boolean) from public;
grant execute on function public.upsert_business_bathroom_settings(uuid, boolean, boolean, boolean) to authenticated, service_role;

revoke all on function public.upsert_business_promotion(uuid, uuid, text, text, text, numeric, text, text, timestamptz, timestamptz, boolean) from public;
grant execute on function public.upsert_business_promotion(uuid, uuid, text, text, text, numeric, text, text, timestamptz, timestamptz, boolean) to authenticated, service_role;

revoke all on function public.redeem_business_growth_invite(uuid, uuid, text) from public;
grant execute on function public.redeem_business_growth_invite(uuid, uuid, text) to authenticated, service_role;

revoke all on function public.create_business_growth_invite(uuid, timestamptz, timestamptz) from public;
grant execute on function public.create_business_growth_invite(uuid, timestamptz, timestamptz) to authenticated, service_role;

revoke all on function public.submit_business_claim(uuid, text, text, text, text, text) from public;
grant execute on function public.submit_business_claim(uuid, text, text, text, text, text) to authenticated, service_role;

revoke all on function public.get_business_dashboard_analytics(uuid) from public;
grant execute on function public.get_business_dashboard_analytics(uuid) to authenticated, service_role;

refresh materialized view public.mv_business_analytics;
