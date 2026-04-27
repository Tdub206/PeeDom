-- ============================================================================
-- 051_source_candidate_graph.sql
-- Canonical bathroom graph with source candidates, provenance, auditability,
-- and candidate promotion after two distinct eligible positive verifications.
-- ============================================================================

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'bathroom_source_record_status_enum'
  ) then
    create type public.bathroom_source_record_status_enum as enum (
      'candidate',
      'linked',
      'promoted',
      'rejected',
      'likely_removed',
      'superseded'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'source_record_freshness_status_enum'
  ) then
    create type public.source_record_freshness_status_enum as enum (
      'unreviewed',
      'fresh',
      'aging',
      'disputed',
      'likely_removed'
    );
  end if;

  if not exists (
    select 1
    from pg_type
    where typname = 'bathroom_field_source_kind_enum'
  ) then
    create type public.bathroom_field_source_kind_enum as enum (
      'import',
      'community',
      'business',
      'admin',
      'system'
    );
  end if;
end
$$;

create table if not exists public.bathroom_source_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  source_dataset text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'applied')),
  total_records integer not null default 0,
  inserted_records integer not null default 0,
  updated_records integer not null default 0,
  linked_records integer not null default 0,
  promoted_records integer not null default 0,
  raw_artifact_path text,
  normalized_artifact_path text,
  raw_artifact_hash text,
  normalized_artifact_hash text,
  operator_notes text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bathroom_source_records (
  id uuid primary key default gen_random_uuid(),
  source_key text not null,
  external_source_id text not null,
  canonical_bathroom_id uuid references public.bathrooms(id) on delete set null,
  status public.bathroom_source_record_status_enum not null default 'candidate',
  is_public_candidate boolean not null default true,
  place_name text not null,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text not null default 'US',
  latitude double precision not null,
  longitude double precision not null,
  geom geography(point, 4326)
    generated always as (
      geography(st_setsrid(st_makepoint(longitude, latitude), 4326))
    ) stored,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean not null default false,
  accessibility_features jsonb not null default '{}'::jsonb,
  hours_json jsonb,
  show_on_free_map boolean not null default true,
  hours_source text not null default 'manual',
  google_place_id text,
  access_type text not null default 'public',
  location_archetype text not null default 'general',
  archetype_metadata jsonb not null default '{}'::jsonb,
  source_dataset text,
  source_url text,
  source_license_key text,
  source_attribution_text text,
  source_updated_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  raw_payload_hash text,
  import_run_id uuid references public.bathroom_source_import_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, external_source_id)
);

create index if not exists idx_bathroom_source_records_status
  on public.bathroom_source_records (status, is_public_candidate, updated_at desc);

create index if not exists idx_bathroom_source_records_canonical
  on public.bathroom_source_records (canonical_bathroom_id, status);

create index if not exists idx_bathroom_source_records_import_run
  on public.bathroom_source_records (import_run_id, source_key);

create index if not exists idx_bathroom_source_records_geom
  on public.bathroom_source_records using gist (geom);

create table if not exists public.bathroom_canonical_field_sources (
  bathroom_id uuid not null references public.bathrooms(id) on delete cascade,
  field_name text not null,
  source_kind public.bathroom_field_source_kind_enum not null,
  source_record_id uuid references public.bathroom_source_records(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (bathroom_id, field_name)
);

create table if not exists public.bathroom_source_record_verifications (
  id uuid primary key default gen_random_uuid(),
  source_record_id uuid not null references public.bathroom_source_records(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_exists boolean not null,
  note text,
  trust_weight numeric(5, 2) not null default 1.00
    check (trust_weight >= 0.25 and trust_weight <= 4.00),
  effective_weight numeric(5, 2) not null default 1.00
    check (effective_weight >= 0 and effective_weight <= 4.00),
  shadow_banned_at_time boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bathroom_source_record_verifications_note_length_check'
  ) then
    alter table public.bathroom_source_record_verifications
      add constraint bathroom_source_record_verifications_note_length_check
      check (note is null or char_length(note) <= 280);
  end if;
end
$$;

create index if not exists idx_source_record_verifications_source_record
  on public.bathroom_source_record_verifications (source_record_id, created_at desc);

create index if not exists idx_source_record_verifications_user
  on public.bathroom_source_record_verifications (user_id, source_record_id, created_at desc);

create index if not exists idx_source_record_verifications_exists
  on public.bathroom_source_record_verifications (source_record_id, location_exists, created_at desc);

alter table public.bathroom_source_record_verifications enable row level security;

drop policy if exists "source_record_verifications_select_self_or_admin" on public.bathroom_source_record_verifications;
create policy "source_record_verifications_select_self_or_admin"
  on public.bathroom_source_record_verifications for select
  using (auth.uid() = user_id or public.is_admin_user(auth.uid()));

create or replace function public.get_bathroom_source_origin_label(
  p_source_key text
)
returns text
language sql
immutable
as $$
  select case
    when p_source_key = 'osm-overpass-us' then 'OpenStreetMap import'
    when p_source_key = 'seattle-parks' then 'Seattle Parks import'
    when p_source_key is null or btrim(p_source_key) = '' then 'Public dataset import'
    else initcap(replace(p_source_key, '-', ' '))
  end;
$$;

create or replace function public.get_bathroom_source_origin_attribution(
  p_source_key text,
  p_source_attribution_text text,
  p_source_dataset text
)
returns text
language sql
immutable
as $$
  select case
    when p_source_key = 'osm-overpass-us' then 'OpenStreetMap contributors'
    when p_source_attribution_text is not null and btrim(p_source_attribution_text) <> '' then p_source_attribution_text
    when p_source_dataset is not null and btrim(p_source_dataset) <> '' then p_source_dataset
    else 'Public dataset'
  end;
$$;

create or replace function public.get_source_record_verification_summary(
  p_source_record_id uuid
)
returns table (
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_weighted_confirmation_score numeric(6, 2),
  source_weighted_denial_score numeric(6, 2),
  source_freshness_status public.source_record_freshness_status_enum,
  source_needs_review boolean,
  eligible_positive_user_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  with aggregates as (
    select
      max(verifications.created_at) as last_verified_at,
      max(verifications.created_at) filter (where verifications.location_exists) as last_confirmation_at,
      max(verifications.created_at) filter (where not verifications.location_exists) as last_denial_at,
      count(*) filter (where verifications.location_exists)::integer as confirmation_count,
      count(*) filter (where not verifications.location_exists)::integer as denial_count,
      count(distinct verifications.user_id)
        filter (where verifications.location_exists and verifications.effective_weight > 0)::integer
        as eligible_positive_user_count,
      coalesce(sum(verifications.effective_weight) filter (where verifications.location_exists), 0)::numeric(6, 2)
        as weighted_confirmation_score,
      coalesce(sum(verifications.effective_weight) filter (where not verifications.location_exists), 0)::numeric(6, 2)
        as weighted_denial_score
    from public.bathroom_source_record_verifications verifications
    where verifications.source_record_id = p_source_record_id
  ),
  summarized as (
    select
      aggregates.last_verified_at as source_last_verified_at,
      coalesce(aggregates.confirmation_count, 0) as source_confirmation_count,
      coalesce(aggregates.denial_count, 0) as source_denial_count,
      round(coalesce(aggregates.weighted_confirmation_score, 0), 2)::numeric(6, 2)
        as source_weighted_confirmation_score,
      round(coalesce(aggregates.weighted_denial_score, 0), 2)::numeric(6, 2)
        as source_weighted_denial_score,
      case
        when coalesce(aggregates.confirmation_count, 0) = 0
          and coalesce(aggregates.denial_count, 0) = 0
          then 'unreviewed'::public.source_record_freshness_status_enum
        when coalesce(aggregates.weighted_denial_score, 0) >= 3
          and coalesce(aggregates.denial_count, 0) >= 2
          and aggregates.last_denial_at >= now() - interval '45 days'
          and coalesce(aggregates.weighted_denial_score, 0)
            >= coalesce(aggregates.weighted_confirmation_score, 0) + 0.5
          then 'likely_removed'::public.source_record_freshness_status_enum
        when coalesce(aggregates.weighted_confirmation_score, 0) > 0
          and coalesce(aggregates.weighted_denial_score, 0) > 0
          and (
            abs(
              coalesce(aggregates.weighted_confirmation_score, 0)
              - coalesce(aggregates.weighted_denial_score, 0)
            ) <= 1.25
            or coalesce(aggregates.denial_count, 0) >= 2
          )
          then 'disputed'::public.source_record_freshness_status_enum
        when aggregates.last_verified_at >= now() - interval '45 days'
          and coalesce(aggregates.weighted_confirmation_score, 0)
            >= greatest(coalesce(aggregates.weighted_denial_score, 0), 1.0)
          then 'fresh'::public.source_record_freshness_status_enum
        else 'aging'::public.source_record_freshness_status_enum
      end as source_freshness_status,
      coalesce(aggregates.eligible_positive_user_count, 0) as eligible_positive_user_count
    from aggregates
  )
  select
    summarized.source_last_verified_at,
    summarized.source_confirmation_count,
    summarized.source_denial_count,
    summarized.source_weighted_confirmation_score,
    summarized.source_weighted_denial_score,
    summarized.source_freshness_status,
    summarized.source_freshness_status <> 'fresh'::public.source_record_freshness_status_enum
      as source_needs_review,
    summarized.eligible_positive_user_count
  from summarized;
$$;

revoke all on function public.get_source_record_verification_summary(uuid) from public;
grant execute on function public.get_source_record_verification_summary(uuid) to anon, authenticated, service_role;

create or replace function public.get_canonical_bathroom_source_summary(
  p_bathroom_id uuid
)
returns table (
  origin_source_key text,
  origin_label text,
  origin_attribution_short text,
  source_dataset text,
  source_license_key text,
  source_url text,
  source_updated_at timestamptz,
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_weighted_confirmation_score numeric(6, 2),
  source_weighted_denial_score numeric(6, 2),
  source_freshness_status public.source_record_freshness_status_enum,
  source_needs_review boolean,
  hide_from_default_results boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with linked_records as (
    select
      source_records.*
    from public.bathroom_source_records source_records
    where source_records.canonical_bathroom_id = p_bathroom_id
      and source_records.status in ('linked', 'promoted', 'likely_removed')
  ),
  prioritized_source as (
    select
      linked_records.source_key,
      linked_records.source_dataset,
      linked_records.source_license_key,
      linked_records.source_url,
      linked_records.source_updated_at,
      linked_records.source_attribution_text
    from linked_records
    order by
      case linked_records.status
        when 'promoted' then 0
        when 'linked' then 1
        when 'likely_removed' then 2
        else 3
      end,
      linked_records.updated_at desc
    limit 1
  ),
  verification_aggregates as (
    select
      max(verifications.created_at) as last_verified_at,
      max(verifications.created_at) filter (where verifications.location_exists) as last_confirmation_at,
      max(verifications.created_at) filter (where not verifications.location_exists) as last_denial_at,
      count(*) filter (where verifications.location_exists)::integer as confirmation_count,
      count(*) filter (where not verifications.location_exists)::integer as denial_count,
      coalesce(sum(verifications.effective_weight) filter (where verifications.location_exists), 0)::numeric(6, 2)
        as weighted_confirmation_score,
      coalesce(sum(verifications.effective_weight) filter (where not verifications.location_exists), 0)::numeric(6, 2)
        as weighted_denial_score
    from linked_records
    left join public.bathroom_source_record_verifications verifications
      on verifications.source_record_id = linked_records.id
  ),
  summarized as (
    select
      prioritized_source.source_key as origin_source_key,
      public.get_bathroom_source_origin_label(prioritized_source.source_key) as origin_label,
      public.get_bathroom_source_origin_attribution(
        prioritized_source.source_key,
        prioritized_source.source_attribution_text,
        prioritized_source.source_dataset
      ) as origin_attribution_short,
      prioritized_source.source_dataset,
      prioritized_source.source_license_key,
      prioritized_source.source_url,
      prioritized_source.source_updated_at,
      verification_aggregates.last_verified_at as source_last_verified_at,
      coalesce(verification_aggregates.confirmation_count, 0) as source_confirmation_count,
      coalesce(verification_aggregates.denial_count, 0) as source_denial_count,
      round(coalesce(verification_aggregates.weighted_confirmation_score, 0), 2)::numeric(6, 2)
        as source_weighted_confirmation_score,
      round(coalesce(verification_aggregates.weighted_denial_score, 0), 2)::numeric(6, 2)
        as source_weighted_denial_score,
      case
        when prioritized_source.source_key is null
          then 'unreviewed'::public.source_record_freshness_status_enum
        when coalesce(verification_aggregates.confirmation_count, 0) = 0
          and coalesce(verification_aggregates.denial_count, 0) = 0
          then 'unreviewed'::public.source_record_freshness_status_enum
        when coalesce(verification_aggregates.weighted_denial_score, 0) >= 3
          and coalesce(verification_aggregates.denial_count, 0) >= 2
          and verification_aggregates.last_denial_at >= now() - interval '45 days'
          and coalesce(verification_aggregates.weighted_denial_score, 0)
            >= coalesce(verification_aggregates.weighted_confirmation_score, 0) + 0.5
          then 'likely_removed'::public.source_record_freshness_status_enum
        when coalesce(verification_aggregates.weighted_confirmation_score, 0) > 0
          and coalesce(verification_aggregates.weighted_denial_score, 0) > 0
          and (
            abs(
              coalesce(verification_aggregates.weighted_confirmation_score, 0)
              - coalesce(verification_aggregates.weighted_denial_score, 0)
            ) <= 1.25
            or coalesce(verification_aggregates.denial_count, 0) >= 2
          )
          then 'disputed'::public.source_record_freshness_status_enum
        when verification_aggregates.last_verified_at >= now() - interval '45 days'
          and coalesce(verification_aggregates.weighted_confirmation_score, 0)
            >= greatest(coalesce(verification_aggregates.weighted_denial_score, 0), 1.0)
          then 'fresh'::public.source_record_freshness_status_enum
        else 'aging'::public.source_record_freshness_status_enum
      end as source_freshness_status
    from prioritized_source
    full join verification_aggregates on true
  )
  select
    summarized.origin_source_key,
    summarized.origin_label,
    summarized.origin_attribution_short,
    summarized.source_dataset,
    summarized.source_license_key,
    summarized.source_url,
    summarized.source_updated_at,
    summarized.source_last_verified_at,
    summarized.source_confirmation_count,
    summarized.source_denial_count,
    summarized.source_weighted_confirmation_score,
    summarized.source_weighted_denial_score,
    summarized.source_freshness_status,
    summarized.source_freshness_status <> 'fresh'::public.source_record_freshness_status_enum
      as source_needs_review,
    (
      summarized.source_freshness_status = 'likely_removed'::public.source_record_freshness_status_enum
      and (
        summarized.source_last_verified_at is null
        or summarized.source_last_verified_at < now() - interval '45 days'
      )
      and coalesce(summarized.source_confirmation_count, 0) = 0
    ) as hide_from_default_results
  from summarized;
$$;

revoke all on function public.get_canonical_bathroom_source_summary(uuid) from public;
grant execute on function public.get_canonical_bathroom_source_summary(uuid) to anon, authenticated, service_role;

create or replace function public.find_canonical_match_for_source_record(
  p_source_record_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_source_record public.bathroom_source_records%rowtype;
  v_match_id uuid;
begin
  select *
  into v_source_record
  from public.bathroom_source_records source_records
  where source_records.id = p_source_record_id;

  if v_source_record.id is null then
    return null;
  end if;

  select bathrooms.id
  into v_match_id
  from public.bathrooms bathrooms
  where bathrooms.moderation_status <> 'deleted'
    and lower(coalesce(bathrooms.archetype_metadata ->> 'import_source', '')) = lower(v_source_record.source_key)
    and lower(coalesce(bathrooms.archetype_metadata ->> 'external_source_id', '')) = lower(v_source_record.external_source_id)
  limit 1;

  if v_match_id is not null then
    return v_match_id;
  end if;

  select bathrooms.id
  into v_match_id
  from public.bathrooms bathrooms
  where bathrooms.moderation_status <> 'deleted'
    and lower(bathrooms.place_name) = lower(v_source_record.place_name)
    and st_distance(
      bathrooms.geom,
      geography(st_setsrid(st_makepoint(v_source_record.longitude, v_source_record.latitude), 4326))
    ) <= 25
  order by st_distance(
    bathrooms.geom,
    geography(st_setsrid(st_makepoint(v_source_record.longitude, v_source_record.latitude), 4326))
  ) asc
  limit 1;

  if v_match_id is not null then
    return v_match_id;
  end if;

  select bathrooms.id
  into v_match_id
  from public.bathrooms bathrooms
  where bathrooms.moderation_status <> 'deleted'
    and v_source_record.address_line1 is not null
    and lower(coalesce(bathrooms.address_line1, '')) = lower(v_source_record.address_line1)
    and lower(coalesce(bathrooms.city, '')) = lower(coalesce(v_source_record.city, bathrooms.city))
    and lower(coalesce(bathrooms.state, '')) = lower(coalesce(v_source_record.state, bathrooms.state))
    and st_distance(
      bathrooms.geom,
      geography(st_setsrid(st_makepoint(v_source_record.longitude, v_source_record.latitude), 4326))
    ) <= 40
  order by st_distance(
    bathrooms.geom,
    geography(st_setsrid(st_makepoint(v_source_record.longitude, v_source_record.latitude), 4326))
  ) asc
  limit 1;

  return v_match_id;
end;
$$;

revoke all on function public.find_canonical_match_for_source_record(uuid) from public;
grant execute on function public.find_canonical_match_for_source_record(uuid) to anon, authenticated, service_role;

create or replace function public.reconcile_single_bathroom_source_record(
  p_source_record_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_record public.bathroom_source_records%rowtype;
  v_match_bathroom_id uuid;
  v_action text := 'candidate';
begin
  select *
  into v_source_record
  from public.bathroom_source_records source_records
  where source_records.id = p_source_record_id;

  if v_source_record.id is null then
    raise exception 'SOURCE_RECORD_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_source_record.canonical_bathroom_id is not null then
    update public.bathroom_source_records
    set
      is_public_candidate = false,
      status = case
        when status = 'candidate' then 'linked'::public.bathroom_source_record_status_enum
        else status
      end,
      updated_at = now()
    where id = v_source_record.id;

    return jsonb_build_object(
      'source_record_id', v_source_record.id,
      'canonical_bathroom_id', v_source_record.canonical_bathroom_id,
      'action', 'already_linked',
      'status', coalesce(v_source_record.status, 'linked')
    );
  end if;

  v_match_bathroom_id := public.find_canonical_match_for_source_record(p_source_record_id);

  if v_match_bathroom_id is not null then
    update public.bathroom_source_records
    set
      canonical_bathroom_id = v_match_bathroom_id,
      status = 'linked',
      is_public_candidate = false,
      updated_at = now()
    where id = p_source_record_id;

    v_action := 'linked_existing';
  end if;

  return jsonb_build_object(
    'source_record_id', p_source_record_id,
    'canonical_bathroom_id', v_match_bathroom_id,
    'action', v_action,
    'status', case when v_match_bathroom_id is not null then 'linked' else 'candidate' end
  );
end;
$$;

revoke all on function public.reconcile_single_bathroom_source_record(uuid) from public;
grant execute on function public.reconcile_single_bathroom_source_record(uuid) to service_role;

create or replace function public.reconcile_bathroom_source_records(
  p_source_key text,
  p_external_source_ids text[] default null
)
returns table (
  source_record_id uuid,
  canonical_bathroom_id uuid,
  action text,
  status public.bathroom_source_record_status_enum
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source_record public.bathroom_source_records%rowtype;
  v_result jsonb;
begin
  for v_source_record in
    select *
    from public.bathroom_source_records source_records
    where source_records.source_key = p_source_key
      and (
        p_external_source_ids is null
        or source_records.external_source_id = any (p_external_source_ids)
      )
    order by source_records.updated_at desc
  loop
    v_result := public.reconcile_single_bathroom_source_record(v_source_record.id);

    source_record_id := (v_result ->> 'source_record_id')::uuid;
    canonical_bathroom_id := (v_result ->> 'canonical_bathroom_id')::uuid;
    action := coalesce(v_result ->> 'action', 'candidate');
    status := coalesce((v_result ->> 'status')::public.bathroom_source_record_status_enum, 'candidate');

    return next;
  end loop;
end;
$$;

revoke all on function public.reconcile_bathroom_source_records(text, text[]) from public;
grant execute on function public.reconcile_bathroom_source_records(text, text[]) to service_role;

create or replace function public.verify_bathroom_source_record(
  p_source_record_id uuid,
  p_location_exists boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_source_record public.bathroom_source_records%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
  v_last_verification_at timestamptz;
  v_next_allowed_at timestamptz;
  v_trust_weight numeric(5, 2) := 1.00;
  v_effective_weight numeric(5, 2) := 1.00;
  v_shadow_banned boolean := false;
  v_verification_id uuid;
  v_created_at timestamptz;
  v_summary record;
  v_promoted_bathroom_id uuid;
  v_promoted boolean := false;
begin
  v_user_id := public.assert_active_user();

  select *
  into v_source_record
  from public.bathroom_source_records source_records
  where source_records.id = p_source_record_id
    and source_records.status in ('candidate', 'linked', 'promoted', 'likely_removed');

  if v_source_record.id is null then
    raise exception 'SOURCE_RECORD_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_note is not null and char_length(v_note) > 280 then
    raise exception 'INVALID_LOCATION_VERIFICATION_NOTE' using errcode = 'P0001';
  end if;

  select verifications.created_at
  into v_last_verification_at
  from public.bathroom_source_record_verifications verifications
  where verifications.source_record_id = p_source_record_id
    and verifications.user_id = v_user_id
  order by verifications.created_at desc
  limit 1;

  if v_last_verification_at is not null then
    v_next_allowed_at := v_last_verification_at + interval '12 hours';

    if v_next_allowed_at > now() then
      select *
      into v_summary
      from public.get_source_record_verification_summary(p_source_record_id);

      return jsonb_build_object(
        'success', false,
        'error', 'cooldown_active',
        'source_record_id', p_source_record_id,
        'canonical_bathroom_id', v_source_record.canonical_bathroom_id,
        'location_exists', p_location_exists,
        'listing_promoted', false,
        'next_allowed_at', timezone('utc', v_next_allowed_at),
        'source_last_verified_at', timezone('utc', v_summary.source_last_verified_at),
        'source_confirmation_count', v_summary.source_confirmation_count,
        'source_denial_count', v_summary.source_denial_count,
        'source_weighted_confirmation_score', v_summary.source_weighted_confirmation_score,
        'source_weighted_denial_score', v_summary.source_weighted_denial_score,
        'source_freshness_status', v_summary.source_freshness_status,
        'source_needs_review', v_summary.source_needs_review,
        'eligible_positive_user_count', v_summary.eligible_positive_user_count
      );
    end if;
  end if;

  select
    reputation.trust_weight,
    coalesce(reputation.shadow_banned, false)
  into
    v_trust_weight,
    v_shadow_banned
  from public.contributor_reputation_profiles reputation
  where reputation.user_id = v_user_id;

  if not found then
    v_trust_weight := 1.00;
    v_shadow_banned := false;
  end if;

  v_effective_weight := case
    when v_shadow_banned then 0
    else coalesce(v_trust_weight, 1.00)
  end;

  insert into public.bathroom_source_record_verifications (
    source_record_id,
    user_id,
    location_exists,
    note,
    trust_weight,
    effective_weight,
    shadow_banned_at_time
  )
  values (
    p_source_record_id,
    v_user_id,
    p_location_exists,
    v_note,
    coalesce(v_trust_weight, 1.00),
    v_effective_weight,
    v_shadow_banned
  )
  returning id, created_at
  into v_verification_id, v_created_at;

  v_next_allowed_at := v_created_at + interval '12 hours';

  select *
  into v_summary
  from public.get_source_record_verification_summary(p_source_record_id);

  if p_location_exists and coalesce(v_summary.eligible_positive_user_count, 0) >= 2 then
    perform public.reconcile_single_bathroom_source_record(p_source_record_id);

    select *
    into v_source_record
    from public.bathroom_source_records source_records
    where source_records.id = p_source_record_id;

    if v_source_record.canonical_bathroom_id is null then
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
        accessibility_features,
        hours_json,
        source_type,
        moderation_status,
        show_on_free_map,
        hours_source,
        google_place_id,
        access_type,
        location_archetype,
        archetype_metadata
      )
      values (
        v_source_record.place_name,
        v_source_record.address_line1,
        v_source_record.city,
        v_source_record.state,
        v_source_record.postal_code,
        v_source_record.country_code,
        v_source_record.latitude,
        v_source_record.longitude,
        v_source_record.is_locked,
        v_source_record.is_accessible,
        v_source_record.is_customer_only,
        v_source_record.accessibility_features,
        v_source_record.hours_json,
        'imported',
        'active',
        v_source_record.show_on_free_map,
        coalesce(v_source_record.hours_source, 'manual'),
        v_source_record.google_place_id,
        coalesce(v_source_record.access_type, 'public'),
        coalesce(v_source_record.location_archetype, 'general'),
        coalesce(v_source_record.archetype_metadata, '{}'::jsonb)
          || jsonb_build_object(
            'import_source', v_source_record.source_key,
            'external_source_id', v_source_record.external_source_id
          )
      )
      returning id into v_promoted_bathroom_id;

      update public.bathroom_source_records
      set
        canonical_bathroom_id = v_promoted_bathroom_id,
        status = 'promoted',
        is_public_candidate = false,
        updated_at = now()
      where id = p_source_record_id;

      insert into public.bathroom_canonical_field_sources (
        bathroom_id,
        field_name,
        source_kind,
        source_record_id
      )
      select
        v_promoted_bathroom_id,
        tracked_fields.field_name,
        'import'::public.bathroom_field_source_kind_enum,
        p_source_record_id
      from (
        values
          ('place_name'),
          ('address_line1'),
          ('city'),
          ('state'),
          ('postal_code'),
          ('country_code'),
          ('latitude'),
          ('longitude'),
          ('is_locked'),
          ('is_accessible'),
          ('is_customer_only'),
          ('accessibility_features'),
          ('hours_json'),
          ('show_on_free_map'),
          ('hours_source'),
          ('google_place_id'),
          ('access_type'),
          ('location_archetype'),
          ('archetype_metadata')
      ) as tracked_fields(field_name)
      on conflict (bathroom_id, field_name) do update
        set
          source_kind = excluded.source_kind,
          source_record_id = excluded.source_record_id,
          updated_at = now();

      v_promoted := true;
    else
      update public.bathroom_source_records
      set
        status = 'linked',
        is_public_candidate = false,
        updated_at = now()
      where id = p_source_record_id
        and status = 'candidate';

      v_promoted := true;
    end if;
  elsif v_summary.source_freshness_status = 'likely_removed'::public.source_record_freshness_status_enum then
    update public.bathroom_source_records
    set
      status = 'likely_removed',
      is_public_candidate = false,
      updated_at = now()
    where id = p_source_record_id;
  elsif p_location_exists and v_source_record.status = 'likely_removed' then
    update public.bathroom_source_records
    set
      status = case
        when canonical_bathroom_id is null then 'candidate'::public.bathroom_source_record_status_enum
        else 'linked'::public.bathroom_source_record_status_enum
      end,
      is_public_candidate = (canonical_bathroom_id is null),
      updated_at = now()
    where id = p_source_record_id;
  end if;

  select *
  into v_summary
  from public.get_source_record_verification_summary(p_source_record_id);

  select *
  into v_source_record
  from public.bathroom_source_records source_records
  where source_records.id = p_source_record_id;

  return jsonb_build_object(
    'success', true,
    'error', null,
    'verification_id', v_verification_id,
    'created_at', timezone('utc', v_created_at),
    'source_record_id', p_source_record_id,
    'canonical_bathroom_id', v_source_record.canonical_bathroom_id,
    'location_exists', p_location_exists,
    'listing_promoted', v_promoted,
    'next_allowed_at', timezone('utc', v_next_allowed_at),
    'source_last_verified_at', timezone('utc', v_summary.source_last_verified_at),
    'source_confirmation_count', v_summary.source_confirmation_count,
    'source_denial_count', v_summary.source_denial_count,
    'source_weighted_confirmation_score', v_summary.source_weighted_confirmation_score,
    'source_weighted_denial_score', v_summary.source_weighted_denial_score,
    'source_freshness_status', v_summary.source_freshness_status,
    'source_needs_review', v_summary.source_needs_review,
    'eligible_positive_user_count', v_summary.eligible_positive_user_count
  );
end;
$$;

revoke all on function public.verify_bathroom_source_record(uuid, boolean, text) from public;
grant execute on function public.verify_bathroom_source_record(uuid, boolean, text) to authenticated, service_role;

create or replace function public.get_canonical_bathroom_detail(
  p_bathroom_id uuid
)
returns table (
  id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean,
  accessibility_features jsonb,
  accessibility_score integer,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  verification_badge_type text,
  stallpass_access_tier text,
  show_on_free_map boolean,
  is_business_location_verified boolean,
  location_verified_at timestamptz,
  active_offer_count integer,
  location_archetype text,
  archetype_metadata jsonb,
  code_policy text,
  allow_user_code_submissions boolean,
  has_official_code boolean,
  owner_code_last_verified_at timestamptz,
  official_access_instructions text,
  origin_source_key text,
  origin_label text,
  origin_attribution_short text,
  source_dataset text,
  source_license_key text,
  source_url text,
  source_updated_at timestamptz,
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_weighted_confirmation_score numeric(6, 2),
  source_weighted_denial_score numeric(6, 2),
  source_freshness_status public.source_record_freshness_status_enum,
  source_needs_review boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    detail.id,
    detail.place_name,
    detail.address_line1,
    detail.city,
    detail.state,
    detail.postal_code,
    detail.country_code,
    detail.latitude,
    detail.longitude,
    detail.is_locked,
    detail.is_accessible,
    detail.is_customer_only,
    detail.accessibility_features,
    detail.accessibility_score,
    detail.hours_json,
    detail.code_id,
    detail.confidence_score,
    detail.up_votes,
    detail.down_votes,
    detail.last_verified_at,
    detail.expires_at,
    detail.cleanliness_avg,
    detail.updated_at,
    detail.verification_badge_type,
    detail.stallpass_access_tier,
    detail.show_on_free_map,
    detail.is_business_location_verified,
    detail.location_verified_at,
    detail.active_offer_count,
    detail.location_archetype,
    detail.archetype_metadata,
    detail.code_policy,
    detail.allow_user_code_submissions,
    detail.has_official_code,
    detail.owner_code_last_verified_at,
    detail.official_access_instructions,
    source_summary.origin_source_key,
    source_summary.origin_label,
    source_summary.origin_attribution_short,
    source_summary.source_dataset,
    source_summary.source_license_key,
    source_summary.source_url,
    source_summary.source_updated_at,
    source_summary.source_last_verified_at,
    coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
    coalesce(source_summary.source_denial_count, 0) as source_denial_count,
    coalesce(source_summary.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
    coalesce(source_summary.source_weighted_denial_score, 0) as source_weighted_denial_score,
    source_summary.source_freshness_status,
    coalesce(source_summary.source_needs_review, false) as source_needs_review
  from public.v_bathroom_detail_public detail
  left join lateral public.get_canonical_bathroom_source_summary(detail.id) source_summary
    on true
  where detail.id = p_bathroom_id;
$$;

revoke all on function public.get_canonical_bathroom_detail(uuid) from public;
grant execute on function public.get_canonical_bathroom_detail(uuid) to anon, authenticated, service_role;

create or replace function public.get_source_candidate_detail(
  p_source_record_id uuid
)
returns table (
  source_record_id uuid,
  canonical_bathroom_id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean,
  accessibility_features jsonb,
  accessibility_score integer,
  hours_json jsonb,
  updated_at timestamptz,
  show_on_free_map boolean,
  location_archetype text,
  archetype_metadata jsonb,
  origin_source_key text,
  origin_label text,
  origin_attribution_short text,
  source_dataset text,
  source_license_key text,
  source_url text,
  source_updated_at timestamptz,
  source_status public.bathroom_source_record_status_enum,
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_weighted_confirmation_score numeric(6, 2),
  source_weighted_denial_score numeric(6, 2),
  source_freshness_status public.source_record_freshness_status_enum,
  source_needs_review boolean,
  can_favorite boolean,
  can_submit_code boolean,
  can_report_live_status boolean,
  can_claim_business boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    source_records.id as source_record_id,
    source_records.canonical_bathroom_id,
    source_records.place_name,
    source_records.address_line1,
    source_records.city,
    source_records.state,
    source_records.postal_code,
    source_records.country_code,
    source_records.latitude,
    source_records.longitude,
    source_records.is_locked,
    source_records.is_accessible,
    source_records.is_customer_only,
    source_records.accessibility_features,
    public.calculate_accessibility_score(
      source_records.is_accessible,
      source_records.accessibility_features
    ) as accessibility_score,
    source_records.hours_json,
    source_records.updated_at,
    source_records.show_on_free_map,
    source_records.location_archetype,
    source_records.archetype_metadata,
    source_records.source_key as origin_source_key,
    public.get_bathroom_source_origin_label(source_records.source_key) as origin_label,
    public.get_bathroom_source_origin_attribution(
      source_records.source_key,
      source_records.source_attribution_text,
      source_records.source_dataset
    ) as origin_attribution_short,
    source_records.source_dataset,
    source_records.source_license_key,
    source_records.source_url,
    source_records.source_updated_at,
    source_records.status as source_status,
    source_summary.source_last_verified_at,
    coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
    coalesce(source_summary.source_denial_count, 0) as source_denial_count,
    coalesce(source_summary.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
    coalesce(source_summary.source_weighted_denial_score, 0) as source_weighted_denial_score,
    source_summary.source_freshness_status,
    coalesce(source_summary.source_needs_review, false) as source_needs_review,
    false as can_favorite,
    false as can_submit_code,
    false as can_report_live_status,
    false as can_claim_business
  from public.bathroom_source_records source_records
  left join lateral public.get_source_record_verification_summary(source_records.id) source_summary
    on true
  where source_records.id = p_source_record_id
    and source_records.is_public_candidate = true
    and source_records.status = 'candidate';
$$;

revoke all on function public.get_source_candidate_detail(uuid) from public;
grant execute on function public.get_source_candidate_detail(uuid) to anon, authenticated, service_role;

create or replace function public.get_bathroom_source_candidate_admin_queue(
  p_limit integer default 100
)
returns table (
  source_record_id uuid,
  source_key text,
  external_source_id text,
  place_name text,
  city text,
  state text,
  source_status public.bathroom_source_record_status_enum,
  source_confirmation_count integer,
  source_denial_count integer,
  source_freshness_status public.source_record_freshness_status_enum,
  canonical_match_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    source_records.id as source_record_id,
    source_records.source_key,
    source_records.external_source_id,
    source_records.place_name,
    source_records.city,
    source_records.state,
    source_records.status as source_status,
    coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
    coalesce(source_summary.source_denial_count, 0) as source_denial_count,
    source_summary.source_freshness_status,
    public.find_canonical_match_for_source_record(source_records.id) as canonical_match_id
  from public.bathroom_source_records source_records
  left join lateral public.get_source_record_verification_summary(source_records.id) source_summary
    on true
  where source_records.status = 'candidate'
  order by source_records.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.get_bathroom_source_candidate_admin_queue(integer) from public;
grant execute on function public.get_bathroom_source_candidate_admin_queue(integer) to service_role;

create or replace function public.get_bathroom_source_conflicts(
  p_limit integer default 100
)
returns table (
  source_record_id uuid,
  source_key text,
  external_source_id text,
  place_name text,
  canonical_match_id uuid,
  canonical_place_name text,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with candidates as (
    select
      source_records.id as source_record_id,
      source_records.source_key,
      source_records.external_source_id,
      source_records.place_name,
      public.find_canonical_match_for_source_record(source_records.id) as canonical_match_id,
      source_records.geom
    from public.bathroom_source_records source_records
    where source_records.status = 'candidate'
  )
  select
    candidates.source_record_id,
    candidates.source_key,
    candidates.external_source_id,
    candidates.place_name,
    candidates.canonical_match_id,
    bathrooms.place_name as canonical_place_name,
    st_distance(candidates.geom, bathrooms.geom) as distance_meters
  from candidates
  join public.bathrooms bathrooms
    on bathrooms.id = candidates.canonical_match_id
  order by distance_meters asc, candidates.place_name asc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.get_bathroom_source_conflicts(integer) from public;
grant execute on function public.get_bathroom_source_conflicts(integer) to service_role;

create or replace function public.get_stale_imported_canonical_bathrooms(
  p_limit integer default 100
)
returns table (
  bathroom_id uuid,
  place_name text,
  city text,
  state text,
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_freshness_status public.source_record_freshness_status_enum,
  origin_source_key text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    bathrooms.id as bathroom_id,
    bathrooms.place_name,
    bathrooms.city,
    bathrooms.state,
    source_summary.source_last_verified_at,
    source_summary.source_confirmation_count,
    source_summary.source_denial_count,
    source_summary.source_freshness_status,
    source_summary.origin_source_key
  from public.bathrooms bathrooms
  join lateral public.get_canonical_bathroom_source_summary(bathrooms.id) source_summary
    on true
  where bathrooms.source_type = 'imported'
    and source_summary.hide_from_default_results = true
  order by source_summary.source_last_verified_at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

revoke all on function public.get_stale_imported_canonical_bathrooms(integer) from public;
grant execute on function public.get_stale_imported_canonical_bathrooms(integer) to service_role;

create or replace function public.get_directory_listings_near(
  lat double precision,
  lng double precision,
  radius_m integer default 1000
)
returns table (
  listing_kind text,
  bathroom_id uuid,
  source_record_id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean,
  accessibility_features jsonb,
  accessibility_score integer,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  verification_badge_type text,
  stallpass_access_tier text,
  show_on_free_map boolean,
  is_business_location_verified boolean,
  location_verified_at timestamptz,
  active_offer_count integer,
  location_archetype text,
  archetype_metadata jsonb,
  code_policy text,
  allow_user_code_submissions boolean,
  has_official_code boolean,
  owner_code_last_verified_at timestamptz,
  official_access_instructions text,
  origin_source_key text,
  origin_label text,
  origin_attribution_short text,
  source_dataset text,
  source_license_key text,
  source_url text,
  source_updated_at timestamptz,
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_weighted_confirmation_score numeric(6, 2),
  source_weighted_denial_score numeric(6, 2),
  source_freshness_status public.source_record_freshness_status_enum,
  source_needs_review boolean,
  can_favorite boolean,
  can_submit_code boolean,
  can_report_live_status boolean,
  can_claim_business boolean,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with canonical_rows as (
    select
      'canonical'::text as listing_kind,
      details.id as bathroom_id,
      null::uuid as source_record_id,
      details.place_name,
      details.address_line1,
      details.city,
      details.state,
      details.postal_code,
      details.country_code,
      details.latitude,
      details.longitude,
      details.is_locked,
      details.is_accessible,
      details.is_customer_only,
      details.accessibility_features,
      details.accessibility_score,
      details.hours_json,
      details.code_id,
      details.confidence_score,
      details.up_votes,
      details.down_votes,
      details.last_verified_at,
      details.expires_at,
      details.cleanliness_avg,
      details.updated_at,
      details.verification_badge_type,
      details.stallpass_access_tier,
      details.show_on_free_map,
      details.is_business_location_verified,
      details.location_verified_at,
      details.active_offer_count,
      details.location_archetype,
      details.archetype_metadata,
      details.code_policy,
      details.allow_user_code_submissions,
      details.has_official_code,
      details.owner_code_last_verified_at,
      details.official_access_instructions,
      source_summary.origin_source_key,
      source_summary.origin_label,
      source_summary.origin_attribution_short,
      source_summary.source_dataset,
      source_summary.source_license_key,
      source_summary.source_url,
      source_summary.source_updated_at,
      source_summary.source_last_verified_at,
      coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
      coalesce(source_summary.source_denial_count, 0) as source_denial_count,
      coalesce(source_summary.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
      coalesce(source_summary.source_weighted_denial_score, 0) as source_weighted_denial_score,
      source_summary.source_freshness_status,
      coalesce(source_summary.source_needs_review, false) as source_needs_review,
      true as can_favorite,
      true as can_submit_code,
      true as can_report_live_status,
      true as can_claim_business,
      details.distance_meters
    from public.get_bathrooms_near(lat, lng, radius_m) details
    left join lateral public.get_canonical_bathroom_source_summary(details.id) source_summary
      on true
    where coalesce(source_summary.hide_from_default_results, false) = false
  ),
  source_candidates as (
    select
      'source_candidate'::text as listing_kind,
      null::uuid as bathroom_id,
      source_records.id as source_record_id,
      source_records.place_name,
      source_records.address_line1,
      source_records.city,
      source_records.state,
      source_records.postal_code,
      source_records.country_code,
      source_records.latitude,
      source_records.longitude,
      source_records.is_locked,
      source_records.is_accessible,
      source_records.is_customer_only,
      source_records.accessibility_features,
      public.calculate_accessibility_score(
        source_records.is_accessible,
        source_records.accessibility_features
      ) as accessibility_score,
      source_records.hours_json,
      null::uuid as code_id,
      null::numeric as confidence_score,
      null::integer as up_votes,
      null::integer as down_votes,
      null::timestamptz as last_verified_at,
      null::timestamptz as expires_at,
      null::numeric as cleanliness_avg,
      source_records.updated_at,
      null::text as verification_badge_type,
      'public'::text as stallpass_access_tier,
      source_records.show_on_free_map,
      false as is_business_location_verified,
      null::timestamptz as location_verified_at,
      0::integer as active_offer_count,
      source_records.location_archetype,
      source_records.archetype_metadata,
      null::text as code_policy,
      false as allow_user_code_submissions,
      false as has_official_code,
      null::timestamptz as owner_code_last_verified_at,
      null::text as official_access_instructions,
      source_records.source_key as origin_source_key,
      public.get_bathroom_source_origin_label(source_records.source_key) as origin_label,
      public.get_bathroom_source_origin_attribution(
        source_records.source_key,
        source_records.source_attribution_text,
        source_records.source_dataset
      ) as origin_attribution_short,
      source_records.source_dataset,
      source_records.source_license_key,
      source_records.source_url,
      source_records.source_updated_at,
      source_summary.source_last_verified_at,
      coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
      coalesce(source_summary.source_denial_count, 0) as source_denial_count,
      coalesce(source_summary.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
      coalesce(source_summary.source_weighted_denial_score, 0) as source_weighted_denial_score,
      source_summary.source_freshness_status,
      coalesce(source_summary.source_needs_review, false) as source_needs_review,
      false as can_favorite,
      false as can_submit_code,
      false as can_report_live_status,
      false as can_claim_business,
      st_distance(
        source_records.geom,
        geography(st_setsrid(st_makepoint(lng, lat), 4326))
      ) as distance_meters
    from public.bathroom_source_records source_records
    left join lateral public.get_source_record_verification_summary(source_records.id) source_summary
      on true
    where source_records.status = 'candidate'
      and source_records.is_public_candidate = true
      and (
        source_summary.source_freshness_status is null
        or source_summary.source_freshness_status <> 'likely_removed'::public.source_record_freshness_status_enum
      )
      and st_dwithin(
        source_records.geom,
        geography(st_setsrid(st_makepoint(lng, lat), 4326)),
        radius_m
      )
  )
  select *
  from (
    select * from canonical_rows
    union all
    select * from source_candidates
  ) listings
  order by
    listings.distance_meters
      + case when listings.listing_kind = 'source_candidate' then 180 else 0 end asc,
    listings.updated_at desc;
$$;

revoke all on function public.get_directory_listings_near(double precision, double precision, integer) from public;
grant execute on function public.get_directory_listings_near(double precision, double precision, integer) to anon, authenticated, service_role;

create or replace function public.search_directory_listings(
  p_query text default null,
  p_user_lat double precision default null,
  p_user_lng double precision default null,
  p_radius_meters double precision default 8047,
  p_is_accessible boolean default null,
  p_is_locked boolean default null,
  p_has_code boolean default null,
  p_is_customer_only boolean default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  listing_kind text,
  bathroom_id uuid,
  source_record_id uuid,
  place_name text,
  address_line1 text,
  city text,
  state text,
  postal_code text,
  country_code text,
  latitude double precision,
  longitude double precision,
  is_locked boolean,
  is_accessible boolean,
  is_customer_only boolean,
  accessibility_features jsonb,
  accessibility_score integer,
  hours_json jsonb,
  code_id uuid,
  confidence_score numeric,
  up_votes integer,
  down_votes integer,
  last_verified_at timestamptz,
  expires_at timestamptz,
  cleanliness_avg numeric,
  updated_at timestamptz,
  verification_badge_type text,
  stallpass_access_tier text,
  show_on_free_map boolean,
  is_business_location_verified boolean,
  location_verified_at timestamptz,
  active_offer_count integer,
  location_archetype text,
  archetype_metadata jsonb,
  code_policy text,
  allow_user_code_submissions boolean,
  has_official_code boolean,
  owner_code_last_verified_at timestamptz,
  official_access_instructions text,
  origin_source_key text,
  origin_label text,
  origin_attribution_short text,
  source_dataset text,
  source_license_key text,
  source_url text,
  source_updated_at timestamptz,
  source_last_verified_at timestamptz,
  source_confirmation_count integer,
  source_denial_count integer,
  source_weighted_confirmation_score numeric(6, 2),
  source_weighted_denial_score numeric(6, 2),
  source_freshness_status public.source_record_freshness_status_enum,
  source_needs_review boolean,
  can_favorite boolean,
  can_submit_code boolean,
  can_report_live_status boolean,
  can_claim_business boolean,
  distance_meters double precision,
  rank real
)
language sql
stable
security definer
set search_path = public
as $$
  with normalized_query as (
    select nullif(trim(coalesce(p_query, '')), '') as query_text
  ),
  canonical_rows as (
    select
      'canonical'::text as listing_kind,
      listings.id as bathroom_id,
      null::uuid as source_record_id,
      listings.place_name,
      listings.address_line1,
      listings.city,
      listings.state,
      listings.postal_code,
      listings.country_code,
      listings.latitude,
      listings.longitude,
      listings.is_locked,
      listings.is_accessible,
      listings.is_customer_only,
      listings.accessibility_features,
      listings.accessibility_score,
      listings.hours_json,
      listings.code_id,
      listings.confidence_score,
      listings.up_votes,
      listings.down_votes,
      listings.last_verified_at,
      listings.expires_at,
      listings.cleanliness_avg,
      listings.updated_at,
      listings.verification_badge_type,
      listings.stallpass_access_tier,
      listings.show_on_free_map,
      listings.is_business_location_verified,
      listings.location_verified_at,
      listings.active_offer_count,
      listings.location_archetype,
      listings.archetype_metadata,
      listings.code_policy,
      listings.allow_user_code_submissions,
      listings.has_official_code,
      listings.owner_code_last_verified_at,
      listings.official_access_instructions,
      source_summary.origin_source_key,
      source_summary.origin_label,
      source_summary.origin_attribution_short,
      source_summary.source_dataset,
      source_summary.source_license_key,
      source_summary.source_url,
      source_summary.source_updated_at,
      source_summary.source_last_verified_at,
      coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
      coalesce(source_summary.source_denial_count, 0) as source_denial_count,
      coalesce(source_summary.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
      coalesce(source_summary.source_weighted_denial_score, 0) as source_weighted_denial_score,
      source_summary.source_freshness_status,
      coalesce(source_summary.source_needs_review, false) as source_needs_review,
      true as can_favorite,
      true as can_submit_code,
      true as can_report_live_status,
      true as can_claim_business,
      listings.distance_meters,
      listings.rank
    from public.search_bathrooms(
      p_query,
      p_user_lat,
      p_user_lng,
      p_radius_meters,
      p_is_accessible,
      p_is_locked,
      p_has_code,
      p_is_customer_only,
      greatest(1, least(coalesce(p_limit, 25) * 2, 100)),
      0
    ) listings
    left join lateral public.get_canonical_bathroom_source_summary(listings.id) source_summary
      on true
    where coalesce(source_summary.hide_from_default_results, false) = false
  ),
  candidate_rows as (
    select
      'source_candidate'::text as listing_kind,
      null::uuid as bathroom_id,
      source_records.id as source_record_id,
      source_records.place_name,
      source_records.address_line1,
      source_records.city,
      source_records.state,
      source_records.postal_code,
      source_records.country_code,
      source_records.latitude,
      source_records.longitude,
      source_records.is_locked,
      source_records.is_accessible,
      source_records.is_customer_only,
      source_records.accessibility_features,
      public.calculate_accessibility_score(
        source_records.is_accessible,
        source_records.accessibility_features
      ) as accessibility_score,
      source_records.hours_json,
      null::uuid as code_id,
      null::numeric as confidence_score,
      null::integer as up_votes,
      null::integer as down_votes,
      null::timestamptz as last_verified_at,
      null::timestamptz as expires_at,
      null::numeric as cleanliness_avg,
      source_records.updated_at,
      null::text as verification_badge_type,
      'public'::text as stallpass_access_tier,
      source_records.show_on_free_map,
      false as is_business_location_verified,
      null::timestamptz as location_verified_at,
      0::integer as active_offer_count,
      source_records.location_archetype,
      source_records.archetype_metadata,
      null::text as code_policy,
      false as allow_user_code_submissions,
      false as has_official_code,
      null::timestamptz as owner_code_last_verified_at,
      null::text as official_access_instructions,
      source_records.source_key as origin_source_key,
      public.get_bathroom_source_origin_label(source_records.source_key) as origin_label,
      public.get_bathroom_source_origin_attribution(
        source_records.source_key,
        source_records.source_attribution_text,
        source_records.source_dataset
      ) as origin_attribution_short,
      source_records.source_dataset,
      source_records.source_license_key,
      source_records.source_url,
      source_records.source_updated_at,
      source_summary.source_last_verified_at,
      coalesce(source_summary.source_confirmation_count, 0) as source_confirmation_count,
      coalesce(source_summary.source_denial_count, 0) as source_denial_count,
      coalesce(source_summary.source_weighted_confirmation_score, 0) as source_weighted_confirmation_score,
      coalesce(source_summary.source_weighted_denial_score, 0) as source_weighted_denial_score,
      source_summary.source_freshness_status,
      coalesce(source_summary.source_needs_review, false) as source_needs_review,
      false as can_favorite,
      false as can_submit_code,
      false as can_report_live_status,
      false as can_claim_business,
      case
        when p_user_lat is not null and p_user_lng is not null then st_distance(
          source_records.geom,
          geography(st_setsrid(st_makepoint(p_user_lng, p_user_lat), 4326))
        )
        else null::double precision
      end as distance_meters,
      case
        when (select query_text from normalized_query) is null then 0.0::real
        when lower(source_records.place_name) = lower((select query_text from normalized_query)) then 1.45::real
        when source_records.place_name ilike ((select query_text from normalized_query) || '%') then 1.15::real
        when (
          source_records.place_name ilike ('%' || (select query_text from normalized_query) || '%')
          or coalesce(source_records.address_line1, '') ilike ('%' || (select query_text from normalized_query) || '%')
          or coalesce(source_records.city, '') ilike ('%' || (select query_text from normalized_query) || '%')
          or coalesce(source_records.state, '') ilike ('%' || (select query_text from normalized_query) || '%')
          or coalesce(source_records.postal_code, '') ilike ('%' || (select query_text from normalized_query) || '%')
        ) then 0.82::real
        else 0.0::real
      end as rank
    from public.bathroom_source_records source_records
    cross join normalized_query
    left join lateral public.get_source_record_verification_summary(source_records.id) source_summary
      on true
    where source_records.status = 'candidate'
      and source_records.is_public_candidate = true
      and (
        source_summary.source_freshness_status is null
        or source_summary.source_freshness_status <> 'likely_removed'::public.source_record_freshness_status_enum
      )
      and (
        normalized_query.query_text is not null
        or (p_user_lat is not null and p_user_lng is not null)
      )
      and (
        normalized_query.query_text is null
        or (
          source_records.place_name ilike ('%' || normalized_query.query_text || '%')
          or coalesce(source_records.address_line1, '') ilike ('%' || normalized_query.query_text || '%')
          or coalesce(source_records.city, '') ilike ('%' || normalized_query.query_text || '%')
          or coalesce(source_records.state, '') ilike ('%' || normalized_query.query_text || '%')
          or coalesce(source_records.postal_code, '') ilike ('%' || normalized_query.query_text || '%')
        )
      )
      and (
        p_user_lat is null
        or p_user_lng is null
        or st_dwithin(
          source_records.geom,
          geography(st_setsrid(st_makepoint(p_user_lng, p_user_lat), 4326)),
          greatest(coalesce(p_radius_meters, 8047), 250)
        )
      )
      and (p_is_accessible is null or source_records.is_accessible = p_is_accessible)
      and (p_is_locked is null or source_records.is_locked = p_is_locked)
      and (p_is_customer_only is null or source_records.is_customer_only = p_is_customer_only)
      and (p_has_code is null or p_has_code = false)
  )
  select *
  from (
    select * from canonical_rows
    union all
    select * from candidate_rows
  ) listings
  order by
    (
      case
        when listings.distance_meters is not null and listings.rank > 0 then
          listings.rank / ln(greatest(listings.distance_meters, 1.0) / 100.0 + 2.0)
        when listings.rank > 0 then listings.rank
        when listings.distance_meters is not null then
          1.0 / ln(greatest(listings.distance_meters, 1.0) / 100.0 + 2.0)
        else 0.0
      end
    ) - case when listings.listing_kind = 'source_candidate' then 0.18 else 0 end desc,
    listings.distance_meters asc nulls last,
    listings.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 25), 50))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_directory_listings(text, double precision, double precision, double precision, boolean, boolean, boolean, boolean, integer, integer) from public;
grant execute on function public.search_directory_listings(text, double precision, double precision, double precision, boolean, boolean, boolean, boolean, integer, integer) to anon, authenticated, service_role;

insert into public.bathroom_source_records (
  source_key,
  external_source_id,
  canonical_bathroom_id,
  status,
  is_public_candidate,
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
  accessibility_features,
  hours_json,
  show_on_free_map,
  hours_source,
  google_place_id,
  access_type,
  location_archetype,
  archetype_metadata,
  source_dataset,
  source_url,
  source_license_key,
  source_attribution_text,
  source_updated_at,
  raw_payload,
  raw_payload_hash
)
select
  coalesce(nullif(bathrooms.archetype_metadata ->> 'import_source', ''), 'legacy-imported') as source_key,
  coalesce(
    nullif(bathrooms.archetype_metadata ->> 'external_source_id', ''),
    bathrooms.id::text
  ) as external_source_id,
  bathrooms.id as canonical_bathroom_id,
  'promoted'::public.bathroom_source_record_status_enum as status,
  false as is_public_candidate,
  bathrooms.place_name,
  bathrooms.address_line1,
  bathrooms.city,
  bathrooms.state,
  bathrooms.postal_code,
  bathrooms.country_code,
  bathrooms.latitude,
  bathrooms.longitude,
  bathrooms.is_locked,
  bathrooms.is_accessible,
  bathrooms.is_customer_only,
  bathrooms.accessibility_features,
  bathrooms.hours_json,
  bathrooms.show_on_free_map,
  bathrooms.hours_source,
  bathrooms.google_place_id,
  coalesce(bathrooms.access_type, 'public'),
  coalesce(bathrooms.location_archetype, 'general'),
  coalesce(bathrooms.archetype_metadata, '{}'::jsonb),
  bathrooms.archetype_metadata ->> 'source_dataset' as source_dataset,
  bathrooms.archetype_metadata ->> 'website' as source_url,
  case
    when bathrooms.archetype_metadata ->> 'import_source' = 'osm-overpass-us' then 'ODbL-1.0'
    else null
  end as source_license_key,
  case
    when bathrooms.archetype_metadata ->> 'import_source' = 'osm-overpass-us' then 'OpenStreetMap contributors'
    else bathrooms.archetype_metadata ->> 'source_dataset'
  end as source_attribution_text,
  coalesce(
    nullif(bathrooms.archetype_metadata ->> 'source_timestamp', '')::timestamptz,
    nullif(bathrooms.archetype_metadata ->> 'last_edited_at', '')::timestamptz,
    bathrooms.updated_at
  ) as source_updated_at,
  coalesce(bathrooms.archetype_metadata, '{}'::jsonb) as raw_payload,
  md5(coalesce(bathrooms.archetype_metadata, '{}'::jsonb)::text) as raw_payload_hash
from public.bathrooms bathrooms
where bathrooms.source_type = 'imported'
on conflict (source_key, external_source_id) do update
  set
    canonical_bathroom_id = excluded.canonical_bathroom_id,
    status = excluded.status,
    is_public_candidate = excluded.is_public_candidate,
    updated_at = now();

insert into public.bathroom_canonical_field_sources (
  bathroom_id,
  field_name,
  source_kind,
  source_record_id
)
select
  source_records.canonical_bathroom_id as bathroom_id,
  tracked_fields.field_name,
  'import'::public.bathroom_field_source_kind_enum as source_kind,
  source_records.id as source_record_id
from public.bathroom_source_records source_records
cross join (
  values
    ('place_name'),
    ('address_line1'),
    ('city'),
    ('state'),
    ('postal_code'),
    ('country_code'),
    ('latitude'),
    ('longitude'),
    ('is_locked'),
    ('is_accessible'),
    ('is_customer_only'),
    ('accessibility_features'),
    ('hours_json'),
    ('show_on_free_map'),
    ('hours_source'),
    ('google_place_id'),
    ('access_type'),
    ('location_archetype'),
    ('archetype_metadata')
) as tracked_fields(field_name)
where source_records.canonical_bathroom_id is not null
on conflict (bathroom_id, field_name) do nothing;
