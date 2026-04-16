-- ============================================================================
-- 045_access_intelligence_rpcs.sql
-- StallPass Implementation Guide — Access Intelligence RPC surface.
--
-- Depends on 044_access_intelligence_foundation.sql. Adds every server-side
-- function the frontend and edge layers need:
--   * check_access_verification_sybil         (anti-sybil)
--   * calculate_trust_weighted_points         (multiplier math)
--   * check_access_code_consensus             (consensus points + flagging)
--   * verify_access_code                      (confirm / deny / update code)
--   * log_access_intelligence_event           (single event insert)
--   * log_access_intelligence_events_batch    (batch, ≤100)
--   * get_bathroom_predictions                (heuristic prediction layer)
--   * get_user_trust_tier                     (6-tier → 3-tier UX config)
--   * decay_code_confidence                   (hourly decay)
--   * request_business_claim                  (email-domain claim flow)
--   * verify_business_claim                   (code verification)
--   * update_business_profile                 (owner-only patch)
--   * get_business_analytics                  (aggregate business KPIs)
--
-- pg_cron hourly schedule is seeded at the bottom. If pg_cron is unavailable
-- in this environment, the DO block swallows the error and the Edge Function
-- `decay-code-confidence` becomes the operational fallback.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extend point_events.event_type CHECK to cover the two new consensus types
-- produced by check_access_code_consensus. Using the same add-and-replace
-- pattern 006_gamification used so downstream migrations can extend again.
-- ---------------------------------------------------------------------------
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
      'premium_redeemed',
      'code_verification_consensus',
      'consensus_denial_award'
    )
  );

-- ---------------------------------------------------------------------------
-- Helper: shadow-ban check. Returns true if the caller's reputation row has
-- shadow_banned = true. Called inline from the high-traffic RPCs.
-- ---------------------------------------------------------------------------
create or replace function public.is_user_shadow_banned(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(rep.shadow_banned, false)
  from public.contributor_reputation_profiles rep
  where rep.user_id = p_user_id;
$$;

revoke all on function public.is_user_shadow_banned(uuid) from public;
grant execute on function public.is_user_shadow_banned(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Trust multiplier math. Guide Section 11.
-- Multiplier = contributor_reputation_profiles.trust_weight (default 1.00),
-- clamped to [0.25, 4.00] to match the existing column CHECK constraint.
-- Shadow-banned users get multiplier 0 — events still record, points do not.
-- ---------------------------------------------------------------------------
create or replace function public.calculate_trust_weighted_points(
  p_base_points integer,
  p_user_id uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_weight numeric(5, 2);
  v_shadow boolean;
begin
  if p_base_points is null or p_base_points <= 0 or p_user_id is null then
    return 0;
  end if;

  select rep.trust_weight, rep.shadow_banned
  into v_weight, v_shadow
  from public.contributor_reputation_profiles rep
  where rep.user_id = p_user_id;

  if not found then
    -- No reputation row yet (pre-trigger race). Treat as baseline weight.
    v_weight := 1.00;
    v_shadow := false;
  end if;

  if v_shadow then
    return 0;
  end if;

  return greatest(0, round(p_base_points * coalesce(v_weight, 1.00))::integer);
end;
$$;

revoke all on function public.calculate_trust_weighted_points(integer, uuid) from public;
grant execute on function public.calculate_trust_weighted_points(integer, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Anti-sybil check (Guide Section 3).
-- Rejects when ANY of the three gates trips:
--   * velocity:       > 5 code_verifications in the last 10 minutes
--   * device:         fingerprint already bound to >= 2 distinct user_ids
--   * geo:            implied travel > 200 km/h between successive coords
--
-- Returns (allowed, shadow_ban, reason). If shadow_ban is true, caller is
-- expected to mark the reputation row. Function itself does NOT mutate
-- anything — the mutation happens centrally in verify_access_code so we
-- keep one canonical write path.
-- ---------------------------------------------------------------------------
create or replace function public.check_access_verification_sybil(
  p_user_id uuid,
  p_fingerprint text,
  p_latitude double precision,
  p_longitude double precision
)
returns table (
  allowed boolean,
  shadow_ban boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_recent_count integer := 0;
  v_device_user_count integer := 0;
  v_last_row record;
  v_distance_meters numeric := 0;
  v_time_delta_seconds numeric := 0;
  v_speed_kmh numeric := 0;
begin
  if p_user_id is null then
    return query select false, false, 'AUTH_REQUIRED'::text;
    return;
  end if;

  -- Already shadow-banned? Short-circuit — do not leak further telemetry.
  if public.is_user_shadow_banned(p_user_id) then
    return query select false, true, 'SHADOW_BANNED'::text;
    return;
  end if;

  -- Velocity gate: ≤ 5 verifications in last 10 minutes.
  select count(*)::integer
  into v_recent_count
  from public.code_verifications
  where user_id = p_user_id
    and created_at >= now() - interval '10 minutes';

  if v_recent_count >= 5 then
    return query select false, false, 'VELOCITY_LIMIT'::text;
    return;
  end if;

  -- Device-collision gate: a single fingerprint may back at most 2 accounts.
  if p_fingerprint is not null and length(p_fingerprint) > 0 then
    select count(distinct df.user_id)::integer
    into v_device_user_count
    from public.device_fingerprints df
    where df.fingerprint_hash = p_fingerprint
      and df.user_id <> p_user_id;

    -- If 2 distinct OTHER users already bound, the 3rd one is sybil.
    if v_device_user_count >= 2 then
      return query select false, true, 'DEVICE_COLLISION'::text;
      return;
    end if;
  end if;

  -- Geo-impossibility gate: ≤ 200 km/h implied travel.
  if p_latitude is not null and p_longitude is not null then
    select
      df.last_latitude,
      df.last_longitude,
      df.last_seen_at
    into v_last_row
    from public.device_fingerprints df
    where df.user_id = p_user_id
      and df.last_latitude is not null
      and df.last_longitude is not null
    order by df.last_seen_at desc
    limit 1;

    if v_last_row.last_seen_at is not null then
      v_time_delta_seconds := greatest(
        extract(epoch from (now() - v_last_row.last_seen_at))::numeric,
        1::numeric
      );

      v_distance_meters := ST_Distance(
        ST_SetSRID(ST_MakePoint(v_last_row.last_longitude, v_last_row.last_latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
      );

      if v_time_delta_seconds > 0 then
        -- m/s → km/h: (m/s) * 3.6
        v_speed_kmh := (v_distance_meters / v_time_delta_seconds) * 3.6;
      end if;

      if v_speed_kmh > 200 then
        return query select false, true, 'GEO_IMPOSSIBILITY'::text;
        return;
      end if;
    end if;
  end if;

  return query select true, false, null::text;
end;
$$;

revoke all on function public.check_access_verification_sybil(uuid, text, double precision, double precision) from public;
grant execute on function public.check_access_verification_sybil(uuid, text, double precision, double precision) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Consensus evaluation (Guide Section 11).
-- Looks only at the most recent 30-day window of code_verifications tied to
-- the bathroom's currently active code. On 3+ confirms / 0 denies → award
-- consensus points to every confirmer (idempotent via point_events unique).
-- On 3+ denies / 0 confirms → increment moderation_flag_count on the
-- submitter and award consensus points to the deniers.
-- ---------------------------------------------------------------------------
create or replace function public.check_access_code_consensus(
  p_bathroom_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_code record;
  v_confirm_rows integer := 0;
  v_deny_rows integer := 0;
  v_award_base integer := 8;
  v_deny_award_base integer := 4;
begin
  if p_bathroom_id is null then
    return;
  end if;

  select id, submitted_by, bathroom_id
  into v_active_code
  from public.bathroom_access_codes
  where bathroom_id = p_bathroom_id
    and lifecycle_status = 'active'
    and visibility_status = 'visible'
  order by last_verified_at desc nulls last, confidence_score desc
  limit 1;

  if v_active_code.id is null then
    return;
  end if;

  select
    count(*) filter (where action = 'confirm')::integer,
    count(*) filter (where action = 'deny')::integer
  into v_confirm_rows, v_deny_rows
  from public.code_verifications
  where code_id = v_active_code.id
    and created_at >= now() - interval '30 days';

  -- CONFIRM consensus: ≥ 3 confirms AND 0 denies → award confirmers.
  if v_confirm_rows >= 3 and v_deny_rows = 0 then
    with confirmers as (
      select distinct on (cv.user_id) cv.user_id
      from public.code_verifications cv
      where cv.code_id = v_active_code.id
        and cv.action = 'confirm'
        and cv.created_at >= now() - interval '30 days'
    ),
    awards as (
      insert into public.point_events (
        user_id,
        event_type,
        reference_table,
        reference_id,
        points_awarded,
        metadata
      )
      select
        confirmers.user_id,
        'code_verification_consensus',
        'bathroom_access_codes',
        v_active_code.id,
        public.calculate_trust_weighted_points(v_award_base, confirmers.user_id),
        jsonb_build_object(
          'bathroom_id', v_active_code.bathroom_id,
          'consensus', 'confirm',
          'base_points', v_award_base
        )
      from confirmers
      where public.calculate_trust_weighted_points(v_award_base, confirmers.user_id) > 0
      on conflict (user_id, event_type, reference_table, reference_id) do nothing
      returning user_id, points_awarded
    )
    update public.profiles p
    set
      points_balance = p.points_balance + awards.points_awarded,
      updated_at = now()
    from awards
    where p.id = awards.user_id;
  end if;

  -- DENY consensus: ≥ 3 denies AND 0 confirms → flag submitter + award deniers.
  if v_deny_rows >= 3 and v_confirm_rows = 0 then
    update public.contributor_reputation_profiles
    set
      moderation_flag_count = moderation_flag_count + 1,
      last_calculated_at = now()
    where user_id = v_active_code.submitted_by;

    with deniers as (
      select distinct on (cv.user_id) cv.user_id
      from public.code_verifications cv
      where cv.code_id = v_active_code.id
        and cv.action = 'deny'
        and cv.created_at >= now() - interval '30 days'
    ),
    awards as (
      insert into public.point_events (
        user_id,
        event_type,
        reference_table,
        reference_id,
        points_awarded,
        metadata
      )
      select
        deniers.user_id,
        'consensus_denial_award',
        'bathroom_access_codes',
        v_active_code.id,
        public.calculate_trust_weighted_points(v_deny_award_base, deniers.user_id),
        jsonb_build_object(
          'bathroom_id', v_active_code.bathroom_id,
          'consensus', 'deny',
          'base_points', v_deny_award_base
        )
      from deniers
      where public.calculate_trust_weighted_points(v_deny_award_base, deniers.user_id) > 0
      on conflict (user_id, event_type, reference_table, reference_id) do nothing
      returning user_id, points_awarded
    )
    update public.profiles p
    set
      points_balance = p.points_balance + awards.points_awarded,
      updated_at = now()
    from awards
    where p.id = awards.user_id;
  end if;
end;
$$;

revoke all on function public.check_access_code_consensus(uuid) from public;
grant execute on function public.check_access_code_consensus(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- verify_access_code — Guide Section 2.
-- One round trip handles: sybil → fingerprint upsert → insert code_verification
-- → (for update/new code) insert bathroom_access_codes → code_votes
-- confirm/deny → refresh aggregates → consensus → access intelligence event.
--
-- action = 'confirm'  : vote +1 on the active code
-- action = 'deny'     : vote -1 on the active code
-- action = 'update'   : submit a new code (reported_code required)
-- ---------------------------------------------------------------------------
create or replace function public.verify_access_code(
  p_bathroom_id uuid,
  p_action public.code_verification_action_enum,
  p_reported_code text default null,
  p_device_fingerprint text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_sybil record;
  v_active_code record;
  v_target_code_id uuid;
  v_trust_weight numeric(5, 2) := 1.00;
  v_shadow boolean := false;
  v_effective_weight numeric(5, 2);
  v_normalized_code text;
  v_existing_vote smallint;
  v_verification_id uuid;
  v_geo geography(point, 4326);
begin
  v_user_id := public.assert_active_user();

  -- 1. Sybil gate.
  select * into v_sybil
  from public.check_access_verification_sybil(
    v_user_id,
    p_device_fingerprint,
    p_latitude,
    p_longitude
  );

  if not v_sybil.allowed then
    if v_sybil.shadow_ban then
      update public.contributor_reputation_profiles
      set
        shadow_banned = true,
        shadow_banned_reason = coalesce(shadow_banned_reason, v_sybil.reason),
        shadow_banned_at = coalesce(shadow_banned_at, now()),
        last_calculated_at = now()
      where user_id = v_user_id;
      v_shadow := true;
    end if;

    return jsonb_build_object(
      'status', 'rejected',
      'reason', v_sybil.reason,
      'shadow_banned', v_shadow
    );
  end if;

  -- 2. Load current trust signals.
  select
    coalesce(rep.trust_weight, 1.00),
    coalesce(rep.shadow_banned, false)
  into v_trust_weight, v_shadow
  from public.contributor_reputation_profiles rep
  where rep.user_id = v_user_id;

  if not found then
    v_trust_weight := 1.00;
    v_shadow := false;
  end if;

  -- 3. Upsert device fingerprint row so the geo/velocity checks have state.
  if p_device_fingerprint is not null and length(p_device_fingerprint) > 0 then
    insert into public.device_fingerprints (
      user_id,
      fingerprint_hash,
      first_seen_at,
      last_seen_at,
      last_latitude,
      last_longitude,
      contributions_10min
    )
    values (
      v_user_id,
      p_device_fingerprint,
      now(),
      now(),
      p_latitude,
      p_longitude,
      1
    )
    on conflict (user_id, fingerprint_hash) do update
    set
      last_seen_at = now(),
      last_latitude = coalesce(excluded.last_latitude, public.device_fingerprints.last_latitude),
      last_longitude = coalesce(excluded.last_longitude, public.device_fingerprints.last_longitude),
      contributions_10min = (
        select count(*)::integer
        from public.code_verifications cv
        where cv.user_id = v_user_id
          and cv.created_at >= now() - interval '10 minutes'
      ) + 1;
  end if;

  -- 4. Resolve the active code, if any.
  select id, submitted_by, code_value
  into v_active_code
  from public.bathroom_access_codes
  where bathroom_id = p_bathroom_id
    and lifecycle_status = 'active'
    and visibility_status = 'visible'
  order by last_verified_at desc nulls last, confidence_score desc
  limit 1;

  v_effective_weight := case when v_shadow then 0::numeric else v_trust_weight end;

  if p_latitude is not null and p_longitude is not null then
    v_geo := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
  else
    v_geo := null;
  end if;

  -- 5. Branch on action.
  if p_action = 'update'::public.code_verification_action_enum then
    v_normalized_code := nullif(btrim(p_reported_code), '');
    if v_normalized_code is null then
      raise exception 'CODE_REQUIRED' using errcode = 'P0001';
    end if;

    -- Mark any existing active code as superseded.
    if v_active_code.id is not null then
      update public.bathroom_access_codes
      set
        lifecycle_status = 'superseded',
        visibility_status = 'needs_review',
        updated_at = now()
      where id = v_active_code.id;
    end if;

    insert into public.bathroom_access_codes (
      bathroom_id,
      submitted_by,
      code_value,
      confidence_score,
      lifecycle_status,
      visibility_status,
      last_verified_at
    )
    values (
      p_bathroom_id,
      v_user_id,
      v_normalized_code,
      40,
      'active',
      'visible',
      now()
    )
    returning id into v_target_code_id;

    -- Record the append-only ledger entry.
    insert into public.code_verifications (
      bathroom_id,
      code_id,
      user_id,
      action,
      reported_code,
      device_fingerprint,
      geo_point,
      trust_weight,
      effective_weight,
      shadow_banned_at_time
    )
    values (
      p_bathroom_id,
      v_target_code_id,
      v_user_id,
      'update',
      v_normalized_code,
      p_device_fingerprint,
      v_geo,
      v_trust_weight,
      v_effective_weight,
      v_shadow
    )
    returning id into v_verification_id;

    -- Award submission points idempotently.
    if not v_shadow then
      with ev as (
        insert into public.point_events (
          user_id,
          event_type,
          reference_table,
          reference_id,
          points_awarded,
          metadata
        )
        values (
          v_user_id,
          'code_submitted',
          'bathroom_access_codes',
          v_target_code_id,
          public.calculate_trust_weighted_points(15, v_user_id),
          jsonb_build_object(
            'bathroom_id', p_bathroom_id,
            'base_points', 15
          )
        )
        on conflict (user_id, event_type, reference_table, reference_id) do nothing
        returning points_awarded
      )
      update public.profiles p
      set points_balance = p.points_balance + ev.points_awarded,
          updated_at = now()
      from ev
      where p.id = v_user_id;
    end if;

    -- Emit an intelligence event.
    insert into public.access_intelligence_events (
      user_id,
      event_type,
      bathroom_id,
      payload,
      device_fingerprint,
      geo_point
    )
    values (
      v_user_id,
      'code_submitted',
      p_bathroom_id,
      jsonb_build_object(
        'code_id', v_target_code_id,
        'verification_id', v_verification_id
      ),
      p_device_fingerprint,
      v_geo
    );

    return jsonb_build_object(
      'status', 'accepted',
      'action', 'update',
      'code_id', v_target_code_id,
      'verification_id', v_verification_id,
      'trust_weight', v_trust_weight
    );
  end if;

  -- confirm / deny branch requires a pre-existing active code.
  if v_active_code.id is null then
    raise exception 'NO_ACTIVE_CODE' using errcode = 'P0001';
  end if;

  if v_active_code.submitted_by = v_user_id then
    raise exception 'SELF_CODE_VOTE' using errcode = 'P0001';
  end if;

  v_target_code_id := v_active_code.id;

  -- Ledger insert first (captures the action even if the vote upsert raises).
  insert into public.code_verifications (
    bathroom_id,
    code_id,
    user_id,
    action,
    reported_code,
    device_fingerprint,
    geo_point,
    trust_weight,
    effective_weight,
    shadow_banned_at_time
  )
  values (
    p_bathroom_id,
    v_target_code_id,
    v_user_id,
    p_action,
    nullif(btrim(p_reported_code), ''),
    p_device_fingerprint,
    v_geo,
    v_trust_weight,
    v_effective_weight,
    v_shadow
  )
  returning id into v_verification_id;

  -- Upsert the underlying code_vote (drives existing trust/points triggers).
  select vote into v_existing_vote
  from public.code_votes
  where code_id = v_target_code_id
    and user_id = v_user_id;

  if p_action = 'confirm'::public.code_verification_action_enum then
    if v_existing_vote is null then
      insert into public.code_votes (code_id, user_id, vote)
      values (v_target_code_id, v_user_id, 1);
    elsif v_existing_vote <> 1 then
      update public.code_votes
      set vote = 1, updated_at = now()
      where code_id = v_target_code_id and user_id = v_user_id;
    end if;
  else
    -- deny
    if v_existing_vote is null then
      insert into public.code_votes (code_id, user_id, vote)
      values (v_target_code_id, v_user_id, -1);
    elsif v_existing_vote <> -1 then
      update public.code_votes
      set vote = -1, updated_at = now()
      where code_id = v_target_code_id and user_id = v_user_id;
    end if;
  end if;

  -- Force an aggregate refresh (trigger already runs, but we want the freshest
  -- score available before the consensus check and the prediction returns).
  perform public.refresh_bathroom_access_code_aggregates(v_target_code_id);

  -- Consensus check / flag / award.
  perform public.check_access_code_consensus(p_bathroom_id);

  -- Emit an intelligence event for the confirm/deny.
  insert into public.access_intelligence_events (
    user_id,
    event_type,
    bathroom_id,
    payload,
    device_fingerprint,
    geo_point
  )
  values (
    v_user_id,
    case when p_action = 'confirm'::public.code_verification_action_enum
      then 'code_confirmed'
      else 'code_denied'
    end,
    p_bathroom_id,
    jsonb_build_object(
      'code_id', v_target_code_id,
      'verification_id', v_verification_id
    ),
    p_device_fingerprint,
    v_geo
  );

  return jsonb_build_object(
    'status', 'accepted',
    'action', p_action::text,
    'code_id', v_target_code_id,
    'verification_id', v_verification_id,
    'trust_weight', v_trust_weight
  );
end;
$$;

revoke all on function public.verify_access_code(uuid, public.code_verification_action_enum, text, text, double precision, double precision) from public;
grant execute on function public.verify_access_code(uuid, public.code_verification_action_enum, text, text, double precision, double precision) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Single-event logger. Guide Section 4.
-- Enforces the same 17-event whitelist the table CHECK enforces; raises a
-- typed error for anything else so the client can surface a clear message.
-- ---------------------------------------------------------------------------
create or replace function public.log_access_intelligence_event(
  p_event_type text,
  p_bathroom_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_device_fingerprint text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_session_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_allowed text[] := array[
    'bathroom_viewed',
    'bathroom_searched',
    'code_viewed',
    'code_confirmed',
    'code_denied',
    'code_submitted',
    'check_in',
    'check_out',
    'prediction_shown',
    'prediction_correct',
    'user_override',
    'review_submitted',
    'photo_uploaded',
    'report_submitted',
    'app_opened',
    'app_backgrounded',
    'urgency_session'
  ];
  v_geo geography(point, 4326);
  v_event_id uuid;
begin
  v_user_id := public.assert_active_user();

  if p_event_type is null or not (p_event_type = any (v_allowed)) then
    raise exception 'INVALID_EVENT_TYPE' using errcode = 'P0001';
  end if;

  if p_latitude is not null and p_longitude is not null then
    v_geo := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography;
  end if;

  insert into public.access_intelligence_events (
    user_id,
    event_type,
    bathroom_id,
    payload,
    device_fingerprint,
    geo_point,
    session_id
  )
  values (
    v_user_id,
    p_event_type,
    p_bathroom_id,
    coalesce(p_payload, '{}'::jsonb),
    p_device_fingerprint,
    v_geo,
    p_session_id
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.log_access_intelligence_event(text, uuid, jsonb, text, double precision, double precision, text) from public;
grant execute on function public.log_access_intelligence_event(text, uuid, jsonb, text, double precision, double precision, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Batch event ingest (≤100 events). Each element must be an object with:
--   { event_type, bathroom_id?, payload?, device_fingerprint?, latitude?,
--     longitude?, session_id? }
-- Returns the count of inserted rows. Rejects the whole batch on any
-- whitelist violation — the client can always fall back to the single-event
-- RPC if it needs partial success semantics.
-- ---------------------------------------------------------------------------
create or replace function public.log_access_intelligence_events_batch(
  p_events jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_allowed text[] := array[
    'bathroom_viewed',
    'bathroom_searched',
    'code_viewed',
    'code_confirmed',
    'code_denied',
    'code_submitted',
    'check_in',
    'check_out',
    'prediction_shown',
    'prediction_correct',
    'user_override',
    'review_submitted',
    'photo_uploaded',
    'report_submitted',
    'app_opened',
    'app_backgrounded',
    'urgency_session'
  ];
  v_batch_size integer;
  v_insert_count integer := 0;
begin
  v_user_id := public.assert_active_user();

  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    raise exception 'INVALID_BATCH' using errcode = 'P0001';
  end if;

  v_batch_size := jsonb_array_length(p_events);
  if v_batch_size = 0 then
    return 0;
  end if;

  if v_batch_size > 100 then
    raise exception 'BATCH_TOO_LARGE' using errcode = 'P0001';
  end if;

  -- Validate up-front; single CTE handles the insert.
  if exists (
    select 1
    from jsonb_array_elements(p_events) e
    where not ((e->>'event_type') = any (v_allowed))
  ) then
    raise exception 'INVALID_EVENT_TYPE' using errcode = 'P0001';
  end if;

  with parsed as (
    select
      e->>'event_type' as event_type,
      nullif(e->>'bathroom_id', '')::uuid as bathroom_id,
      coalesce(e->'payload', '{}'::jsonb) as payload,
      nullif(e->>'device_fingerprint', '') as device_fingerprint,
      nullif(e->>'latitude', '')::double precision as latitude,
      nullif(e->>'longitude', '')::double precision as longitude,
      nullif(e->>'session_id', '') as session_id
    from jsonb_array_elements(p_events) e
  ),
  inserted as (
    insert into public.access_intelligence_events (
      user_id,
      event_type,
      bathroom_id,
      payload,
      device_fingerprint,
      geo_point,
      session_id
    )
    select
      v_user_id,
      parsed.event_type,
      parsed.bathroom_id,
      parsed.payload,
      parsed.device_fingerprint,
      case
        when parsed.latitude is not null and parsed.longitude is not null
        then ST_SetSRID(ST_MakePoint(parsed.longitude, parsed.latitude), 4326)::geography
        else null
      end,
      parsed.session_id
    from parsed
    returning 1
  )
  select count(*)::integer into v_insert_count from inserted;

  return v_insert_count;
end;
$$;

revoke all on function public.log_access_intelligence_events_batch(jsonb) from public;
grant execute on function public.log_access_intelligence_events_batch(jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Heuristic prediction layer (Guide Section 5). Returns one JSONB row with:
--   likely_accessible (boolean)
--   confidence        (numeric, 0–1)
--   busy_level        ('low' | 'medium' | 'high')
--   best_time         (text, ISO hour or null)
--   model_version     ('heuristic-v1')
--
-- Inputs: bathrooms.access_type, bathroom_access_codes.confidence_score,
-- bathrooms.peak_usage_jsonb, recent access_intelligence_events.
-- ---------------------------------------------------------------------------
create or replace function public.get_bathroom_predictions(
  p_bathroom_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_bathroom record;
  v_code_confidence numeric := 0;
  v_code_fresh boolean := false;
  v_access_ok boolean := true;
  v_confidence numeric := 0.4;
  v_recent_views integer := 0;
  v_peak jsonb;
  v_best_hour integer := null;
  v_best_count integer := 0;
  v_current_hour integer := extract(hour from (now() at time zone 'UTC'))::integer;
  v_current_bucket integer := 0;
  v_busy text := 'low';
begin
  select
    access_type,
    hardware_ready,
    peak_usage_jsonb,
    moderation_status
  into v_bathroom
  from public.bathrooms
  where id = p_bathroom_id;

  if v_bathroom.access_type is null or v_bathroom.moderation_status <> 'active' then
    return jsonb_build_object(
      'bathroom_id', p_bathroom_id,
      'likely_accessible', false,
      'confidence', 0,
      'busy_level', 'low',
      'best_time', null,
      'model_version', 'heuristic-v1'
    );
  end if;

  -- Pull most authoritative active code confidence.
  select
    coalesce(confidence_score, 0) / 100.0,
    coalesce(last_verified_at, created_at) >= now() - interval '14 days'
  into v_code_confidence, v_code_fresh
  from public.bathroom_access_codes
  where bathroom_id = p_bathroom_id
    and lifecycle_status = 'active'
    and visibility_status = 'visible'
  order by last_verified_at desc nulls last, confidence_score desc
  limit 1;

  -- Map access_type into a base accessibility signal.
  v_access_ok := case v_bathroom.access_type
    when 'public' then true
    when 'code' then coalesce(v_code_confidence >= 0.45 and v_code_fresh, false)
    when 'purchase_required' then true  -- accessible, but conditional
    when 'key' then false
    when 'nfc_future' then false
    else true
  end;

  v_confidence := case v_bathroom.access_type
    when 'public' then 0.90
    when 'code' then greatest(0.15, least(0.95, coalesce(v_code_confidence, 0.40)))
    when 'purchase_required' then 0.70
    when 'key' then 0.30
    when 'nfc_future' then 0.25
    else 0.50
  end;

  -- Busy level: blend peak_usage_jsonb and recent event counts.
  v_peak := coalesce(v_bathroom.peak_usage_jsonb, '{}'::jsonb);
  if jsonb_typeof(v_peak) = 'object' then
    v_current_bucket := coalesce(
      (v_peak ->> v_current_hour::text)::integer,
      0
    );

    select coalesce(sum(coalesce((v_peak ->> k)::integer, 0)), 0)::integer
    into v_best_count
    from generate_series(0, 23) as k;
  end if;

  select count(*)::integer
  into v_recent_views
  from public.access_intelligence_events
  where bathroom_id = p_bathroom_id
    and event_type in ('bathroom_viewed', 'check_in')
    and created_at >= now() - interval '2 hours';

  if v_current_bucket >= 15 or v_recent_views >= 10 then
    v_busy := 'high';
  elsif v_current_bucket >= 6 or v_recent_views >= 4 then
    v_busy := 'medium';
  else
    v_busy := 'low';
  end if;

  -- Best_time: hour with lowest non-zero peak_usage value (quietest), else null.
  if jsonb_typeof(v_peak) = 'object' then
    select k::integer
    into v_best_hour
    from generate_series(0, 23) as k
    where coalesce((v_peak ->> k::text)::integer, 0) >= 0
    order by coalesce((v_peak ->> k::text)::integer, 999) asc, k asc
    limit 1;
  end if;

  return jsonb_build_object(
    'bathroom_id', p_bathroom_id,
    'likely_accessible', v_access_ok,
    'confidence', round(v_confidence, 3),
    'busy_level', v_busy,
    'best_time', case when v_best_hour is null then null else lpad(v_best_hour::text, 2, '0') || ':00' end,
    'model_version', 'heuristic-v1'
  );
end;
$$;

revoke all on function public.get_bathroom_predictions(uuid) from public;
grant execute on function public.get_bathroom_predictions(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Trust-tier UX bucket resolver (Guide Section 9).
-- Returns a JSONB config the client can consume directly:
--   { tier, bucket, codeRevealDelayMs, showVerificationPrompts,
--     canSubmitCodes, showTrustedBadge, verificationPromptsFrequency,
--     shadow_banned }
-- ---------------------------------------------------------------------------
create or replace function public.get_user_trust_tier()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_rep record;
  v_bucket text := 'newcomer';
  v_reveal_delay_ms integer := 5000;
  v_show_prompts boolean := true;
  v_can_submit boolean := false;
  v_show_badge boolean := false;
  v_prompt_freq text := 'always';
begin
  v_user_id := public.assert_active_user();

  select
    rep.trust_tier,
    rep.trust_weight,
    rep.trust_score,
    coalesce(rep.shadow_banned, false) as shadow_banned,
    rep.accepted_contributions,
    rep.code_success_ratio
  into v_rep
  from public.contributor_reputation_profiles rep
  where rep.user_id = v_user_id;

  if not found then
    v_rep.trust_tier := 'brand_new';
    v_rep.trust_weight := 1.00;
    v_rep.trust_score := 25;
    v_rep.shadow_banned := false;
    v_rep.accepted_contributions := 0;
    v_rep.code_success_ratio := 0;
  end if;

  -- Map 6-tier server taxonomy → 3-bucket UX.
  v_bucket := case v_rep.trust_tier
    when 'highly_reliable_local' then 'power'
    when 'business_verified_manager' then 'power'
    when 'verified_contributor' then 'normal'
    when 'lightly_trusted' then 'normal'
    when 'flagged_low_trust' then 'newcomer'
    else 'newcomer'
  end;

  case v_bucket
    when 'power' then
      v_reveal_delay_ms := 0;
      v_show_prompts := true;
      v_can_submit := true;
      v_show_badge := true;
      v_prompt_freq := 'occasional';
    when 'normal' then
      v_reveal_delay_ms := 1500;
      v_show_prompts := true;
      v_can_submit := true;
      v_show_badge := false;
      v_prompt_freq := 'frequent';
    else
      v_reveal_delay_ms := 5000;
      v_show_prompts := true;
      v_can_submit := v_rep.trust_tier <> 'flagged_low_trust';
      v_show_badge := false;
      v_prompt_freq := 'always';
  end case;

  if v_rep.shadow_banned then
    v_can_submit := false;
    v_show_badge := false;
    v_reveal_delay_ms := 9000;
  end if;

  return jsonb_build_object(
    'user_id', v_user_id,
    'tier', v_rep.trust_tier,
    'bucket', v_bucket,
    'trust_weight', v_rep.trust_weight,
    'trust_score', v_rep.trust_score,
    'shadow_banned', v_rep.shadow_banned,
    'codeRevealDelayMs', v_reveal_delay_ms,
    'showVerificationPrompts', v_show_prompts,
    'canSubmitCodes', v_can_submit,
    'showTrustedBadge', v_show_badge,
    'verificationPromptsFrequency', v_prompt_freq
  );
end;
$$;

revoke all on function public.get_user_trust_tier() from public;
grant execute on function public.get_user_trust_tier() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Hourly confidence decay (Guide Section 2).
-- For every active visible code with last_verified_at older than 1 hour,
-- subtract a time-proportional amount from confidence_score. Once score
-- falls below 10, mark the code needs_review. No new lifecycle state is
-- invented — existing 'visibility_status = needs_review' is reused.
-- ---------------------------------------------------------------------------
create or replace function public.decay_code_confidence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  with decayed as (
    update public.bathroom_access_codes codes
    set
      confidence_score = greatest(
        0,
        round(
          codes.confidence_score -
            (extract(epoch from (now() - coalesce(codes.last_verified_at, codes.created_at))) / 3600.0) * 0.35,
          2
        )
      ),
      visibility_status = case
        when codes.confidence_score - (extract(epoch from (now() - coalesce(codes.last_verified_at, codes.created_at))) / 3600.0) * 0.35 < 10
        then 'needs_review'
        else codes.visibility_status
      end,
      updated_at = now()
    where codes.lifecycle_status = 'active'
      and codes.visibility_status = 'visible'
      and coalesce(codes.last_verified_at, codes.created_at) < now() - interval '1 hour'
    returning 1
  )
  select count(*)::integer into v_updated from decayed;

  return v_updated;
end;
$$;

revoke all on function public.decay_code_confidence() from public;
grant execute on function public.decay_code_confidence() to service_role;

-- ---------------------------------------------------------------------------
-- Business claim flow (Guide Section 6).
-- request_business_claim: owner enters a business-domain email; we generate
-- a 6-digit code, store hash + expiry (15 min), return opaque token so
-- the edge function can dispatch the email without exposing the code to
-- the caller.
-- ---------------------------------------------------------------------------
create or replace function public.request_business_claim(
  p_business_id uuid,
  p_contact_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_business record;
  v_domain text;
  v_code text;
  v_claim_id uuid;
begin
  v_user_id := public.assert_active_user();

  if p_business_id is null then
    raise exception 'BUSINESS_REQUIRED' using errcode = 'P0001';
  end if;

  if p_contact_email is null or p_contact_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001';
  end if;

  v_domain := lower(split_part(p_contact_email, '@', 2));

  select id, name, claimed
  into v_business
  from public.businesses
  where id = p_business_id;

  if v_business.id is null then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_business.claimed then
    raise exception 'ALREADY_CLAIMED' using errcode = 'P0001';
  end if;

  v_code := lpad((floor(random() * 1000000))::integer::text, 6, '0');

  insert into public.business_claims (
    bathroom_id,
    claimant_user_id,
    business_name,
    contact_email,
    review_status,
    business_id,
    email_domain,
    verification_code,
    verification_sent_at,
    verification_expires_at
  )
  select
    bathrooms.id,
    v_user_id,
    v_business.name,
    p_contact_email,
    'pending',
    v_business.id,
    v_domain,
    v_code,
    now(),
    now() + interval '15 minutes'
  from public.bathrooms
  where bathrooms.business_id = v_business.id
  order by bathrooms.created_at asc
  limit 1
  returning id into v_claim_id;

  if v_claim_id is null then
    -- Business has no bathrooms attached — use a synthetic bathroom-less claim:
    -- insert using any stub bathroom-less path is not possible (bathroom_id
    -- is NOT NULL) so we require at least one linked bathroom.
    raise exception 'BUSINESS_HAS_NO_BATHROOM' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'status', 'pending_verification',
    'claim_id', v_claim_id,
    'business_id', v_business.id,
    'contact_email', p_contact_email,
    'email_domain', v_domain,
    'verification_code', v_code,
    'verification_expires_at', (now() + interval '15 minutes')
  );
end;
$$;

revoke all on function public.request_business_claim(uuid, text) from public;
grant execute on function public.request_business_claim(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- verify_business_claim: accepts the 6-digit code; on success marks
-- businesses.claimed = true, stamps claimed_by/claimed_at, and marks the
-- matching business_claims row 'approved'.
-- ---------------------------------------------------------------------------
create or replace function public.verify_business_claim(
  p_business_id uuid,
  p_verification_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_claim record;
begin
  v_user_id := public.assert_active_user();

  if p_business_id is null or p_verification_code is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;

  select id, verification_expires_at, verification_code
  into v_claim
  from public.business_claims
  where business_id = p_business_id
    and claimant_user_id = v_user_id
    and review_status = 'pending'
  order by created_at desc
  limit 1;

  if v_claim.id is null then
    raise exception 'CLAIM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_claim.verification_expires_at is null or v_claim.verification_expires_at < now() then
    raise exception 'CLAIM_EXPIRED' using errcode = 'P0001';
  end if;

  if v_claim.verification_code is null or v_claim.verification_code <> btrim(p_verification_code) then
    raise exception 'CODE_MISMATCH' using errcode = 'P0001';
  end if;

  update public.business_claims
  set
    review_status = 'approved',
    reviewed_at = now(),
    reviewed_by = v_user_id,
    verification_code = null,
    updated_at = now()
  where id = v_claim.id;

  update public.businesses
  set
    claimed = true,
    claimed_by = v_user_id,
    claimed_at = now(),
    claim_verification_method = 'email_domain',
    verified = true,
    updated_at = now()
  where id = p_business_id;

  return jsonb_build_object(
    'status', 'approved',
    'business_id', p_business_id,
    'claim_id', v_claim.id
  );
end;
$$;

revoke all on function public.verify_business_claim(uuid, text) from public;
grant execute on function public.verify_business_claim(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- update_business_profile: patch name/address/hours/policies/phone/website
-- on a claimed business. Owner-only enforced inline.
-- ---------------------------------------------------------------------------
create or replace function public.update_business_profile(
  p_business_id uuid,
  p_patch jsonb
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_business public.businesses%rowtype;
begin
  v_user_id := public.assert_active_user();

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'INVALID_PATCH' using errcode = 'P0001';
  end if;

  select * into v_business
  from public.businesses
  where id = p_business_id;

  if v_business.id is null then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not v_business.claimed or v_business.claimed_by <> v_user_id then
    raise exception 'NOT_OWNER' using errcode = 'P0001';
  end if;

  update public.businesses b
  set
    name = coalesce(nullif(btrim(p_patch->>'name'), ''), b.name),
    address = coalesce(nullif(btrim(p_patch->>'address'), ''), b.address),
    latitude = coalesce(nullif(p_patch->>'latitude', '')::double precision, b.latitude),
    longitude = coalesce(nullif(p_patch->>'longitude', '')::double precision, b.longitude),
    category = coalesce(nullif(btrim(p_patch->>'category'), ''), b.category),
    phone = coalesce(nullif(btrim(p_patch->>'phone'), ''), b.phone),
    website = coalesce(nullif(btrim(p_patch->>'website'), ''), b.website),
    hours = coalesce(p_patch->'hours', b.hours),
    policies = coalesce(p_patch->'policies', b.policies),
    updated_at = now()
  where b.id = p_business_id
  returning * into v_business;

  return v_business;
end;
$$;

revoke all on function public.update_business_profile(uuid, jsonb) from public;
grant execute on function public.update_business_profile(uuid, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- get_business_analytics: aggregate KPIs for the claimed business's attached
-- bathrooms. Returns 30-day views, 7-day verifications, confirm/deny ratio,
-- and a simple accessibility percentage.
-- ---------------------------------------------------------------------------
create or replace function public.get_business_analytics(
  p_business_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_business record;
  v_bathroom_ids uuid[];
  v_views_30d integer := 0;
  v_events_7d integer := 0;
  v_confirms integer := 0;
  v_denies integer := 0;
  v_code_refresh_rate numeric := 0;
  v_accessible_pct numeric := 0;
  v_total_bathrooms integer := 0;
  v_accessible_bathrooms integer := 0;
begin
  v_user_id := public.assert_active_user();

  select id, claimed, claimed_by
  into v_business
  from public.businesses
  where id = p_business_id;

  if v_business.id is null then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not v_business.claimed or v_business.claimed_by <> v_user_id then
    raise exception 'NOT_OWNER' using errcode = 'P0001';
  end if;

  select array_agg(id)
  into v_bathroom_ids
  from public.bathrooms
  where business_id = p_business_id;

  if v_bathroom_ids is null or array_length(v_bathroom_ids, 1) is null then
    return jsonb_build_object(
      'business_id', p_business_id,
      'bathroom_count', 0,
      'views_30d', 0,
      'events_7d', 0,
      'confirm_count', 0,
      'deny_count', 0,
      'code_refresh_rate', 0,
      'accessible_pct', 0,
      'model_version', 'analytics-v1'
    );
  end if;

  select count(*)::integer
  into v_views_30d
  from public.bathroom_views
  where bathroom_id = any (v_bathroom_ids)
    and viewed_at >= now() - interval '30 days';

  select count(*)::integer
  into v_events_7d
  from public.access_intelligence_events
  where bathroom_id = any (v_bathroom_ids)
    and created_at >= now() - interval '7 days';

  select
    count(*) filter (where action = 'confirm')::integer,
    count(*) filter (where action = 'deny')::integer
  into v_confirms, v_denies
  from public.code_verifications
  where bathroom_id = any (v_bathroom_ids)
    and created_at >= now() - interval '30 days';

  if v_confirms + v_denies > 0 then
    v_code_refresh_rate := round(
      v_confirms::numeric / (v_confirms + v_denies),
      3
    );
  end if;

  select
    coalesce(count(*) filter (where is_accessible is true), 0)::integer,
    coalesce(count(*), 0)::integer
  into v_accessible_bathrooms, v_total_bathrooms
  from public.bathrooms
  where id = any (v_bathroom_ids);

  if v_total_bathrooms > 0 then
    v_accessible_pct := round(v_accessible_bathrooms::numeric / v_total_bathrooms, 3);
  end if;

  return jsonb_build_object(
    'business_id', p_business_id,
    'bathroom_count', v_total_bathrooms,
    'views_30d', v_views_30d,
    'events_7d', v_events_7d,
    'confirm_count', v_confirms,
    'deny_count', v_denies,
    'code_refresh_rate', v_code_refresh_rate,
    'accessible_pct', v_accessible_pct,
    'model_version', 'analytics-v1'
  );
end;
$$;

revoke all on function public.get_business_analytics(uuid) from public;
grant execute on function public.get_business_analytics(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- pg_cron hourly decay schedule. Wrapped in a DO block so environments
-- without pg_cron still succeed — the Edge Function fallback covers those.
-- ---------------------------------------------------------------------------
do $outer$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    if exists (select 1 from cron.job where jobname = 'decay-code-confidence-hourly') then
      perform cron.unschedule('decay-code-confidence-hourly');
    end if;

    perform cron.schedule(
      'decay-code-confidence-hourly',
      '0 * * * *',
      'select public.decay_code_confidence();'
    );
  end if;
exception
  when others then
    -- pg_cron not permitted in this environment; Edge Function cron takes over.
    null;
end
$outer$;

-- End of 045.
