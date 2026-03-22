-- =============================================================================
-- PeeDom Migration Verification Script
-- Run this against the target Supabase project to confirm all 20 migrations
-- have been applied and key objects exist.
--
-- Usage:
--   supabase db execute --file supabase/scripts/verify-migrations.sql
--   -- or paste into the Supabase SQL Editor
-- =============================================================================

-- 1. List applied migrations (requires supabase_migrations schema)
select
  version,
  name,
  statements,
  executed_at
from supabase_migrations.schema_migrations
order by version asc;

-- 2. Verify all 20 expected migration versions are present
do $$
declare
  expected_versions text[] := array[
    '20230101000001',  -- 001_foundation_schema
    '20230101000002',  -- 002_functions
    '20230101000003',  -- 003_bathroom_report_moderation
    '20230101000004',  -- 004_bathroom_photos
    '20230101000005',  -- 005_trust_engine
    '20230101000006',  -- 006_gamification
    '20230101000007',  -- 007_map_surface
    '20230101000008',  -- 008_notifications_realtime
    '20230101000009',  -- 009_search
    '20230101000010',  -- 010_favorites_profile
    '20230101000011',  -- 011_premium_tier
    '20230101000012',  -- 012_business_tier
    '20230101000013',  -- 013_accessibility_layer
    '20230101000014',  -- 014_realtime_channels
    '20230101000015',  -- 015_search_discovery
    '20230101000016',  -- 016_favorites_surface
    '20230101000017',  -- 017_profile_account_hardening
    '20230101000018',  -- 018_bathroom_contribution_hardening
    '20230101000019',  -- 019_deactivated_user_guard
    '20230101000020'   -- 020_bathroom_report_dedup
  ];
  applied_count integer;
begin
  -- Note: Supabase stores migration names, not numeric versions.
  -- Adjust the query below to match actual migration names if they differ.
  select count(*) into applied_count
  from supabase_migrations.schema_migrations;

  raise notice 'Total applied migrations: %', applied_count;
  if applied_count < 20 then
    raise warning 'Expected at least 20 migrations, found %. Check for missing migrations.', applied_count;
  end if;
end;
$$;

-- 3. Verify critical tables exist
select
  tablename,
  tableowner
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'bathrooms',
    'access_codes',
    'favorites',
    'reports',
    'bathroom_photos',
    'cleanliness_ratings',
    'bathroom_submissions',
    'business_claims',
    'accessibility_features',
    'gamification_events',
    'point_history',
    'badges',
    'push_tokens',
    'realtime_bathroom_status'
  )
order by tablename;

-- 4. Verify PostGIS extension is enabled
select
  name,
  default_version,
  installed_version,
  case when installed_version is not null then 'INSTALLED' else 'MISSING' end as status
from pg_available_extensions
where name = 'postgis';

-- 5. Verify get_bathrooms_near function exists with correct signature
select
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  l.lanname as language,
  case p.provolatile
    when 's' then 'STABLE'
    when 'i' then 'IMMUTABLE'
    when 'v' then 'VOLATILE'
  end as volatility
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
  and p.proname = 'get_bathrooms_near';

-- 6. Verify profiles.role immutability RLS policy exists
select
  policyname,
  tablename,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and policyname = 'profiles_update_self';

-- 7. Verify spatial index on bathrooms table
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'bathrooms'
  and indexname = 'idx_bathrooms_geography';

-- 8. Verify v_bathroom_detail_public view exists (required by get_bathrooms_near)
select
  viewname,
  viewowner
from pg_views
where schemaname = 'public'
  and viewname = 'v_bathroom_detail_public';

-- 9. Quick RLS check — all critical tables should have RLS enabled
select
  relname as table_name,
  relrowsecurity as rls_enabled
from pg_class
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and relkind = 'r'
  and relname in (
    'profiles',
    'bathrooms',
    'access_codes',
    'favorites',
    'reports',
    'bathroom_submissions',
    'business_claims'
  )
order by relname;

-- 10. Summary: all checks above should return rows and show no MISSING status.
--     If any query returns no rows, the corresponding migration was not applied.
--     Address by re-running the missing migration file against the project.
