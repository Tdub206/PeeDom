-- ============================================================================
-- StallPass Gamification
-- Adds contributor streaks, badges, leaderboards, and points redemption.
-- ============================================================================

alter table public.profiles
  add column if not exists premium_expires_at timestamptz,
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists last_contribution_date date,
  add column if not exists streak_multiplier numeric(4,2) not null default 1.00,
  add column if not exists streak_multiplier_expires_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_current_streak_check;

alter table public.profiles
  add constraint profiles_current_streak_check
  check (current_streak >= 0);

alter table public.profiles
  drop constraint if exists profiles_longest_streak_check;

alter table public.profiles
  add constraint profiles_longest_streak_check
  check (longest_streak >= 0);

alter table public.profiles
  drop constraint if exists profiles_streak_multiplier_check;

alter table public.profiles
  add constraint profiles_streak_multiplier_check
  check (streak_multiplier >= 1.00);

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
    and premium_expires_at is not distinct from (
      select existing_profile.premium_expires_at
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and is_suspended = (
      select existing_profile.is_suspended
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and current_streak = (
      select existing_profile.current_streak
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and longest_streak = (
      select existing_profile.longest_streak
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and last_contribution_date is not distinct from (
      select existing_profile.last_contribution_date
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and streak_multiplier = (
      select existing_profile.streak_multiplier
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
    and streak_multiplier_expires_at is not distinct from (
      select existing_profile.streak_multiplier_expires_at
      from public.profiles as existing_profile
      where existing_profile.id = auth.uid()
    )
  );

alter table public.point_events
  drop constraint if exists point_events_event_type_check;

alter table public.point_events
  add constraint point_events_event_type_check
  check (
    event_type in (
      'bathroom_added',
      'bathroom_photo_uploaded',
      'code_submitted',
      'code_verification',
      'report_resolved',
      'code_milestone',
      'premium_redeemed'
    )
  );

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  badge_description text not null,
  badge_category text not null check (
    badge_category in ('milestone', 'streak', 'time', 'accessibility', 'city')
  ),
  context_city_slug text,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

create index if not exists idx_user_badges_user on public.user_badges(user_id, awarded_at desc);
create index if not exists idx_user_badges_key on public.user_badges(badge_key);

alter table public.user_badges enable row level security;

drop policy if exists "user_badges_select_own" on public.user_badges;

create policy "user_badges_select_own"
  on public.user_badges for select
  using (auth.uid() = user_id);

create or replace function public.profile_has_active_premium(
  p_is_premium boolean,
  p_premium_expires_at timestamptz
)
returns boolean
language sql
stable
as $$
  select case
    when p_premium_expires_at is not null then p_premium_expires_at > now()
    else coalesce(p_is_premium, false)
  end;
$$;

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
          and profiles.is_suspended = false
          and public.profile_has_active_premium(profiles.is_premium, profiles.premium_expires_at)
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

create or replace function public.slugify_text(p_value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace view public.v_point_events_with_location as
select
  point_events.id,
  point_events.user_id,
  point_events.event_type,
  point_events.reference_table,
  point_events.reference_id,
  point_events.points_awarded,
  point_events.metadata,
  point_events.created_at,
  coalesce(
    direct_bathroom.id,
    photo_bathroom.id,
    code_bathroom.id,
    report_bathroom.id
  ) as bathroom_id,
  coalesce(
    direct_bathroom.city,
    photo_bathroom.city,
    code_bathroom.city,
    report_bathroom.city
  ) as city,
  coalesce(
    direct_bathroom.state,
    photo_bathroom.state,
    code_bathroom.state,
    report_bathroom.state
  ) as state
from public.point_events point_events
left join public.bathrooms direct_bathroom
  on point_events.reference_table = 'bathrooms'
  and direct_bathroom.id = point_events.reference_id
left join public.bathroom_photos point_photos
  on point_events.reference_table = 'bathroom_photos'
  and point_photos.id = point_events.reference_id
left join public.bathrooms photo_bathroom
  on photo_bathroom.id = point_photos.bathroom_id
left join public.bathroom_access_codes point_codes
  on point_events.reference_table = 'bathroom_access_codes'
  and point_codes.id = point_events.reference_id
left join public.bathrooms code_bathroom
  on code_bathroom.id = point_codes.bathroom_id
left join public.bathroom_reports point_reports
  on point_events.reference_table = 'bathroom_reports'
  and point_reports.id = point_events.reference_id
left join public.bathrooms report_bathroom
  on report_bathroom.id = point_reports.bathroom_id;

create or replace function public.get_active_streak_multiplier(
  p_user_id uuid
)
returns numeric
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    case
      when profiles.streak_multiplier_expires_at is not null
        and profiles.streak_multiplier_expires_at > now()
      then greatest(profiles.streak_multiplier, 1.00)
      else 1.00
    end,
    1.00
  )
  from public.profiles profiles
  where profiles.id = p_user_id;
$$;

create or replace function public.award_user_badge(
  p_user_id uuid,
  p_badge_key text,
  p_badge_name text,
  p_badge_description text,
  p_badge_category text,
  p_context_city_slug text default null
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  inserted_badge_id uuid;
begin
  insert into public.user_badges (
    user_id,
    badge_key,
    badge_name,
    badge_description,
    badge_category,
    context_city_slug
  )
  values (
    p_user_id,
    p_badge_key,
    p_badge_name,
    p_badge_description,
    p_badge_category,
    p_context_city_slug
  )
  on conflict (user_id, badge_key) do nothing
  returning id into inserted_badge_id;

  return inserted_badge_id is not null;
end;
$$;

create or replace function public.grant_points_event(
  p_user_id uuid,
  p_event_type text,
  p_reference_table text,
  p_reference_id uuid,
  p_base_points integer,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  effective_multiplier numeric := 1.00;
  awarded_points integer := p_base_points;
  inserted_points integer;
begin
  if p_user_id is null then
    return 0;
  end if;

  select coalesce(public.get_active_streak_multiplier(p_user_id), 1.00)
  into effective_multiplier;

  if p_base_points > 0 then
    awarded_points := greatest(1, round(p_base_points * effective_multiplier)::integer);
  end if;

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
      p_user_id,
      p_event_type,
      p_reference_table,
      p_reference_id,
      awarded_points,
      coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (user_id, event_type, reference_table, reference_id) do nothing
    returning points_awarded
  )
  update public.profiles
  set
    points_balance = public.profiles.points_balance + inserted_event.points_awarded,
    updated_at = now()
  from inserted_event
  where public.profiles.id = p_user_id
  returning inserted_event.points_awarded into inserted_points;

  return coalesce(inserted_points, 0);
end;
$$;

create or replace function public.process_point_event_progress()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  streak_today date := timezone('utc', now())::date;
  streak_month_end timestamptz := date_trunc('month', timezone('utc', now())) + interval '1 month';
  existing_last_contribution_date date;
  existing_current_streak integer;
  next_streak integer;
  positive_verification_count integer;
  accessible_contribution_count integer;
  event_city text;
  event_state text;
  city_slug text;
  leading_user_id uuid;
begin
  if new.points_awarded > 0
    and new.event_type in ('bathroom_added', 'bathroom_photo_uploaded', 'code_submitted', 'code_verification', 'report_resolved') then
    select
      profiles.last_contribution_date,
      profiles.current_streak
    into
      existing_last_contribution_date,
      existing_current_streak
    from public.profiles profiles
    where profiles.id = new.user_id
    for update;

    if existing_last_contribution_date is distinct from streak_today then
      if existing_last_contribution_date = streak_today - 1 then
        next_streak := coalesce(existing_current_streak, 0) + 1;
      else
        next_streak := 1;
      end if;

      update public.profiles
      set
        current_streak = next_streak,
        longest_streak = greatest(coalesce(longest_streak, 0), next_streak),
        last_contribution_date = streak_today,
        streak_multiplier = case
          when next_streak >= 30 then greatest(streak_multiplier, 1.50)
          else streak_multiplier
        end,
        streak_multiplier_expires_at = case
          when next_streak >= 30 then greatest(coalesce(streak_multiplier_expires_at, streak_month_end), streak_month_end)
          else streak_multiplier_expires_at
        end,
        updated_at = now()
      where id = new.user_id;

      if next_streak >= 7 then
        perform public.award_user_badge(
          new.user_id,
          'streak_seven',
          'Seven Day Streak',
          'Contributed to the StallPass community seven days in a row.',
          'streak'
        );
      end if;
    end if;
  end if;

  if new.event_type = 'bathroom_added' then
    perform public.award_user_badge(
      new.user_id,
      'first_flush',
      'First Flush',
      'Added your first bathroom to the community map.',
      'milestone'
    );

    if extract(hour from timezone('utc', new.created_at)) between 0 and 5 then
      perform public.award_user_badge(
        new.user_id,
        'night_owl',
        'Night Owl',
        'Mapped a bathroom between midnight and 6am UTC.',
        'time'
      );
    end if;
  end if;

  if new.event_type = 'code_verification' then
    select count(*)
    into positive_verification_count
    from public.point_events point_events
    where point_events.user_id = new.user_id
      and point_events.event_type = 'code_verification';

    if positive_verification_count >= 10 then
      perform public.award_user_badge(
        new.user_id,
        'code_breaker',
        'Code Breaker',
        'Verified 10 bathroom access codes that helped the community.',
        'milestone'
      );
    end if;
  end if;

  if new.event_type in ('bathroom_added', 'code_verification') then
    select count(distinct event_points.bathroom_id)
    into accessible_contribution_count
    from public.v_point_events_with_location event_points
    join public.bathrooms bathrooms
      on bathrooms.id = event_points.bathroom_id
    where event_points.user_id = new.user_id
      and event_points.event_type in ('bathroom_added', 'code_verification')
      and bathrooms.is_accessible = true;

    if accessible_contribution_count >= 5 then
      perform public.award_user_badge(
        new.user_id,
        'accessibility_hero',
        'Accessibility Hero',
        'Helped verify or add five accessible bathrooms.',
        'accessibility'
      );
    end if;
  end if;

  select
    event_points.city,
    event_points.state
  into
    event_city,
    event_state
  from public.v_point_events_with_location event_points
  where event_points.id = new.id;

  if event_city is not null and new.points_awarded > 0 then
    city_slug := public.slugify_text(concat_ws('-', event_state, event_city));

    with city_scores as (
      select
        event_points.user_id,
        sum(event_points.points_awarded) as total_points
      from public.v_point_events_with_location event_points
      where event_points.points_awarded > 0
        and event_points.city = event_city
        and event_points.state is not distinct from event_state
      group by event_points.user_id
    )
    select city_scores.user_id
    into leading_user_id
    from city_scores
    order by city_scores.total_points desc, city_scores.user_id
    limit 1;

    if leading_user_id = new.user_id then
      perform public.award_user_badge(
        new.user_id,
        'city_expert_' || city_slug,
        initcap(event_city) || ' Expert',
        'Reached the top all-time contributor spot for ' || concat_ws(', ', event_city, event_state) || '.',
        'city',
        city_slug
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_point_event_progress on public.point_events;

create trigger on_point_event_progress
  after insert on public.point_events
  for each row execute function public.process_point_event_progress();

create or replace function public.award_bathroom_submission_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.created_by is not null and new.source_type = 'community' then
    perform public.grant_points_event(
      new.created_by,
      'bathroom_added',
      'bathrooms',
      new.id,
      50,
      jsonb_build_object('bathroom_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_bathroom_points_award on public.bathrooms;

create trigger on_bathroom_points_award
  after insert on public.bathrooms
  for each row execute function public.award_bathroom_submission_points();

create or replace function public.award_photo_upload_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.grant_points_event(
    new.uploaded_by,
    'bathroom_photo_uploaded',
    'bathroom_photos',
    new.id,
    15,
    jsonb_build_object(
      'bathroom_id', new.bathroom_id,
      'photo_type', new.photo_type
    )
  );

  return new;
end;
$$;

drop trigger if exists on_bathroom_photo_points_award on public.bathroom_photos;

create trigger on_bathroom_photo_points_award
  after insert on public.bathroom_photos
  for each row execute function public.award_photo_upload_points();

create or replace function public.award_code_submission_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.grant_points_event(
    new.submitted_by,
    'code_submitted',
    'bathroom_access_codes',
    new.id,
    25,
    jsonb_build_object('bathroom_id', new.bathroom_id)
  );

  return new;
end;
$$;

drop trigger if exists on_code_submission_points_award on public.bathroom_access_codes;

create trigger on_code_submission_points_award
  after insert on public.bathroom_access_codes
  for each row execute function public.award_code_submission_points();

create or replace function public.award_report_resolution_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'resolved' and coalesce(old.status, '') <> 'resolved' then
    perform public.grant_points_event(
      new.reported_by,
      'report_resolved',
      'bathroom_reports',
      new.id,
      20,
      jsonb_build_object(
        'bathroom_id', new.bathroom_id,
        'report_type', new.report_type
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_report_resolution_points_award on public.bathroom_reports;

create trigger on_report_resolution_points_award
  after update of status on public.bathroom_reports
  for each row execute function public.award_report_resolution_points();

create or replace function public.award_code_verification_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (TG_OP = 'INSERT' and new.vote = 1)
    or (TG_OP = 'UPDATE' and new.vote = 1 and coalesce(old.vote, 0) <> 1) then
    perform public.grant_points_event(
      new.user_id,
      'code_verification',
      'bathroom_access_codes',
      new.code_id,
      5,
      jsonb_build_object(
        'code_id', new.code_id,
        'vote', new.vote
      )
    );
  end if;

  return coalesce(new, old);
end;
$$;

create or replace function public.award_code_milestone_points()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.up_votes >= 10 and coalesce(old.up_votes, 0) < 10 then
    perform public.grant_points_event(
      new.submitted_by,
      'code_milestone',
      'bathroom_access_codes',
      new.id,
      100,
      jsonb_build_object(
        'bathroom_id', new.bathroom_id,
        'up_votes', new.up_votes
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_code_milestone_points_award on public.bathroom_access_codes;

create trigger on_code_milestone_points_award
  after update of up_votes on public.bathroom_access_codes
  for each row execute function public.award_code_milestone_points();

create or replace function public.get_my_gamification_summary()
returns table (
  total_bathrooms_added integer,
  total_codes_submitted integer,
  total_code_verifications integer,
  total_reports_filed integer,
  total_photos_uploaded integer,
  total_badges integer,
  primary_city text,
  primary_state text
)
language sql
stable
security definer set search_path = public
as $$
  with contribution_city as (
    select
      event_points.city,
      event_points.state,
      count(*) as contribution_count
    from public.v_point_events_with_location event_points
    where event_points.user_id = auth.uid()
      and event_points.points_awarded > 0
      and event_points.city is not null
    group by event_points.city, event_points.state
    order by contribution_count desc, event_points.city
    limit 1
  )
  select
    (select count(*)::integer from public.bathrooms bathrooms where bathrooms.created_by = auth.uid()),
    (select count(*)::integer from public.bathroom_access_codes codes where codes.submitted_by = auth.uid()),
    (select count(*)::integer from public.code_votes code_votes where code_votes.user_id = auth.uid() and code_votes.vote = 1),
    (select count(*)::integer from public.bathroom_reports reports where reports.reported_by = auth.uid()),
    (select count(*)::integer from public.bathroom_photos photos where photos.uploaded_by = auth.uid()),
    (select count(*)::integer from public.user_badges badges where badges.user_id = auth.uid()),
    (select contribution_city.city from contribution_city),
    (select contribution_city.state from contribution_city);
$$;

create or replace function public.get_contributor_leaderboard(
  p_scope text default 'global',
  p_timeframe text default 'all_time',
  p_state text default null,
  p_city text default null,
  p_limit integer default 10
)
returns table (
  user_id uuid,
  display_name text,
  total_points integer,
  bathrooms_added integer,
  codes_submitted integer,
  verifications integer,
  photos_uploaded integer,
  reports_resolved integer,
  leaderboard_scope text,
  scope_label text,
  rank integer
)
language sql
stable
security definer set search_path = public
as $$
  with filtered_events as (
    select *
    from public.v_point_events_with_location event_points
    where event_points.points_awarded > 0
      and (
        p_timeframe = 'all_time'
        or (
          p_timeframe = 'weekly'
          and event_points.created_at >= date_trunc('week', timezone('utc', now()))
        )
      )
      and (
        p_scope = 'global'
        or (
          p_scope = 'state'
          and event_points.state is not distinct from p_state
        )
        or (
          p_scope = 'city'
          and event_points.city is not distinct from p_city
          and event_points.state is not distinct from p_state
        )
      )
  ),
  aggregated as (
    select
      filtered_events.user_id,
      sum(filtered_events.points_awarded)::integer as total_points,
      count(*) filter (where filtered_events.event_type = 'bathroom_added')::integer as bathrooms_added,
      count(*) filter (where filtered_events.event_type = 'code_submitted')::integer as codes_submitted,
      count(*) filter (where filtered_events.event_type = 'code_verification')::integer as verifications,
      count(*) filter (where filtered_events.event_type = 'bathroom_photo_uploaded')::integer as photos_uploaded,
      count(*) filter (where filtered_events.event_type = 'report_resolved')::integer as reports_resolved
    from filtered_events
    group by filtered_events.user_id
  ),
  ranked as (
    select
      aggregated.*,
      dense_rank() over (
        order by aggregated.total_points desc, aggregated.user_id
      )::integer as contributor_rank
    from aggregated
  )
  select
    ranked.user_id,
    coalesce(profiles.display_name, 'Anonymous') as display_name,
    ranked.total_points,
    ranked.bathrooms_added,
    ranked.codes_submitted,
    ranked.verifications,
    ranked.photos_uploaded,
    ranked.reports_resolved,
    p_scope as leaderboard_scope,
    case
      when p_scope = 'city' then concat_ws(', ', p_city, p_state)
      when p_scope = 'state' then coalesce(p_state, 'State')
      else 'Global'
    end as scope_label,
    ranked.contributor_rank as rank
  from ranked
  join public.profiles profiles
    on profiles.id = ranked.user_id
  order by ranked.contributor_rank, ranked.total_points desc, ranked.user_id
  limit greatest(1, least(p_limit, 50));
$$;

create or replace function public.redeem_points_for_premium(
  p_months integer default 1
)
returns table (
  user_id uuid,
  months_redeemed integer,
  points_spent integer,
  remaining_points integer,
  premium_expires_at timestamptz,
  is_premium boolean
)
language plpgsql
security definer set search_path = public
as $$
declare
  redemption_cost integer;
  profile_record public.profiles%rowtype;
  next_premium_expiry timestamptz;
  redemption_reference_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if p_months < 1 or p_months > 12 then
    raise exception 'INVALID_REDEMPTION_PERIOD' using errcode = 'P0001';
  end if;

  redemption_cost := p_months * 1000;

  select *
  into profile_record
  from public.profiles profiles
  where profiles.id = auth.uid()
  for update;

  if profile_record.id is null then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if profile_record.points_balance < redemption_cost then
    raise exception 'INSUFFICIENT_POINTS' using errcode = 'P0001';
  end if;

  next_premium_expiry := (
    greatest(
      coalesce(profile_record.premium_expires_at, timezone('utc', now())),
      timezone('utc', now())
    )
    + make_interval(months => p_months)
  );

  update public.profiles
  set
    points_balance = profile_record.points_balance - redemption_cost,
    is_premium = true,
    premium_expires_at = next_premium_expiry,
    updated_at = now()
  where id = auth.uid();

  insert into public.point_events (
    user_id,
    event_type,
    reference_table,
    reference_id,
    points_awarded,
    metadata
  )
  values (
    auth.uid(),
    'premium_redeemed',
    'premium_redemptions',
    redemption_reference_id,
    -redemption_cost,
    jsonb_build_object(
      'months_redeemed', p_months,
      'premium_expires_at', next_premium_expiry
    )
  );

  return query
  select
    auth.uid(),
    p_months,
    redemption_cost,
    profile_record.points_balance - redemption_cost,
    next_premium_expiry,
    true;
end;
$$;

grant execute on function public.get_my_gamification_summary() to authenticated;
grant execute on function public.get_contributor_leaderboard(text, text, text, text, integer) to authenticated;
grant execute on function public.redeem_points_for_premium(integer) to authenticated;
