-- ============================================================================
-- Business Tier Security Audit Tests
-- Run with Supabase SQL editor or psql under the expected JWT context.
-- ============================================================================

begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000101';

  select public.user_has_business_dashboard_access('00000000-0000-0000-0000-000000000101');
  select * from public.get_business_dashboard_analytics('00000000-0000-0000-0000-000000000101');
rollback;

begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000101';

  select * from public.get_business_dashboard_analytics('00000000-0000-0000-0000-000000000202');
  -- expected: Unauthorized exception because callers cannot access another account dashboard
rollback;

begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000303';

  select * from public.get_business_dashboard_analytics('00000000-0000-0000-0000-000000000303');
  -- expected: Unauthorized exception because this account has no business access
rollback;

begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000101';

  select public.update_business_bathroom_hours(
    '00000000-0000-0000-0000-000000000404',
    '{"monday": [{"open": "09:00", "close": "17:00"}]}'::jsonb
  );
  -- expected: success for an owned or approved-claim bathroom
rollback;

begin;
  set local role authenticated;
  set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000202';

  select public.update_business_bathroom_hours(
    '00000000-0000-0000-0000-000000000404',
    '{"monday": [{"open": "09:00", "close": "17:00"}]}'::jsonb
  );
  -- expected: Unauthorized exception because this account does not manage the bathroom
rollback;

begin;
  set local role anon;

  select public.refresh_business_analytics();
  -- expected: permission denied because only service_role can execute the refresh function
rollback;
