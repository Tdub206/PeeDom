-- ============================================================================
-- Pee-Dom Trust Engine
-- Adds photo-proof metadata, durable verification point events, and
-- trust-maintenance functions for bathroom access codes.
-- ============================================================================

-- Harden self-service profile updates so trust signals stay server-managed.
drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (
      select existing_profile.role
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and points_balance = (
      select existing_profile.points_balance
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and is_premium = (
      select existing_profile.is_premium
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and is_suspended = (
      select existing_profile.is_suspended
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
  );

-- Add richer metadata to bathroom photos for trust-driven proof surfaces.
alter table public.bathroom_photos
  add column if not exists photo_type text not null default 'interior',
  add column if not exists moderation_status text not null default 'approved';

alter table public.bathroom_photos
  drop constraint if exists bathroom_photos_photo_type_check;

alter table public.bathroom_photos
  add constraint bathroom_photos_photo_type_check
  check (photo_type in ('exterior', 'interior', 'keypad', 'sign'));

alter table public.bathroom_photos
  drop constraint if exists bathroom_photos_moderation_status_check;

alter table public.bathroom_photos
  add constraint bathroom_photos_moderation_status_check
  check (moderation_status in ('approved', 'pending', 'rejected'));

create index if not exists idx_bathroom_photos_type on public.bathroom_photos(photo_type);
create index if not exists idx_bathroom_photos_moderation_status on public.bathroom_photos(moderation_status);

create table if not exists public.code_reveal_grants (
  id uuid primary key default gen_random_uuid(),
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  grant_source text not null default 'rewarded_ad' check (grant_source in ('rewarded_ad')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bathroom_id, user_id)
);

create index if not exists idx_code_reveal_grants_user on public.code_reveal_grants(user_id, expires_at desc);
create index if not exists idx_code_reveal_grants_bathroom on public.code_reveal_grants(bathroom_id, expires_at desc);

alter table public.code_reveal_grants enable row level security;

drop policy if exists "code_reveal_grants_select_own" on public.code_reveal_grants;

create policy "code_reveal_grants_select_own"
  on public.code_reveal_grants for select
  using (auth.uid() = user_id);

create or replace function public.user_has_active_code_reveal_grant(
  p_user_id uuid,
  p_bathroom_id uuid
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select case
    when p_user_id is null then false
    else (
      exists (
        select 1
        from public.profiles profiles
        where profiles.id = p_user_id
          and profiles.is_premium = true
          and profiles.is_suspended = false
      )
      or exists (
        select 1
        from public.code_reveal_grants grants
        where grants.user_id = p_user_id
          and grants.bathroom_id = p_bathroom_id
          and grants.expires_at > now()
      )
    )
  end;
$$;

grant execute on function public.user_has_active_code_reveal_grant(uuid, uuid) to anon;
grant execute on function public.user_has_active_code_reveal_grant(uuid, uuid) to authenticated;

create or replace function public.compute_code_reveal_grant_expiry(
  p_code_expires_at timestamptz
)
returns timestamptz
language plpgsql
stable
as $$
declare
  default_expiry timestamptz := now() + interval '24 hours';
begin
  if p_code_expires_at is null or p_code_expires_at <= now() then
    return default_expiry;
  end if;

  return least(default_expiry, p_code_expires_at);
end;
$$;

create or replace function public.has_bathroom_code_reveal_access(
  p_bathroom_id uuid
)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select case
    when auth.uid() is null then false
    else (
      public.user_has_active_code_reveal_grant(auth.uid(), p_bathroom_id)
      or exists (
        select 1
        from public.bathroom_access_codes codes
        where codes.bathroom_id = p_bathroom_id
          and codes.submitted_by = auth.uid()
          and codes.visibility_status = 'visible'
          and codes.lifecycle_status = 'active'
      )
    )
  end;
$$;

grant execute on function public.has_bathroom_code_reveal_access(uuid) to authenticated;

create or replace function public.grant_bathroom_code_reveal_access(
  p_bathroom_id uuid
)
returns table (
  id uuid,
  bathroom_id uuid,
  user_id uuid,
  grant_source text,
  expires_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  active_code record;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  select
    codes.id,
    codes.expires_at
  into active_code
  from public.bathroom_access_codes codes
  where codes.bathroom_id = p_bathroom_id
    and codes.visibility_status = 'visible'
    and codes.lifecycle_status = 'active'
  order by codes.last_verified_at desc nulls last, codes.confidence_score desc
  limit 1;

  if active_code.id is null then
    raise exception 'CODE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  return query
  insert into public.code_reveal_grants (
    bathroom_id,
    user_id,
    grant_source,
    expires_at
  )
  values (
    p_bathroom_id,
    auth.uid(),
    'rewarded_ad',
    public.compute_code_reveal_grant_expiry(active_code.expires_at)
  )
  on conflict (bathroom_id, user_id)
  do update
  set
    grant_source = excluded.grant_source,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning
    code_reveal_grants.id,
    code_reveal_grants.bathroom_id,
    code_reveal_grants.user_id,
    code_reveal_grants.grant_source,
    code_reveal_grants.expires_at,
    code_reveal_grants.created_at,
    code_reveal_grants.updated_at;
end;
$$;

grant execute on function public.grant_bathroom_code_reveal_access(uuid) to authenticated;

create or replace function public.get_revealed_bathroom_code(
  p_bathroom_id uuid
)
returns table (
  id uuid,
  bathroom_id uuid,
  submitted_by uuid,
  code_value text,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  visibility_status text,
  lifecycle_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if not public.has_bathroom_code_reveal_access(p_bathroom_id) then
    raise exception 'CODE_REVEAL_NOT_GRANTED' using errcode = 'P0001';
  end if;

  return query
  select
    codes.id,
    codes.bathroom_id,
    codes.submitted_by,
    codes.code_value,
    codes.confidence_score,
    codes.up_votes,
    codes.down_votes,
    codes.last_verified_at,
    codes.expires_at,
    codes.visibility_status,
    codes.lifecycle_status,
    codes.created_at,
    codes.updated_at
  from public.bathroom_access_codes codes
  where codes.bathroom_id = p_bathroom_id
    and codes.visibility_status = 'visible'
    and codes.lifecycle_status = 'active'
  order by codes.last_verified_at desc nulls last, codes.confidence_score desc
  limit 1;
end;
$$;

grant execute on function public.get_revealed_bathroom_code(uuid) to authenticated;

drop policy if exists "bathroom_photos_select_public_or_owner" on public.bathroom_photos;

create policy "bathroom_photos_select_public_or_owner"
  on public.bathroom_photos for select
  using (
    auth.uid() = uploaded_by
    or (
      moderation_status = 'approved'
      and exists (
        select 1
        from public.bathrooms bathrooms
        where bathrooms.id = bathroom_id
          and bathrooms.moderation_status = 'active'
      )
      and (
        photo_type not in ('keypad', 'sign')
        or public.user_has_active_code_reveal_grant(auth.uid(), bathroom_id)
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bathroom-photos',
  'bathroom-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bathroom_photos_bucket_select_public" on storage.objects;
drop policy if exists "bathroom_photos_bucket_select_approved" on storage.objects;

create policy "bathroom_photos_bucket_select_approved"
  on storage.objects for select
  using (
    bucket_id = 'bathroom-photos'
    and exists (
      select 1
      from public.bathroom_photos photos
      join public.bathrooms bathrooms
        on bathrooms.id = photos.bathroom_id
      where photos.storage_bucket = bucket_id
        and photos.storage_path = name
        and (
          auth.uid() = photos.uploaded_by
          or (
            photos.moderation_status = 'approved'
            and bathrooms.moderation_status = 'active'
            and (
              photos.photo_type not in ('keypad', 'sign')
              or public.user_has_active_code_reveal_grant(auth.uid(), photos.bathroom_id)
            )
          )
        )
    )
  );

drop policy if exists "codes_select_visible_public" on public.bathroom_access_codes;
drop policy if exists "codes_select_revealed_or_owner" on public.bathroom_access_codes;

create policy "codes_select_revealed_or_owner"
  on public.bathroom_access_codes for select
  using (
    auth.uid() = submitted_by
    or (
      visibility_status = 'visible'
      and lifecycle_status = 'active'
      and public.user_has_active_code_reveal_grant(auth.uid(), bathroom_id)
    )
  );

drop policy if exists "code_votes_insert_own" on public.code_votes;
drop policy if exists "code_votes_update_own" on public.code_votes;

create policy "code_votes_insert_own"
  on public.code_votes for insert
  with check (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.bathroom_access_codes codes
      where codes.id = code_id
        and codes.submitted_by = auth.uid()
    )
  );

create policy "code_votes_update_own"
  on public.code_votes for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and not exists (
      select 1
      from public.bathroom_access_codes codes
      where codes.id = code_id
        and codes.submitted_by = auth.uid()
    )
  );

-- Trust-related point awards stay auditable and idempotent through point events.
create table if not exists public.point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'bathroom_added',
      'bathroom_photo_uploaded',
      'code_submitted',
      'code_verification',
      'report_resolved'
    )
  ),
  reference_table text not null,
  reference_id uuid not null,
  points_awarded integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, event_type, reference_table, reference_id)
);

create index if not exists idx_point_events_user on public.point_events(user_id, created_at desc);
create index if not exists idx_point_events_event_type on public.point_events(event_type);

alter table public.point_events enable row level security;

drop policy if exists "point_events_select_own" on public.point_events;

create policy "point_events_select_own"
  on public.point_events for select
  using (auth.uid() = user_id);

-- Confidence is recalculated from vote quality, vote volume, and freshness.
create or replace function public.calculate_code_confidence(
  p_up_votes integer,
  p_down_votes integer,
  p_last_verified_at timestamptz
)
returns numeric
language plpgsql
stable
as $$
declare
  total_votes integer := greatest(coalesce(p_up_votes, 0) + coalesce(p_down_votes, 0), 0);
  approval_ratio numeric := case
    when total_votes = 0 then 0.50
    else coalesce(p_up_votes, 0)::numeric / total_votes
  end;
  base_score numeric := case
    when total_votes = 0 then 40
    else approval_ratio * 80
  end;
  volume_bonus numeric := least(total_votes, 20) * 0.90;
  freshness_bonus numeric := case
    when p_last_verified_at is null then -10
    when p_last_verified_at >= now() - interval '1 day' then 18
    when p_last_verified_at >= now() - interval '7 days' then 12
    when p_last_verified_at >= now() - interval '30 days' then 6
    when p_last_verified_at >= now() - interval '90 days' then 0
    else -15
  end;
begin
  return greatest(0, least(100, round(base_score + volume_bonus + freshness_bonus, 2)));
end;
$$;

create or replace function public.refresh_bathroom_access_code_aggregates(p_code_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  vote_summary record;
  current_code record;
  effective_last_verified_at timestamptz;
begin
  select
    count(*) filter (where vote = 1) as up_votes,
    count(*) filter (where vote = -1) as down_votes,
    max(created_at) filter (where vote = 1) as last_positive_vote_at
  into vote_summary
  from public.code_votes
  where code_id = p_code_id;

  select
    id,
    last_verified_at
  into current_code
  from public.bathroom_access_codes
  where id = p_code_id;

  if current_code.id is null then
    return;
  end if;

  effective_last_verified_at := coalesce(vote_summary.last_positive_vote_at, current_code.last_verified_at);

  update public.bathroom_access_codes
  set
    up_votes = coalesce(vote_summary.up_votes, 0),
    down_votes = coalesce(vote_summary.down_votes, 0),
    last_verified_at = effective_last_verified_at,
    confidence_score = public.calculate_code_confidence(
      coalesce(vote_summary.up_votes, 0),
      coalesce(vote_summary.down_votes, 0),
      effective_last_verified_at
    ),
    updated_at = now()
  where id = p_code_id;
end;
$$;

create or replace function public.update_code_vote_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.refresh_bathroom_access_code_aggregates(coalesce(new.code_id, old.code_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_self_code_vote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  code_submitter uuid;
begin
  select submitted_by
  into code_submitter
  from public.bathroom_access_codes
  where id = new.code_id;

  if code_submitter is not null and code_submitter = new.user_id then
    raise exception 'SELF_CODE_VOTE' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists before_code_vote_prevent_self on public.code_votes;

create trigger before_code_vote_prevent_self
  before insert or update of vote on public.code_votes
  for each row execute function public.prevent_self_code_vote();

create or replace function public.award_code_verification_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (TG_OP = 'INSERT' and new.vote = 1)
    or (TG_OP = 'UPDATE' and new.vote = 1 and coalesce(old.vote, 0) <> 1) then
    with inserted_event as (
      insert into public.point_events (
        user_id,
        event_type,
        reference_table,
        reference_id,
        points_awarded,
        metadata
      )
      values (
        new.user_id,
        'code_verification',
        'bathroom_access_codes',
        new.code_id,
        5,
        jsonb_build_object(
          'code_id', new.code_id,
          'vote', new.vote
        )
      )
      on conflict (user_id, event_type, reference_table, reference_id) do nothing
      returning points_awarded
    )
    update public.profiles
    set
      points_balance = profiles.points_balance + inserted_event.points_awarded,
      updated_at = now()
    from inserted_event
    where profiles.id = new.user_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_code_vote_points_award on public.code_votes;

create trigger on_code_vote_points_award
  after insert or update on public.code_votes
  for each row execute function public.award_code_verification_points();

-- Nightly stale-code cleanup is driven by an explicit function so Edge Functions
-- can run it on a schedule with service credentials.
create or replace function public.expire_stale_bathroom_access_codes()
returns table (
  code_id uuid,
  bathroom_id uuid
)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  with recent_negative_votes as (
    select
      code_votes.code_id,
      count(*) as negative_votes
    from public.code_votes
    where code_votes.vote = -1
      and code_votes.created_at >= now() - interval '30 days'
    group by code_votes.code_id
  ),
  expired_codes as (
    update public.bathroom_access_codes codes
    set
      lifecycle_status = 'expired',
      visibility_status = 'needs_review',
      expires_at = coalesce(codes.expires_at, now()),
      updated_at = now()
    from recent_negative_votes
    where codes.id = recent_negative_votes.code_id
      and codes.lifecycle_status = 'active'
      and codes.visibility_status <> 'removed'
      and coalesce(codes.last_verified_at, codes.created_at) < now() - interval '90 days'
      and recent_negative_votes.negative_votes >= 2
    returning codes.id, codes.bathroom_id
  )
  select expired_codes.id, expired_codes.bathroom_id
  from expired_codes;
end;
$$;

revoke all on function public.expire_stale_bathroom_access_codes() from public;
revoke all on function public.expire_stale_bathroom_access_codes() from authenticated;
grant execute on function public.expire_stale_bathroom_access_codes() to service_role;
