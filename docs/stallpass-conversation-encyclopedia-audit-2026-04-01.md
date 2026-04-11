# StallPass Conversation Encyclopedia And Local Codebase Audit

Date: 2026-04-01

## Scope

- Source corpus: `thread_exports/parsed-dialogue/manifest.json`
- Comparison target: the local working directory at `C:\Users\T\Desktop\PeeDom`
- Validation target: current local scripts and reachable local services only
- This audit uses the local directory, not GitHub branch state

## Corpus Summary

- Parsed export contains 26 transcript entries and 1,784 messages.
- There are 25 unique conversations.
- `Verify working agreements` appears twice in the manifest but points at the same parsed session id and same parsed output.
- Several threads are shipping threads, several are launch-readiness or Android/release threads, and several are pure meta/tooling/spec threads that do not imply product-feature obligations.

## Verified Architecture Baseline

The active app is an Expo / React Native mobile app with Expo Router routes under `app/`, business logic and APIs under `src/`, Supabase as the backend, React Query for server state, Zustand for client state, NativeWind styling, a tracked native Android project under `android/`, and a small hosted web surface under `web/`.

Core files confirming that baseline:

- `package.json`
- `app.config.ts`
- `app/_layout.tsx`
- `src/lib/supabase.ts`
- `src/lib/query-client.ts`
- `src/contexts/AuthContext.tsx`

The current active brand/runtime config is already `StallPass`:

- `app.config.ts` uses `name: 'StallPass'`, `slug: 'stallpass'`, `scheme: 'stallpass'`, and `com.stallpass.app`
- `app.json` matches the StallPass slug/package
- `eas.json` includes `cli.appVersionSource: "local"`

## Encyclopedia: What The App Does And How The Code Enables It

### 1. Discovery Map And Live Bathroom Browsing

Primary surface:

- `app/(tabs)/index.tsx`

How it works:

- The map tab loads bathrooms through `useBathrooms(...)`.
- Device location comes from `useLocation(...)`.
- Live viewport updates are handled by `useRealtimeBathrooms(...)`.
- Premium map visibility is enforced in `src/utils/bathroom.ts` by `isBathroomVisibleOnMap(...)`.
- Directions opens are recorded through `recordBathroomNavigationOpen(...)` in `src/api/bathrooms.ts`.
- Marker clustering is implemented in `src/components/MapView.tsx`.

What this means functionally:

- users can browse bathrooms on a map
- filters affect the query/result set
- premium-only StallPass locations can be hidden from free users
- map navigation opens are tracked for analytics

### 2. Search, Suggestions, Geocode Fallback, And Search History

Primary surface:

- `app/(tabs)/search.tsx`

How it works:

- Search state lives in `useSearchStore`
- results come from `useSearch(...)`
- suggestion rows come from `useSearchSuggestions(...)`
- fallback geocoding comes from `useGeocodeFallback(...)` and `useGeocodeTypeahead(...)`
- search history is persisted through `useSearchHistory(...)`

What this means functionally:

- users can search by place, address, or city
- search can suggest likely matches
- the app can fall back to geocoded location jumps
- search history is remembered and reusable

### 3. Favorites

Primary surface:

- `app/(tabs)/favorites.tsx`

How it works:

- synced favorite directory data comes from `useFavoriteDirectory(...)`
- mutations come from `useFavorites(...)`
- client-side optimistic removal/sort state lives in `useFavoritesStore`
- favorites can jump the user back to the map with the selected bathroom centered

What this means functionally:

- signed-in users can save bathrooms
- favorites sync across sessions
- favorites can be sorted and re-opened as map selections

### 4. Bathroom Detail, Code Trust, Photos, And Arrival Alerts

Primary surface:

- `app/bathroom/[id].tsx`

How it works:

- detail data comes from `useBathroomDetail(...)`
- code reveal uses `useRewardedCodeUnlock(...)` for non-premium unlocks
- code verification votes use `useBathroomCodeVerification(...)`
- photo proof uploads use `useBathroomPhotos(...)`
- cleanliness ratings use `useCleanlinessRating(...)`
- premium arrival alerts use `usePremiumArrivalAlert(...)`
- realtime presence and vote updates use `useRealtimePresence(...)` and `useRealtimeCodeVotes(...)`
- bathroom detail views are recorded through `useBathroomView(...)`
- directions from detail also call `recordBathroomNavigationOpen(...)`

What this means functionally:

- the app can show bathroom details, trust signals, and live code confidence
- premium or rewarded-ad users can reveal access codes
- users can verify or report whether a code works
- users can upload proof photos
- premium users can arm arrival alerts

### 5. User Contributions And Bathroom Submission

Primary surfaces:

- `app/modal/add-bathroom.tsx`
- `src/api/bathroom-submissions.ts`
- `src/hooks/useBathroomSubmissions.ts`

How it works:

- new bathroom submissions go through a dedicated submission flow
- submission payloads and file uploads are validated and sent to Supabase-backed APIs
- tests exist for this surface in `__tests__/bathroom-submissions-api.test.ts`

What this means functionally:

- users can propose new bathroom locations
- submitted photos and metadata go through real validation paths

### 6. Accessibility And Filtered Discovery

Primary files:

- `src/utils/bathroom.ts`
- `src/store/useAccessibilityStore.ts`
- `src/hooks/useAccessibility.ts`
- `src/components/MapFilterDrawer.tsx`

How it works:

- accessibility fields are normalized into a typed feature object
- filters and accessibility preferences are merged before query/display
- the same logic powers map and search filtering

What this means functionally:

- accessibility mode is not cosmetic; it changes what results are shown and prioritized

### 7. Auth, Guest Mode, Session Recovery, And Offline-Tolerant State

Primary files:

- `src/contexts/AuthContext.tsx`
- `src/lib/storage.ts`
- `src/hooks/useOfflineSync.ts`
- `src/lib/query-client.ts`

How it works:

- guest mode and authenticated mode are both first-class paths
- auth state is cached locally
- profile and related per-user artifacts are cached/cleared explicitly
- return-intent behavior allows auth-gated flows to resume after sign-in
- offline queue and cached state are part of the live auth/runtime model

What this means functionally:

- users can browse as guests
- protected actions can redirect to auth and then resume
- the app is designed for degraded network conditions, not just happy-path connectivity

### 8. Profile, Gamification, Premium, And Account Controls

Primary surface:

- `app/(tabs)/profile.tsx`

How it works:

- profile/dashboard data comes from `useGamificationDashboard(...)`
- premium state is derived with `hasActivePremium(...)`
- account sign-out, deactivation, and deletion use `useProfileAccount` hooks
- data export uses `useDataExport(...)`
- leaderboards, badges, points history, and profile stats are rendered through dedicated profile components

What this means functionally:

- users can view points, badges, streaks, leaderboards, and premium status
- users can deactivate or permanently delete their account in-app

### 9. Business Claims, Business Portal, Coupons, And Managed Locations

Primary surfaces:

- `app/modal/claim-business.tsx`
- `app/(tabs)/business.tsx`

How it works:

- business ownership claims flow through `src/api/business-claims.ts`
- dashboard analytics come from `src/api/business.ts`
- coupon creation/redemption uses `src/api/business-coupons.ts`
- early-adopter invite generation/redemption uses `src/api/early-adopter.ts`
- business analytics and settings are backed by migrations `031`, `032`, `034`, `035`, `036`, and `037`

What the active UI currently exposes:

- claim history
- dashboard summary stats
- visit analytics card
- featured placements card
- free-map visibility toggle
- coupon creation and coupon listing
- admin-only early-adopter invite UI
- business hours editor sheet

### 10. Legal, Privacy, Terms, Support, And Hosted Business Surface

Primary files:

- `app/modal/legal.tsx`
- `web/privacy/index.html`
- `web/terms/index.html`
- `web/support/index.html`
- `web/business/index.html`

What this means functionally:

- the mobile app has in-app privacy/terms surfaces
- the hosted site has public privacy, terms, and support URLs
- there is also a hosted business-facing dashboard-style web surface

### 11. Android Studio, Release Hardening, And EAS

Primary files:

- `README.md`
- `app.config.ts`
- `eas.json`
- `android/`
- `scripts/android-tooling.cjs`

What this means functionally:

- local Android Studio work is supported
- the native Android project is tracked
- EAS remains the release path
- app config enforces required production env values for production builds

## Conversation-By-Conversation Digest

This section summarizes every unique parsed conversation and whether it creates a current product parity obligation.

### 1. Verify working agreements

- Nature: architecture/spec
- Main outcome: established Phase 4-oriented working agreements and repository goal framing
- Current repo parity: mostly superseded by later implementation work; no direct missing feature obligation from this thread alone

### 2. Add repository test script

- Nature: shipping thread
- Main outcome: test script and baseline dependency/tooling cleanup
- Current repo parity: present, but later regressions mean the repo no longer fully passes lint/type-check

### 3. Fix Expo install and run errors

- Nature: troubleshooting
- Main outcome: diagnosed mixed SDK / Android toolchain issues
- Current repo parity: largely addressed by later Android and dependency work

### 4. Provide Expo dependency commands

- Nature: shipping thread
- Main outcome: clustered map markers, add-a-spot flow, photo-upload path, and EAS release workflow
- Current repo parity: present

### 5. Activate Builder Prime mode

- Nature: manifest/repo-state reconciliation
- Main outcome: updated launch/phase documentation to actual repo state
- Current repo parity: documentation/meta only

### 6. Apply skill-creator instructions

- Nature: meta/spec
- Main outcome: prompt/skill framing plus repo analysis
- Current repo parity: no app feature obligation

### 7. Draft auth decomposition spec

- Nature: spec and preflight work
- Main outcome: auth/offline decomposition and `_preflight` tree work
- Current repo parity: preflight artifacts exist; not a direct missing shipping feature

### 8. Draft auth refactor spec

- Nature: spec
- Main outcome: technical auth/session plan
- Current repo parity: current auth implementation already covers guest mode, return intents, cached profile/session handling, and offline concerns

### 9. Describe Android Studio prep

- Nature: analysis
- Main outcome: guidance for Android Studio migration readiness
- Current repo parity: later Android migration work covers this

### 10. Plan Android Studio migration

- Nature: shipping thread
- Main outcome: tracked Android project workflow and Android Studio guidance
- Current repo parity: present

### 11. Understand Android Studio migration

- Nature: setup thread
- Main outcome: local env / Android key wiring
- Current repo parity: present in local-env-oriented workflow, not a product feature gap

### 12. Review Android production readiness

- Nature: launch hardening / review
- Main outcome: AdMob config fixes and production Android readiness improvements
- Current repo parity: largely present

### 13. Analyze Android Studio compatibility

- Nature: shipping plus env validation
- Main outcome: Android AdMob ids and launch compatibility checks
- Current repo parity: mostly local-environment specific; not a missing app feature

### 14. Begin phase 5 and phase 6

- Nature: shipping thread
- Main outcome: business claim flow and mobile business portal
- Current repo parity: present

### 15. Add nearby bathrooms feature

- Nature: scoping/feasibility thread
- Main outcome: feature was analyzed as feasible, not shipped in that thread
- Current repo parity: missing as a user-facing feature

### 16. Define PeeDom core architect skill

- Nature: mixed meta plus shipping thread
- Main outcome: PeeDom skill creation plus shipping sections around favorites and related surfaces
- Current repo parity: favorites and associated UX are present

### 17. Confirm 15.5 upgrade details

- Nature: mixed thread with feature references and later workflow discussion
- Main outcome: discussion included search, favorites, live status, profile/gamification, accessibility, and contribution work
- Current repo parity: the referenced app surfaces are broadly present

### 18. Configure Supabase MCP access

- Nature: tooling/meta
- Main outcome: MCP/server setup discussion
- Current repo parity: no app feature obligation

### 19. Find when to minify and obfuscate

- Nature: advice/research
- Main outcome: launch-process guidance
- Current repo parity: no app feature obligation

### 20. Define StallPass coding prompt

- Nature: meta/prompting
- Main outcome: Claude workflow instruction prompt
- Current repo parity: no app feature obligation

### 21. Assess launch readiness and business

- Nature: shipping plus launch audit
- Main outcome: StallPass naming, EAS fixes, release hardening, public legal/support pages, hosted business dashboard
- Current repo parity: broadly present

### 22. Review codebase for Android Studio

- Nature: review/findings
- Main outcome: Play readiness review, including finding that account deletion was missing at that time
- Current repo parity: account deletion has since been implemented

### 23. Add stallPass business controls

- Nature: major shipping thread
- Main outcome: premium-only map gating, free-map toggle, coupons, analytics, location verification, richer hours UX, early-adopter invites, Google-hours plan
- Current repo parity: partly present and partly dormant; see parity findings below

### 24. Sync GitHub with local files

- Nature: repo synchronization
- Main outcome: GitHub/local alignment
- Current repo parity: not relevant to app-feature parity because this audit uses local files

### 25. Export PeeDom threads to zip

- Nature: export/meta
- Main outcome: transcript export packaging
- Current repo parity: no app feature obligation

## Current Parity Findings

### Clearly Present

- map discovery and clustering
- search, suggestions, and search history
- favorites
- bathroom detail page with code trust and rewarded unlock
- photo proof upload
- cleanliness ratings
- realtime status and code vote refresh
- business claim flow
- mobile business portal
- coupon system
- early-adopter invite system
- account deletion
- legal/privacy/terms/support surfaces
- tracked Android project and Android Studio workflow
- StallPass package identifiers and EAS local app version source

### Present But Only Partial Or Weakly Wired

#### 1. Live Google-hours sync

What exists:

- schema fields in `supabase/migrations/033_bathroom_hours_presets.sql`
- hours editor presets in `src/components/business/BusinessHoursEditorSheet.tsx`

What is missing:

- no Google Places fetch path
- no server-side sync function
- no `Link Google Listing` UI
- no `Refresh From Google` UI
- active update path still calls `update_business_bathroom_hours`, not `update_business_bathroom_hours_v2`
- current active hours editor does manual hours editing only

Verdict:

- partial plumbing exists
- the live Google-hours feature discussed in the conversations is not implemented end to end

#### 2. Business-side premium verification and location verification controls

What exists:

- full settings/data model in `business_bathroom_settings`
- `ManagedBathroomSection.tsx` includes `StallPass Verified`, `Also Show On Free Map`, and `Location Verified` controls

What is missing:

- `ManagedBathroomSection` is not used by the active business tab
- the current active screen only exposes the free-map toggle plus coupons/hours flow

Verdict:

- implemented in dormant component/data layer
- not fully included in the active app experience

#### 3. Dedicated StallPass visit attribution

What exists:

- dashboard summary already shows weekly visitors and route opens from analytics views
- `src/api/stallpass-visits.ts` and `src/hooks/useStallPassVisits.ts` exist
- coupon redemption records a StallPass visit via `record_stallpass_visit(...)`

What is weak:

- `useRecordVisit()` is currently unused
- no broad active wiring was found for recording visits from map/search/favorite/deep-link surfaces into the dedicated StallPass visits table

Verdict:

- general analytics exist
- the separate StallPass visit-tracking path looks partial

#### 4. Business offers/promotions model

What exists:

- older `business_promotions` schema/API/UI path
- newer active `business_coupons` path

What is weak:

- `ManagedBathroomSection.tsx` uses promotions
- the active business tab uses coupons instead
- this leaves two overlapping offer models in the repo

Verdict:

- coupons are active and fulfill the product need
- the older promotions surface is effectively dormant code

### Missing

#### 1. Nearby bathrooms feature

I did not find an implemented nearby-bathrooms panel or matching hook/RPC in the tracked repo.

Search evidence:

- no tracked hits for `NearbyBathroomsPanel`
- no tracked hits for `useNearbyBathrooms`
- no tracked hits for `get_nearby_bathrooms`

Verdict:

- discussed in transcripts
- not present in the current app

## Current Code Health And Validation Status

### Passing

- `npm test -- --runInBand`
  - 41/41 suites passed
  - 198/198 tests passed

### Failing

- `npm run lint`
- `npm run type-check`

Current local failures:

1. `app/(tabs)/business.tsx`
   - unused `ManagedBathroomSection` import
   - unused `_couponId` parameter
2. `src/components/business/BathroomHoursGrid.tsx`
   - unused `useMemo` import
3. `src/hooks/useBusinessCoupons.ts`
   - unused `businessQueryKeys` import
4. `src/api/business-coupons.ts`
   - TypeScript errors around `.update(...)` payload typing being inferred as `never`

Meaning:

- the repo has good Jest coverage
- the repo is not currently in a clean static-validation state
- I cannot truthfully mark the entire current app as fully working until lint and type-check are green again

### Database Verification

- `supabase db lint` failed because nothing was listening on `127.0.0.1:54322`

Meaning:

- Supabase local dev was not active during this audit
- database lint could not be used to confirm SQL health in this run

## Bottom Line

The local codebase already contains most of the major features discussed across the conversation history, especially the core mobile experience, business claim flow, coupon system, legal surfaces, Android build path, and launch hardening.

The main gaps I would carry forward as the actionable list are:

1. Nearby bathrooms feature is still missing.
2. Live Google-hours sync is still missing end to end.
3. Rich business settings controls exist but are not currently wired into the active business tab.
4. Dedicated StallPass visit attribution is only partially wired.
5. The repo currently fails lint and type-check, so “everything is working” is not yet fully true for the current local directory.

## Recommended Next Decision List

If the next step is deciding what to do, I would prioritize in this order:

1. Fix the current lint/type-check regressions so the repo returns to a green engineering baseline.
2. Decide whether to surface `ManagedBathroomSection` as the actual active business-management UI.
3. Decide whether Google-hours sync is worth building now or should remain a later launch item.
4. Decide whether the nearby-bathrooms feature should be built now or treated as post-launch discovery polish.
5. Decide whether to keep only coupons or preserve the older promotions model too.
