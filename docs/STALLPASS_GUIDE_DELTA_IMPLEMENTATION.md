# StallPass Implementation Guide — Surgical Delta on Supabase

> **Locked contract** for translating `STALLPASS_IMPLEMENTATION_GUIDE.md` onto the existing
> Supabase-based StallPass codebase. Option A (port to Supabase) + Option 2-a (extend, never
> duplicate) + Option 3-a (direct `@supabase/supabase-js`, no new API wrapper). All
> project-timeline language from the guide is disregarded. Functional time semantics
> (rate limits, urgency 60-second window, hourly decay) are preserved.
>
> Scope: every behavioral requirement in the guide's 11 sections, implemented as the
> minimum delta on top of the existing 44-migration schema. Zero `_v2` tables.

## Delta map (guide section → existing surface → action)

### Section 1 — Schema extensions on `bathrooms`
- **Already present**: `latitude`, `longitude`, `geom` (generated `geography(point,4326)`),
  `is_locked`, `is_accessible`, `is_customer_only`, `hours_json`, `source_type`,
  `moderation_status`, `location_archetype`, `archetype_metadata`.
- **Guide wants**: `access_type` enum, `hardware_ready`, `partner_lock_vendor_id`,
  `access_code`, `code_updated_at`, `code_confidence`, `dwell_time_avg_seconds`,
  `peak_usage_jsonb`, `source`, `business_id`.
- **Action**: Migration `044` adds `access_type` (enum), `hardware_ready`,
  `partner_lock_vendor_id`, `dwell_time_avg_seconds`, `peak_usage_jsonb`, `business_id`.
  **Skip** `access_code`/`code_updated_at`/`code_confidence` on `bathrooms` — codes already
  live in `bathroom_access_codes` with `confidence_score` + `last_verified_at`. `source`
  is already served by `source_type`; we add an `osm_seed` sentinel value rather than a
  second column.

### Section 2 — Trust graph
- **Already present**: `contributor_reputation_profiles` (richer than guide — six trust
  tiers, trust_weight, accepted/rejected counters, code_success_ratio, reports resolved,
  etc.); `calculate_code_confidence()`; `refresh_bathroom_access_code_aggregates()`;
  `expire_stale_bathroom_access_codes()`; `point_events` (idempotent audit log);
  `code_reveal_grants`; `has_bathroom_code_reveal_access()`; `code_votes` with
  anti-self-vote trigger and auto-point-award.
- **Guide wants**: probabilistic `user_trust` (0–1 float), append-only `code_verifications`
  ledger, trust-weighted confidence update, trust-decay over time, shadow-ban flag.
- **Action**: **Extend** `contributor_reputation_profiles` with `shadow_banned` bool
  + `shadow_banned_reason`; create `code_verifications` append-only ledger capturing
  device fingerprint + geo for every confirm/deny/update; add RPC
  `verify_access_code(bathroom_id, action, reported_code?, device_fingerprint?, lat?, lng?)`
  that runs the full Fastify-route logic server-side (sybil check → record verification →
  update code confidence weighted by existing `trust_weight` column → call existing
  `refresh_bathroom_access_code_aggregates` → award points via existing `point_events`).
  Add `decay_code_confidence()` PL/pgSQL function and `pg_cron` hourly schedule.

### Section 3 — Anti-sybil
- **Already present**: `code_votes` self-vote trigger, `is_suspended` on profiles.
- **Guide wants**: velocity (≤5 verifications/10min), device-fingerprint collision
  (≤2 accounts/device), geo-impossibility (≤200 km/h), shadow-ban.
- **Action**: Create `device_fingerprints` table (user_id ↔ fingerprint hash, first/last
  seen). PL/pgSQL function `check_access_verification_sybil(user_id, fingerprint, lat, lng)`
  returning `(allowed bool, shadow_ban bool, reason text)`. Called inside
  `verify_access_code`. Frontend hook `useDeviceFingerprint` hashes
  `Device.modelName | osVersion | applicationId | installId(SecureStore)`.

### Section 4 — Event pipeline
- **Already present**: `point_events`, `bathroom_views`, `bathroom_navigation_events`
  (narrow, purpose-built).
- **Guide wants**: generic partitioned `events` table covering 17 event types; batch
  ingest endpoint.
- **Action**: Create `public.access_intelligence_events` (name chosen to avoid collision
  with anything else and to make the query surface explicit) partitioned monthly on
  `created_at` with 12 forward partitions. Whitelist the 17 event types via CHECK
  constraint. RLS: insert is own-rows-only; select restricted to service role + own rows.
  RPC `log_access_intelligence_event(...)` and `log_access_intelligence_events_batch(...)`
  for batch (≤100). Existing tables untouched. Expose via Edge Function `log-event` which
  forwards `X-Device-Fingerprint` header.

### Section 5 — Heuristic prediction layer
- **Already present**: `bathroom_access_codes.confidence_score` (0–100), code freshness.
- **Guide wants**: `likely_accessible`, `confidence`, `busy_level`, `best_time`.
- **Action**: PL/pgSQL RPC `get_bathroom_predictions(p_bathroom_id uuid)` returning a
  single-row JSONB answer. Uses `bathrooms.access_type`, existing
  `bathroom_access_codes.confidence_score` (divided by 100 for 0–1), and
  `peak_usage_jsonb` + recent `access_intelligence_events` view counts. Returns
  `model_version: 'heuristic-v1'`. Frontend hook `useBathroomPredictions` +
  `PredictionBadge` component styled with NativeWind.

### Section 6 — Business capture
- **Already present**: `business_claims` (keyed to `bathroom_id`), `business_verification_badges`,
  `business_featured_placements`, `business_bathroom_settings`,
  `business_growth_invites`, `business_promotions`, `business_hours_updates`,
  `026_admin_claim_moderation.sql` flow, `029_view_verification_badge.sql`.
- **Guide wants**: a first-class `businesses` entity with name/address/hours/policies,
  claim workflow via email-domain code verification, `PUT /businesses/:id`,
  analytics endpoint.
- **Action**: **Create** `public.businesses` table (new entity — no overlap with existing
  `business_*` scaffolding which is bathroom-scoped, not business-scoped). Add
  `bathrooms.business_id FK → businesses.id`. Extend existing `business_claims` with
  `business_id`, `email_domain`, `verification_code`, `verification_sent_at`,
  `verification_expires_at`. Add RPCs `request_business_claim`, `verify_business_claim`,
  `update_business_profile`, `get_business_analytics`. Analytics reads from existing
  `bathroom_views` (not the new events table — respecting "one source of truth" for that
  metric) plus new `access_intelligence_events`. Edge Function `business-claim-email`
  dispatches verification email (logs-only in dev, integrates with existing notification
  Edge Functions in prod).

### Section 7 — NFC schema
- **Action**: Migration adds `public.hardware_partners` (id, vendor_name, api_endpoint,
  integration_status enum, contact_email, notes). FK `bathrooms.partner_lock_vendor_id
  → hardware_partners.id`. Seed one `'Reserved - Future NFC Partner'` row. RLS:
  read-only for authenticated users. No application code.

### Section 8 — Cold-start OSM geo-seeding
- **Action**: Standalone script `scripts/seed-osm-bathrooms.ts`. Uses service role key
  (`SUPABASE_SERVICE_ROLE_KEY`), Overpass API, 20 top metros, dedup by rounded
  (lat5,lon5) + name. Respects existing `bathrooms` schema — inserts with
  `source_type='imported'` and `access_type='public'` / `'purchase_required'`
  based on OSM `fee=yes` tag. Rate-limited to Overpass's 1 req/sec policy (2s sleep).
  Standalone — not compiled into the app bundle.

### Section 9 — Copycat-suffocation UX (trust tiers)
- **Already present**: Server-side six-tier taxonomy.
- **Guide wants**: Client-side tier config for code-reveal delay, verification prompt
  frequency, submit permissions.
- **Action**: RPC `get_user_trust_tier()` maps the richer six-tier server taxonomy to the
  guide's three UX buckets (`power`/`normal`/`newcomer`) and returns the tier config
  (`codeRevealDelayMs`, `showVerificationPrompts`, `canSubmitCodes`, `showTrustedBadge`,
  `verificationPromptsFrequency`). Frontend hook `useTrustTier` wraps it. Zero new tables.

### Section 10 — Urgency DAU
- **Action**: Emits `urgency_session` event into `access_intelligence_events` via new
  `log_access_intelligence_event` RPC. Frontend hook `useUrgencyDetection` wires
  `onAppOpen` / `onSearch` / `onBathroomViewed` per the guide, with 60-second window.
  Existing `useBathroomView` hook (narrow view counter) is left alone.

### Section 11 — Points-trust unification
- **Already present**: `award_code_verification_points` trigger; `point_events` idempotent
  log; `contributor_reputation_profiles` with counters; `refresh_contributor_reputation`.
- **Guide wants**: consensus-driven accuracy tracking + trust-weighted point multiplier.
- **Action**: PL/pgSQL function `check_access_code_consensus(bathroom_id)` called at the
  end of `verify_access_code`. On 3+ confirms / 0 denies → award
  `event_type='code_verification_consensus'` point_events to confirmers. On 3+ denies /
  0 confirms → increment `moderation_flag_count` on submitter; award consensus points to
  deniers. Trust multiplier lives in `calculate_trust_weighted_points(base, user_id)`
  (returns multiplier × base). Invoked wherever new code paths award points; existing
  point-award call sites are untouched.

## Files added

### Migrations (authoritative — run in order)
- `supabase/migrations/044_access_intelligence_foundation.sql`
- `supabase/migrations/045_access_intelligence_rpcs.sql`

### Edge Functions
- `supabase/functions/log-event/index.ts`
- `supabase/functions/verify-access-code/index.ts`
- `supabase/functions/decay-code-confidence/index.ts`
- `supabase/functions/business-claim-email/index.ts`

### Frontend (`src/`)
- `src/api/access-intelligence.ts` — Supabase RPC + edge function wrappers, typed.
- `src/hooks/useDeviceFingerprint.ts`
- `src/hooks/useEventEmitter.ts`
- `src/hooks/useTrustTier.ts`
- `src/hooks/useUrgencyDetection.ts`
- `src/hooks/useBathroomPredictions.ts`
- `src/hooks/useAccessCodeVerification.ts` — thin client for the new RPC
- `src/store/eventBatchStore.ts`
- `src/components/PredictionBadge.tsx` (NativeWind-styled)
- `src/types/access-intelligence.ts` — explicit RPC return/argument types layered on
  `Database` generics

### Scripts
- `scripts/seed-osm-bathrooms.ts`

### Documentation
- `docs/STALLPASS_GUIDE_DELTA_IMPLEMENTATION.md` (this file)

## Non-negotiables respected

- **Zero new tables that duplicate existing ones.** Trust signals continue to flow through
  `contributor_reputation_profiles`. Points continue to flow through `point_events` and
  `profiles.points_balance`. Codes continue to live in `bathroom_access_codes`. The only
  net-new tables are: `businesses` (first-class business entity, not present),
  `hardware_partners` (NFC preparation), `access_intelligence_events` (partitioned generic
  event log with types not covered by `bathroom_views` / `bathroom_navigation_events`),
  `code_verifications` (append-only audit ledger with device + geo that `code_votes`
  cannot hold), and `device_fingerprints` (anti-sybil identity).
- **RLS on every new table.** Own-row insert/select where user-scoped; service-role-only
  where admin-scoped.
- **pg_cron** hourly schedule for `decay_code_confidence()`. If pg_cron is not present,
  the `decay-code-confidence` Edge Function is the fallback and can be triggered by an
  external scheduler.
- **Types regen**: after migrations apply, run `supabase gen types typescript
  --project-id <id> > src/types/database.ts` to sync. The explicit types in
  `src/types/access-intelligence.ts` are layered on top and remain stable even before
  regen.
- **Every new frontend hook uses `getSupabaseClient()` from `@/lib/supabase`** or
  `invokeEdgeFunction` from `@/lib/edge-functions`. No new API wrapper class, no
  `useApiClient`.
- **No emojis, no placeholder TODOs, no `throw new Error('not implemented')`.**

## Execution order (for the human operator)

1. Apply migrations 044 then 045: `supabase db push`.
2. Regenerate types: `supabase gen types typescript --linked > src/types/database.ts`.
3. Deploy Edge Functions: `supabase functions deploy log-event verify-access-code
   decay-code-confidence business-claim-email`.
4. Seed pg_cron entry (included in 045).
5. (Optional) run `SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-osm-bathrooms.ts`.
6. `npm run type-check && npm run lint && npm run test`.
