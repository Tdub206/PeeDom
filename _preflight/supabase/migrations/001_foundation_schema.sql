-- ============================================================================
-- Pee-Dom Foundation Schema
-- Phase 2 - Complete database structure with RLS
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- ============================================================================
-- PROFILES
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  role text not null default 'user' check (role in ('user', 'business', 'admin')),
  points_balance integer not null default 0,
  is_premium boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- BATHROOMS
-- ============================================================================

create table if not exists public.bathrooms (
  id uuid primary key default gen_random_uuid(),
  place_name text not null,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text not null default 'US',
  latitude double precision not null,
  longitude double precision not null,
  geom geography(point, 4326) generated always as (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) stored,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean not null default false,
  hours_json jsonb,
  source_type text not null default 'community' check (
    source_type in ('community', 'business', 'imported', 'admin')
  ),
  moderation_status text not null default 'active' check (
    moderation_status in ('active', 'flagged', 'hidden', 'deleted')
  ),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bathrooms_geom on public.bathrooms using gist (geom);
create index if not exists idx_bathrooms_status on public.bathrooms(moderation_status);
create index if not exists idx_bathrooms_created_by on public.bathrooms(created_by);

-- ============================================================================
-- ACCESS CODES
-- ============================================================================

create table if not exists public.bathroom_access_codes (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  code_value text not null,
  confidence_score numeric(5,2) not null default 0,
  up_votes integer not null default 0,
  down_votes integer not null default 0,
  last_verified_at timestamptz,
  expires_at timestamptz,
  visibility_status text not null default 'visible' check (
    visibility_status in ('visible', 'needs_review', 'removed')
  ),
  lifecycle_status text not null default 'active' check (
    lifecycle_status in ('active', 'expired', 'superseded')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_codes_bathroom on public.bathroom_access_codes(bathroom_id);
create index if not exists idx_codes_last_verified on public.bathroom_access_codes(last_verified_at desc);
create index if not exists idx_codes_submitted_by on public.bathroom_access_codes(submitted_by);

-- ============================================================================
-- CODE VOTES
-- ============================================================================

create table if not exists public.code_votes (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.bathroom_access_codes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code_id, user_id)
);

create index if not exists idx_code_votes_code on public.code_votes(code_id);
create index if not exists idx_code_votes_user on public.code_votes(user_id);

-- Trigger to update vote counts
create or replace function public.update_code_vote_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.bathroom_access_codes
    set 
      up_votes = up_votes + case when new.vote = 1 then 1 else 0 end,
      down_votes = down_votes + case when new.vote = -1 then 1 else 0 end,
      updated_at = now()
    where id = new.code_id;
    return new;
  elsif TG_OP = 'UPDATE' then
    update public.bathroom_access_codes
    set 
      up_votes = up_votes + case when new.vote = 1 then 1 else 0 end - case when old.vote = 1 then 1 else 0 end,
      down_votes = down_votes + case when new.vote = -1 then 1 else 0 end - case when old.vote = -1 then 1 else 0 end,
      updated_at = now()
    where id = new.code_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.bathroom_access_codes
    set 
      up_votes = up_votes - case when old.vote = 1 then 1 else 0 end,
      down_votes = down_votes - case when old.vote = -1 then 1 else 0 end,
      updated_at = now()
    where id = old.code_id;
    return old;
  end if;
end;
$$;

create trigger on_code_vote_change
  after insert or update or delete on public.code_votes
  for each row execute function public.update_code_vote_counts();

-- ============================================================================
-- FAVORITES
-- ============================================================================

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, bathroom_id)
);

create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_favorites_bathroom on public.favorites(bathroom_id);

-- ============================================================================
-- BATHROOM REPORTS
-- ============================================================================

create table if not exists public.bathroom_reports (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  report_type text not null check (report_type in (
    'wrong_code',
    'closed',
    'unsafe',
    'duplicate',
    'incorrect_hours',
    'no_restroom',
    'other'
  )),
  notes text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reports_bathroom on public.bathroom_reports(bathroom_id);
create index if not exists idx_reports_status on public.bathroom_reports(status);
create index if not exists idx_reports_reported_by on public.bathroom_reports(reported_by);

-- ============================================================================
-- CLEANLINESS RATINGS
-- ============================================================================

create table if not exists public.cleanliness_ratings (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  unique (bathroom_id, user_id)
);

create index if not exists idx_ratings_bathroom on public.cleanliness_ratings(bathroom_id);
create index if not exists idx_ratings_user on public.cleanliness_ratings(user_id);

-- ============================================================================
-- BUSINESS CLAIMS
-- ============================================================================

create table if not exists public.business_claims (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  claimant_user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null,
  contact_email text not null,
  contact_phone text,
  evidence_url text,
  review_status text not null default 'pending' check (
    review_status in ('pending', 'approved', 'rejected')
  ),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_claims_status on public.business_claims(review_status);
create index if not exists idx_claims_claimant on public.business_claims(claimant_user_id);
create index if not exists idx_claims_bathroom on public.business_claims(bathroom_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Public bathroom list view
create or replace view public.v_bathrooms_public as
select
  b.id,
  b.place_name,
  b.address_line1,
  b.city,
  b.state,
  b.postal_code,
  b.country_code,
  b.latitude,
  b.longitude,
  b.is_locked,
  b.is_accessible,
  b.is_customer_only,
  b.hours_json,
  b.updated_at
from public.bathrooms b
where b.moderation_status = 'active';

-- Current code summary view
create or replace view public.v_bathroom_code_summary as
select distinct on (c.bathroom_id)
  c.bathroom_id,
  c.id as code_id,
  c.confidence_score,
  c.up_votes,
  c.down_votes,
  c.last_verified_at,
  c.expires_at,
  c.lifecycle_status,
  c.visibility_status
from public.bathroom_access_codes c
where c.visibility_status = 'visible'
  and c.lifecycle_status = 'active'
order by c.bathroom_id, c.last_verified_at desc nulls last, c.confidence_score desc;

-- Public bathroom detail view
create or replace view public.v_bathroom_detail_public as
select
  b.id,
  b.place_name,
  b.address_line1,
  b.city,
  b.state,
  b.postal_code,
  b.country_code,
  b.latitude,
  b.longitude,
  b.is_locked,
  b.is_accessible,
  b.is_customer_only,
  b.hours_json,
  s.code_id,
  s.confidence_score,
  s.up_votes,
  s.down_votes,
  s.last_verified_at,
  s.expires_at,
  b.updated_at
from public.bathrooms b
left join public.v_bathroom_code_summary s on s.bathroom_id = b.id
where b.moderation_status = 'active';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.bathrooms enable row level security;
alter table public.bathroom_access_codes enable row level security;
alter table public.code_votes enable row level security;
alter table public.favorites enable row level security;
alter table public.bathroom_reports enable row level security;
alter table public.cleanliness_ratings enable row level security;
alter table public.business_claims enable row level security;

-- PROFILES
create policy "profiles_select_self"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id);

-- BATHROOMS - Public read for active bathrooms
create policy "bathrooms_select_public"
  on public.bathrooms for select
  using (moderation_status = 'active');

create policy "bathrooms_insert_authenticated"
  on public.bathrooms for insert
  with check (auth.uid() = created_by);

-- BATHROOM_ACCESS_CODES
create policy "codes_select_visible_public"
  on public.bathroom_access_codes for select
  using (
    visibility_status = 'visible'
    and lifecycle_status = 'active'
  );

create policy "codes_insert_authenticated"
  on public.bathroom_access_codes for insert
  with check (auth.uid() = submitted_by);

-- CODE_VOTES
create policy "code_votes_select_own"
  on public.code_votes for select
  using (auth.uid() = user_id);

create policy "code_votes_insert_own"
  on public.code_votes for insert
  with check (auth.uid() = user_id);

create policy "code_votes_update_own"
  on public.code_votes for update
  using (auth.uid() = user_id);

create policy "code_votes_delete_own"
  on public.code_votes for delete
  using (auth.uid() = user_id);

-- FAVORITES
create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- BATHROOM_REPORTS
create policy "reports_insert_own"
  on public.bathroom_reports for insert
  with check (auth.uid() = reported_by);

create policy "reports_select_own"
  on public.bathroom_reports for select
  using (auth.uid() = reported_by);

-- CLEANLINESS_RATINGS
create policy "ratings_select_own"
  on public.cleanliness_ratings for select
  using (auth.uid() = user_id);

create policy "ratings_insert_own"
  on public.cleanliness_ratings for insert
  with check (auth.uid() = user_id);

create policy "ratings_update_own"
  on public.cleanliness_ratings for update
  using (auth.uid() = user_id);

-- BUSINESS_CLAIMS
create policy "claims_select_own"
  on public.business_claims for select
  using (auth.uid() = claimant_user_id);

create policy "claims_insert_own"
  on public.business_claims for insert
  with check (auth.uid() = claimant_user_id);

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Insert sample bathroom (only if table is empty)
-- do $$
-- begin
--   if not exists (select 1 from public.bathrooms limit 1) then
--     insert into public.bathrooms (
--       place_name, address_line1, city, state, postal_code,
--       latitude, longitude, is_locked, is_accessible, is_customer_only
--     ) values
--       ('Pike Place Market', '85 Pike St', 'Seattle', 'WA', '98101',
--        47.6097, -122.3331, true, true, false),
--       ('Seattle Public Library', '1000 4th Ave', 'Seattle', 'WA', '98104',
--        47.6068, -122.3329, false, true, false);
--   end if;
-- end $$;
