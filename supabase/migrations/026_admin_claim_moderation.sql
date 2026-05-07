-- ============================================================================
-- StallPass Admin Claim Moderation
-- 026_admin_claim_moderation.sql
-- ============================================================================

-- Admin can see all claims
drop policy if exists "claims_select_admin" on public.business_claims;
create policy "claims_select_admin"
  on public.business_claims for select
  using (
    exists (
      select 1
      from public.profiles profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Admin can update any claim (for moderation)
drop policy if exists "claims_update_admin" on public.business_claims;
create policy "claims_update_admin"
  on public.business_claims for update
  using (
    exists (
      select 1
      from public.profiles profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- List pending claims with bathroom + claimant info (admin only)
create or replace function public.list_pending_business_claims()
returns table (
  claim_id uuid,
  bathroom_id uuid,
  claimant_user_id uuid,
  business_name text,
  contact_email text,
  contact_phone text,
  evidence_url text,
  review_status text,
  created_at timestamptz,
  place_name text,
  address text,
  claimant_display_name text,
  claimant_email text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Verify admin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  return query
  select
    claims.id as claim_id,
    claims.bathroom_id,
    claims.claimant_user_id,
    claims.business_name,
    claims.contact_email,
    claims.contact_phone,
    claims.evidence_url,
    claims.review_status,
    claims.created_at,
    bathrooms.place_name,
    coalesce(bathrooms.address_line1, '') as address,
    profiles.display_name as claimant_display_name,
    profiles.email as claimant_email
  from public.business_claims claims
  join public.bathrooms bathrooms on bathrooms.id = claims.bathroom_id
  join public.profiles profiles on profiles.id = claims.claimant_user_id
  order by
    case claims.review_status
      when 'pending' then 0
      when 'rejected' then 1
      when 'approved' then 2
    end,
    claims.created_at asc;
end;
$$;

-- Moderate a claim (approve/reject)
create or replace function public.moderate_business_claim(
  p_claim_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_claim record;
begin
  -- Verify admin
  if not exists (
    select 1
    from public.profiles p
    where p.id = v_admin_id
      and p.role = 'admin'
  ) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  -- Validate action
  if p_action not in ('approve', 'reject') then
    raise exception 'Invalid action: must be approve or reject';
  end if;

  -- Fetch claim
  select * into v_claim
  from public.business_claims claims
  where claims.id = p_claim_id;

  if v_claim is null then
    raise exception 'Claim not found';
  end if;

  -- Update claim
  update public.business_claims
  set
    review_status = case p_action when 'approve' then 'approved' when 'reject' then 'rejected' end,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    updated_at = now()
  where id = p_claim_id;

  -- Badge sync and role promotion are handled by existing trigger:
  -- handle_business_claim_badge_sync

  return jsonb_build_object(
    'success', true,
    'claim_id', p_claim_id,
    'action', p_action,
    'reviewed_by', v_admin_id
  );
end;
$$;

revoke all on function public.list_pending_business_claims() from public;
grant execute on function public.list_pending_business_claims() to authenticated;

revoke all on function public.moderate_business_claim(uuid, text, text) from public;
grant execute on function public.moderate_business_claim(uuid, text, text) to authenticated;
