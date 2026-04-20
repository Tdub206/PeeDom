-- ============================================================================
-- 047_business_owner_access_codes.sql
-- Business-owner privileged write path for bathroom_access_codes.
--
-- Community-submitted codes already flow through submit_bathroom_access_code
-- (018) and are gated from guest view by the reveal paywall
-- (grant_bathroom_code_reveal_access, 005). Approved business owners need a
-- parallel path that:
--   * writes to the same bathroom_access_codes table (single read surface)
--   * pins confidence_score to 100 and visibility_status to 'visible'
--   * atomically supersedes any other 'active' codes for the bathroom
--   * reads all codes for the bathroom without the reveal paywall
--
-- Ownership is double-enforced: server actions call getApprovedLocationById
-- before the RPC, and the RPC itself re-checks the business_claims row.
-- ============================================================================

create or replace function public.submit_business_owner_access_code(
  p_bathroom_id uuid,
  p_code_value  text
)
returns table (code_id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code_id uuid;
  v_now timestamptz := now();
  v_code_value text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.business_claims
    where bathroom_id      = p_bathroom_id
      and claimant_user_id = v_user_id
      and review_status    = 'approved'
  ) then
    raise exception 'NOT_BUSINESS_OWNER' using errcode = 'P0001';
  end if;

  v_code_value := trim(coalesce(p_code_value, ''));
  if length(v_code_value) < 1 then
    raise exception 'INVALID_CODE_VALUE' using errcode = 'P0001';
  end if;

  update public.bathroom_access_codes
     set lifecycle_status = 'superseded',
         updated_at       = v_now
   where bathroom_id      = p_bathroom_id
     and lifecycle_status = 'active';

  insert into public.bathroom_access_codes (
    bathroom_id,
    submitted_by,
    code_value,
    confidence_score,
    visibility_status,
    lifecycle_status,
    last_verified_at,
    created_at,
    updated_at
  )
  values (
    p_bathroom_id,
    v_user_id,
    v_code_value,
    100,
    'visible',
    'active',
    v_now,
    v_now,
    v_now
  )
  returning id into v_code_id;

  return query select v_code_id, v_now;
end;
$$;

revoke all on function public.submit_business_owner_access_code(uuid, text) from public;
grant execute on function public.submit_business_owner_access_code(uuid, text)
  to authenticated;

create or replace function public.get_business_location_codes(
  p_bathroom_id uuid
)
returns table (
  id                uuid,
  code_value        text,
  confidence_score  numeric,
  up_votes          integer,
  down_votes        integer,
  lifecycle_status  text,
  visibility_status text,
  last_verified_at  timestamptz,
  created_at        timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.business_claims
    where bathroom_id      = p_bathroom_id
      and claimant_user_id = v_user_id
      and review_status    = 'approved'
  ) then
    raise exception 'NOT_BUSINESS_OWNER' using errcode = 'P0001';
  end if;

  return query
    select c.id,
           c.code_value,
           c.confidence_score,
           c.up_votes,
           c.down_votes,
           c.lifecycle_status,
           c.visibility_status,
           c.last_verified_at,
           c.created_at
      from public.bathroom_access_codes c
     where c.bathroom_id = p_bathroom_id
     order by c.created_at desc;
end;
$$;

revoke all on function public.get_business_location_codes(uuid) from public;
grant execute on function public.get_business_location_codes(uuid)
  to authenticated;
