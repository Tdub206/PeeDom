-- Security tests for beta_bug_reports table.
-- Pattern follows business_security.sql.

-- 1. Anon INSERT should be blocked by RLS (no INSERT policy).
begin;
  set local role anon;
  insert into public.beta_bug_reports (
    device_id, error_message, idempotency_key, captured_at
  ) values (
    'test-device', 'test error', 'test-key-anon', now()
  );
  -- Expected: new row policy violation
rollback;

-- 2. Authenticated INSERT should be blocked (no INSERT policy for authenticated).
begin;
  set local role authenticated;
  set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
  insert into public.beta_bug_reports (
    user_id, device_id, error_message, idempotency_key, captured_at
  ) values (
    '00000000-0000-0000-0000-000000000001', 'test-device', 'test error', 'test-key-auth', now()
  );
  -- Expected: new row policy violation
rollback;

-- 3. Authenticated user can SELECT own rows (returns 0 rows, no error).
begin;
  set local role authenticated;
  set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
  select * from public.beta_bug_reports
    where user_id = '00000000-0000-0000-0000-000000000001';
  -- Expected: 0 rows, no error
rollback;

-- 4. Authenticated user cannot read another user's rows (filtered by RLS).
begin;
  set local role authenticated;
  set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
  select * from public.beta_bug_reports
    where user_id = '00000000-0000-0000-0000-000000000001';
  -- Expected: 0 rows (RLS filters out rows belonging to other users)
rollback;
