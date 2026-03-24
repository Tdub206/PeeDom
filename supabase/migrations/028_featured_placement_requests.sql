-- ============================================================================
-- PeeDom Featured Placement Requests
-- 028_featured_placement_requests.sql
-- ============================================================================

create table if not exists public.featured_placement_requests (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  business_user_id uuid not null references public.profiles(id) on delete cascade,
  placement_type text not null check (
    placement_type in ('search_top', 'map_priority', 'nearby_featured')
  ),
  geographic_scope jsonb not null default '{}' check (jsonb_typeof(geographic_scope) = 'object'),
  requested_duration_days integer not null check (requested_duration_days > 0 and requested_duration_days <= 365),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'cancelled')
  ),
  admin_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_featured_placement_requests_user
  on public.featured_placement_requests (business_user_id, status, created_at desc);

create index if not exists idx_featured_placement_requests_status
  on public.featured_placement_requests (status, created_at asc)
  where status = 'pending';

alter table public.featured_placement_requests enable row level security;

-- Users see their own requests
drop policy if exists "featured_requests_select_own" on public.featured_placement_requests;
create policy "featured_requests_select_own"
  on public.featured_placement_requests for select
  using (auth.uid() = business_user_id);

-- Admin sees all requests
drop policy if exists "featured_requests_select_admin" on public.featured_placement_requests;
create policy "featured_requests_select_admin"
  on public.featured_placement_requests for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Users insert own requests
drop policy if exists "featured_requests_insert_own" on public.featured_placement_requests;
create policy "featured_requests_insert_own"
  on public.featured_placement_requests for insert
  with check (
    auth.uid() = business_user_id
    and public.user_can_manage_business_bathroom(auth.uid(), bathroom_id)
  );

-- Users can cancel their own pending requests
drop policy if exists "featured_requests_update_own" on public.featured_placement_requests;
create policy "featured_requests_update_own"
  on public.featured_placement_requests for update
  using (auth.uid() = business_user_id)
  with check (auth.uid() = business_user_id);

-- Admin can update any request
drop policy if exists "featured_requests_update_admin" on public.featured_placement_requests;
create policy "featured_requests_update_admin"
  on public.featured_placement_requests for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- RPC: Submit featured placement request
create or replace function public.request_featured_placement(
  p_bathroom_id uuid,
  p_placement_type text,
  p_geographic_scope jsonb,
  p_duration_days integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if not public.user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'Unauthorized: You must own or manage this bathroom';
  end if;

  if p_placement_type not in ('search_top', 'map_priority', 'nearby_featured') then
    raise exception 'Invalid placement type';
  end if;

  if p_duration_days < 1 or p_duration_days > 365 then
    raise exception 'Duration must be between 1 and 365 days';
  end if;

  -- Prevent duplicate pending requests for same bathroom + type
  if exists (
    select 1
    from public.featured_placement_requests r
    where r.bathroom_id = p_bathroom_id
      and r.business_user_id = v_user_id
      and r.placement_type = p_placement_type
      and r.status = 'pending'
  ) then
    raise exception 'You already have a pending request for this placement type';
  end if;

  insert into public.featured_placement_requests (
    bathroom_id,
    business_user_id,
    placement_type,
    geographic_scope,
    requested_duration_days
  )
  values (
    p_bathroom_id,
    v_user_id,
    p_placement_type,
    p_geographic_scope,
    p_duration_days
  )
  returning id into v_request_id;

  return jsonb_build_object(
    'success', true,
    'request_id', v_request_id
  );
end;
$$;

-- RPC: Admin moderate featured request
create or replace function public.moderate_featured_request(
  p_request_id uuid,
  p_action text,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_request record;
  v_placement_id uuid;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = v_admin_id and p.role = 'admin'
  ) then
    raise exception 'Unauthorized: Admin access required';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'Invalid action: must be approve or reject';
  end if;

  select * into v_request
  from public.featured_placement_requests r
  where r.id = p_request_id;

  if v_request is null then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Request has already been moderated';
  end if;

  -- Update request status
  update public.featured_placement_requests
  set
    status = case p_action when 'approve' then 'approved' when 'reject' then 'rejected' end,
    admin_notes = p_admin_notes,
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    updated_at = now()
  where id = p_request_id;

  -- If approved, create the actual featured placement
  if p_action = 'approve' then
    insert into public.business_featured_placements (
      bathroom_id,
      business_user_id,
      placement_type,
      geographic_scope,
      start_date,
      end_date,
      status
    )
    values (
      v_request.bathroom_id,
      v_request.business_user_id,
      v_request.placement_type,
      v_request.geographic_scope,
      now(),
      now() + (v_request.requested_duration_days || ' days')::interval,
      'active'
    )
    returning id into v_placement_id;

    -- Notify business owner
    insert into public.notification_queue (
      recipient_user_id,
      notification_type,
      payload
    )
    values (
      v_request.business_user_id,
      'featured_placement_approved',
      jsonb_build_object(
        'request_id', p_request_id,
        'placement_id', v_placement_id,
        'bathroom_id', v_request.bathroom_id,
        'placement_type', v_request.placement_type
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'action', p_action
  );
end;
$$;

revoke all on function public.request_featured_placement(uuid, text, jsonb, integer) from public;
grant execute on function public.request_featured_placement(uuid, text, jsonb, integer) to authenticated;

revoke all on function public.moderate_featured_request(uuid, text, text) from public;
grant execute on function public.moderate_featured_request(uuid, text, text) to authenticated;
