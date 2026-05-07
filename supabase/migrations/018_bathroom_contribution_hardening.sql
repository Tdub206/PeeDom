-- ============================================================================
-- StallPass Bathroom Contribution Hardening
-- Moves high-risk community writes behind SECURITY DEFINER functions so the
-- client can no longer bypass validation or rate-limits with raw table writes.
-- ============================================================================

create or replace function public.create_bathroom_submission(
  p_place_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_address_line1 text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_country_code text default 'US',
  p_is_locked boolean default false,
  p_is_accessible boolean default false,
  p_is_customer_only boolean default false
)

returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_place_name text;
  v_address_line1 text;
  v_city text;
  v_state text;
  v_postal_code text;
  v_bathroom_id uuid;
  v_geom geography;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  v_place_name := trim(coalesce(p_place_name, ''));
  v_address_line1 := nullif(trim(coalesce(p_address_line1, '')), '');
  v_city := nullif(trim(coalesce(p_city, '')), '');
  v_state := nullif(trim(coalesce(p_state, '')), '');
  v_postal_code := nullif(trim(coalesce(p_postal_code, '')), '');

  if char_length(v_place_name) < 2 or char_length(v_place_name) > 120 then
    raise exception 'INVALID_BATHROOM_NAME' using errcode = 'P0001';
  end if;

  if v_address_line1 is null and v_city is null and v_state is null then
    raise exception 'BATHROOM_LOCATION_DETAILS_REQUIRED' using errcode = 'P0001';
  end if;

  if p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'INVALID_BATHROOM_COORDINATES' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.bathrooms bathrooms
    where bathrooms.created_by = v_user_id
      and bathrooms.created_at >= now() - interval '24 hours'
  ) >= 5 then
    raise exception 'BATHROOM_SUBMISSION_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  v_geom := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;

  if exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.moderation_status = 'active'
      and ST_DWithin(bathrooms.geom, v_geom, 50)
  ) then
    raise exception 'DUPLICATE_BATHROOM_NEARBY' using errcode = 'P0001';
  end if;

  insert into public.bathrooms (
    place_name,
    address_line1,
    city,
    state,
    postal_code,
    country_code,
    latitude,
    longitude,
    is_locked,
    is_accessible,
    is_customer_only,
    source_type,
    moderation_status,
    created_by
  )
  values (
    v_place_name,
    v_address_line1,
    v_city,
    v_state,
    v_postal_code,
    coalesce(nullif(trim(coalesce(p_country_code, '')), ''), 'US'),
    p_latitude,
    p_longitude,
    p_is_locked,
    p_is_accessible,
    p_is_customer_only,
    'community',
    'active',
    v_user_id
  )
  returning id into v_bathroom_id;

  return jsonb_build_object(
    'bathroom_id', v_bathroom_id,
    'created_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.submit_bathroom_access_code(
  p_bathroom_id uuid,
  p_code_value text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_code_value text;
  v_code_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  v_code_value := trim(coalesce(p_code_value, ''));

  if char_length(v_code_value) < 2 or char_length(v_code_value) > 32 then
    raise exception 'INVALID_CODE_VALUE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bathroom_access_codes codes
    where codes.submitted_by = v_user_id
      and codes.bathroom_id = p_bathroom_id
      and codes.created_at >= now() - interval '7 days'
  ) then
    raise exception 'CODE_SUBMISSION_COOLDOWN' using errcode = 'P0001';
  end if;

  update public.bathroom_access_codes
  set
    lifecycle_status = 'superseded',
    updated_at = timezone('utc', now())
  where submitted_by = v_user_id
    and bathroom_id = p_bathroom_id
    and lifecycle_status = 'active';

  insert into public.bathroom_access_codes (
    bathroom_id,
    submitted_by,
    code_value,
    last_verified_at
  )
  values (
    p_bathroom_id,
    v_user_id,
    v_code_value,
    timezone('utc', now())
  )
  returning id into v_code_id;

  return jsonb_build_object(
    'code_id', v_code_id,
    'created_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.vote_on_code(
  p_code_id uuid,
  p_vote smallint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_existing_vote smallint;
  v_action text := 'no_change';
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if p_vote not in (-1, 0, 1) then
    raise exception 'INVALID_CODE_VOTE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathroom_access_codes codes
    where codes.id = p_code_id
      and codes.visibility_status = 'visible'
      and codes.lifecycle_status = 'active'
  ) then
    raise exception 'CODE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bathroom_access_codes codes
    where codes.id = p_code_id
      and codes.submitted_by = v_user_id
  ) then
    raise exception 'SELF_CODE_VOTE' using errcode = 'P0001';
  end if;

  select code_votes.vote
  into v_existing_vote
  from public.code_votes
  where code_votes.code_id = p_code_id
    and code_votes.user_id = v_user_id;

  if p_vote = 0 then
    if v_existing_vote is not null then
      delete from public.code_votes
      where code_votes.code_id = p_code_id
        and code_votes.user_id = v_user_id;

      v_action := 'retracted';
    end if;
  elsif v_existing_vote is null then
    insert into public.code_votes (code_id, user_id, vote)
    values (p_code_id, v_user_id, p_vote);

    v_action := 'cast';
  elsif v_existing_vote = p_vote then
    delete from public.code_votes
    where code_votes.code_id = p_code_id
      and code_votes.user_id = v_user_id;

    v_action := 'retracted';
  else
    update public.code_votes
    set
      vote = p_vote,
      updated_at = timezone('utc', now())
    where code_votes.code_id = p_code_id
      and code_votes.user_id = v_user_id;

    v_action := 'changed';
  end if;

  return jsonb_build_object(
    'action', v_action,
    'code_id', p_code_id,
    'vote', p_vote,
    'voted_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.create_bathroom_report(
  p_bathroom_id uuid,
  p_report_type text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_notes text;
  v_report_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if p_report_type not in (
    'wrong_code',
    'closed',
    'unsafe',
    'duplicate',
    'incorrect_hours',
    'no_restroom',
    'other'
  ) then
    raise exception 'INVALID_REPORT_TYPE' using errcode = 'P0001';
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'INVALID_REPORT_NOTES' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.bathroom_reports reports
    where reports.reported_by = v_user_id
      and reports.bathroom_id = p_bathroom_id
      and reports.report_type = p_report_type
      and reports.status in ('open', 'reviewing')
  ) then
    raise exception 'REPORT_ALREADY_OPEN' using errcode = 'P0001';
  end if;

  insert into public.bathroom_reports (
    bathroom_id,
    reported_by,
    report_type,
    notes
  )
  values (
    p_bathroom_id,
    v_user_id,
    p_report_type,
    v_notes
  )
  returning id into v_report_id;

  return jsonb_build_object(
    'report_id', v_report_id,
    'created_at', timezone('utc', now())
  );
end;
$$;

create or replace function public.upsert_cleanliness_rating(
  p_bathroom_id uuid,
  p_rating smallint,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_notes text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  if p_rating < 1 or p_rating > 5 then
    raise exception 'INVALID_CLEANLINESS_RATING' using errcode = 'P0001';
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');

  if v_notes is not null and char_length(v_notes) > 300 then
    raise exception 'INVALID_CLEANLINESS_NOTES' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.bathrooms bathrooms
    where bathrooms.id = p_bathroom_id
      and bathrooms.moderation_status = 'active'
  ) then
    raise exception 'BATHROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.cleanliness_ratings (
    bathroom_id,
    user_id,
    rating,
    notes
  )
  values (
    p_bathroom_id,
    v_user_id,
    p_rating,
    v_notes
  )
  on conflict (bathroom_id, user_id)
  do update set
    rating = excluded.rating,
    notes = excluded.notes;

  return jsonb_build_object(
    'bathroom_id', p_bathroom_id,
    'rating', p_rating,
    'rated_at', timezone('utc', now())
  );
end;
$$;

grant execute on function public.create_bathroom_submission(
  text,
  double precision,
  double precision,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean
) to authenticated;


grant execute on function public.submit_bathroom_access_code(uuid, text) to authenticated;
grant execute on function public.vote_on_code(uuid, smallint) to authenticated;
grant execute on function public.create_bathroom_report(uuid, text, text) to authenticated;
grant execute on function public.upsert_cleanliness_rating(uuid, smallint, text) to authenticated;

drop policy if exists "bathrooms_insert_authenticated" on public.bathrooms;
drop policy if exists "codes_insert_authenticated" on public.bathroom_access_codes;
drop policy if exists "code_votes_insert_own" on public.code_votes;
drop policy if exists "code_votes_update_own" on public.code_votes;
drop policy if exists "code_votes_delete_own" on public.code_votes;
drop policy if exists "reports_insert_own" on public.bathroom_reports;
drop policy if exists "ratings_insert_own" on public.cleanliness_ratings;
drop policy if exists "ratings_update_own" on public.cleanliness_ratings;
