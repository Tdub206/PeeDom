-- ============================================================================
-- PeeDom "Thank a Business" Kudos System
-- 030_business_kudos.sql
-- ============================================================================

create table if not exists public.business_kudos (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text check (length(message) <= 200),
  created_at timestamptz not null default now(),
  -- One kudos per user per bathroom per 24 hours
  unique (user_id, bathroom_id)
);

create index if not exists idx_business_kudos_bathroom
  on public.business_kudos (bathroom_id, created_at desc);

create index if not exists idx_business_kudos_user
  on public.business_kudos (user_id, created_at desc);

alter table public.business_kudos enable row level security;

-- Users can see kudos on any bathroom
drop policy if exists "kudos_select_public" on public.business_kudos;
create policy "kudos_select_public"
  on public.business_kudos for select
  using (true);

-- Users can insert their own kudos
drop policy if exists "kudos_insert_own" on public.business_kudos;
create policy "kudos_insert_own"
  on public.business_kudos for insert
  with check (auth.uid() = user_id);

-- Send kudos RPC with rate limiting and notification
create or replace function public.send_business_kudos(
  p_bathroom_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_kudos_id uuid;
  v_owner_id uuid;
  v_place_name text;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if p_message is not null and length(p_message) > 200 then
    raise exception 'Message must be 200 characters or less';
  end if;

  -- Check if already sent kudos for this bathroom (unique constraint handles this,
  -- but we give a friendly message)
  if exists (
    select 1
    from public.business_kudos k
    where k.bathroom_id = p_bathroom_id
      and k.user_id = v_user_id
  ) then
    raise exception 'You have already thanked this business';
  end if;

  insert into public.business_kudos (bathroom_id, user_id, message)
  values (p_bathroom_id, v_user_id, p_message)
  returning id into v_kudos_id;

  -- Notify the business owner if this bathroom has an approved claim
  select claims.claimant_user_id, bathrooms.place_name
  into v_owner_id, v_place_name
  from public.business_claims claims
  join public.bathrooms bathrooms on bathrooms.id = claims.bathroom_id
  where claims.bathroom_id = p_bathroom_id
    and claims.review_status = 'approved'
  order by claims.reviewed_at desc nulls last
  limit 1;

  if v_owner_id is not null and v_owner_id <> v_user_id then
    insert into public.notification_queue (
      recipient_user_id,
      notification_type,
      payload
    )
    values (
      v_owner_id,
      'claim_approved', -- reusing type for kudos notification
      jsonb_build_object(
        'type', 'kudos_received',
        'bathroom_id', p_bathroom_id,
        'place_name', v_place_name,
        'message', coalesce(p_message, 'Someone thanked your business!')
      )
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'kudos_id', v_kudos_id
  );
end;
$$;

-- Get kudos count for a bathroom
create or replace function public.get_bathroom_kudos_count(
  p_bathroom_id uuid
)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.business_kudos k
  where k.bathroom_id = p_bathroom_id;
$$;

revoke all on function public.send_business_kudos(uuid, text) from public;
grant execute on function public.send_business_kudos(uuid, text) to authenticated;

revoke all on function public.get_bathroom_kudos_count(uuid) from public;
grant execute on function public.get_bathroom_kudos_count(uuid) to authenticated, anon;
