Assumptions: I’m reviewing the plan against the current repo snapshot, not validating whether the planned code has already landed. I’m also assuming the intended target is the production app under `src/` and `app/`, not `_preflight/`.

1. `severity: blocker`  
   `file: [src/lib/supabase.ts](/mnt/c/Users/T/Desktop/PeeDom/src/lib/supabase.ts#L11)`  
   `issue: The plan’s SecureStore fix targets the wrong layer.`  
   `why it matters:`
   `Supabase` persists the auth session through `createClient(..., { auth: { storage: AsyncStorage, persistSession: true } })`. Changing [`src/contexts/AuthContext.tsx`](/mnt/c/Users/T/Desktop/PeeDom/src/contexts/AuthContext.tsx) will not move the actual token/session storage, so the plan would leave the launch blocker in place while claiming it was fixed.  
   `exact fix recommendation:`  
   Replace the auth storage adapter in [`src/lib/supabase.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/lib/supabase.ts#L11) with a SecureStore-backed implementation compatible with Supabase’s storage contract, then audit sign-in, refresh, sign-out, and session recovery paths that depend on persisted auth. Treat [`src/contexts/AuthContext.tsx`](/mnt/c/Users/T/Desktop/PeeDom/src/contexts/AuthContext.tsx) as a consumer, not the storage owner.  
   `regression test suggestion:`  
   Add a test that mocks Supabase client auth storage and verifies session persistence no longer calls `AsyncStorage`, plus an app-level test for cold-start session restore after login and for clearing storage on sign-out.

2. `severity: high`  
   `file: [src/lib/offline-queue.ts](/mnt/c/Users/T/Desktop/PeeDom/src/lib/offline-queue.ts#L1)`  
   `issue: The plan duplicates and conflicts with existing offline retry behavior.`  
   `why it matters:`  
   The repo already has `retry_count`, `MAX_QUEUE_RETRY_COUNT = 3`, and drop logic in `shouldDropQueuedMutation()`, with tests codifying “drop on fourth failed replay” in [`__tests__/queued-mutations.test.ts`](/mnt/c/Users/T/Desktop/PeeDom/__tests__/queued-mutations.test.ts#L142). The plan proposes adding `attempt_count` in [`src/types/index.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/types/index.ts#L102) and changing behavior to 5 retries, but it never updates the existing queue schema or tests. That is a schema migration, not a local hook tweak.  
   `exact fix recommendation:`  
   If retry policy must change, update the existing queue model in [`src/lib/offline-queue.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/lib/offline-queue.ts), keep one counter field, and migrate persisted queue entries via [`src/utils/validate.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/utils/validate.ts#L41) and tests. Do not add a parallel `attempt_count` field in the hook only.  
   `regression test suggestion:`  
   Extend [`__tests__/queued-mutations.test.ts`](/mnt/c/Users/T/Desktop/PeeDom/__tests__/queued-mutations.test.ts) to cover persisted older entries, the new retry threshold, and behavior after app restart with queued mutations already stored.

3. `severity: high`  
   `file: [src/hooks/useOfflineSync.ts](/mnt/c/Users/T/Desktop/PeeDom/src/hooks/useOfflineSync.ts#L130)`  
   `issue: The plan’s generic dedup rule is unsafe for queue semantics and ignores existing enqueue call sites.`  
   `why it matters:`  
   “Deduplicate by `(user_id, type, bathroom_id)`” is not safe across all queued mutation types. It can collapse distinct user intent for reports, ratings, accessibility changes, or alternating favorite add/remove sequences. The queue is fed from multiple hooks, not just favorites: [`src/hooks/useFavorites.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/hooks/useFavorites.ts#L262), [`src/hooks/useBathroomReports.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/hooks/useBathroomReports.ts#L65), [`src/hooks/useCleanlinessRating.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/hooks/useCleanlinessRating.ts#L119), and others. A naive dedup pass will silently drop data and break offline integrity.  
   `exact fix recommendation:`  
   Limit coalescing to mutation types that are provably last-write-wins. Favorites can be coalesced to final state, but reports should not. Ratings/accessibility/status updates need explicit per-type merge rules. Put the coalescing logic in [`src/lib/offline-queue.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/lib/offline-queue.ts), where enqueue semantics actually live.  
   `regression test suggestion:`  
   Add queue tests for `favorite_add -> favorite_remove`, repeated status updates, repeated cleanliness ratings, and duplicate report submissions to verify the queue preserves intent correctly per mutation type.

4. `severity: high`  
   `file: [app/bathroom/[id].tsx](/mnt/c/Users/T/Desktop/PeeDom/app/bathroom/[id].tsx#L108)`  
   `issue: The route-validation fix is scoped too narrowly and overclaims an RLS benefit.`  
   `why it matters:`  
   The plan says route-param validation in the bathroom screen “prevents RLS bypass attempts.” It does not. RLS is enforced server-side. More importantly, the app has multiple other routes that accept `bathroom_id` and fetch the same resource, including [`app/modal/submit-code.tsx`](/mnt/c/Users/T/Desktop/PeeDom/app/modal/submit-code.tsx), [`app/modal/rate-cleanliness.tsx`](/mnt/c/Users/T/Desktop/PeeDom/app/modal/rate-cleanliness.tsx), [`app/modal/live-status.tsx`](/mnt/c/Users/T/Desktop/PeeDom/app/modal/live-status.tsx), [`app/modal/update-accessibility.tsx`](/mnt/c/Users/T/Desktop/PeeDom/app/modal/update-accessibility.tsx), and [`app/modal/claim-business.tsx`](/mnt/c/Users/T/Desktop/PeeDom/app/modal/claim-business.tsx). Fixing only one screen leaves the same invalid-ID path elsewhere.  
   `exact fix recommendation:`  
   Put UUID validation in [`src/api/bathrooms.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/api/bathrooms.ts#L142) and any shared validators, then have screens handle a typed invalid-id error consistently. Screen-level redirects can remain for UX, but they should not be the primary guard.  
   `regression test suggestion:`  
   Add tests for invalid `bathroom_id` across bathroom detail and the modal routes, verifying no Supabase query is fired and the user is redirected or shown a safe error state.

5. `severity: medium`  
   `file: [app/(tabs)/profile.tsx](/mnt/c/Users/T/Desktop/PeeDom/app/(tabs)/profile.tsx#L331)`  
   `issue: Phase F is based on an incorrect assessment of the current profile tab.`  
   `why it matters:`  
   The plan says the screen is “60%” done and must add display name edit, notification toggle, deactivation, and sign-out. Those already exist today through [`src/components/profile/ProfileHeader.tsx`](/mnt/c/Users/T/Desktop/PeeDom/src/components/profile/ProfileHeader.tsx), [`src/components/profile/NotificationPrefsCard.tsx`](/mnt/c/Users/T/Desktop/PeeDom/src/components/profile/NotificationPrefsCard.tsx), and [`src/hooks/useProfileAccount.ts`](/mnt/c/Users/T/Desktop/PeeDom/src/hooks/useProfileAccount.ts). That makes the phase mostly redundant and hides the real review work: validating those existing flows, not re-planning them.  
   `exact fix recommendation:`  
   Replace Phase F with an audit phase: verify the existing profile edit, push preference, sign-out, and deactivate flows on device, including failure states, guest state, and post-deactivation session clearing.  
   `regression test suggestion:`  
   Add tests around existing profile components and hooks: display-name rate-limit handling, notification permission denial, deactivate-account success/failure, and sign-out client-state reset.

6. `severity: medium`  
   `file: [supabase/migrations/016_favorites_surface.sql](/mnt/c/Users/T/Desktop/PeeDom/supabase/migrations/016_favorites_surface.sql#L61)`  
   `issue: The validation checklist expects the wrong auth/RLS behavior.`  
   `why it matters:`  
   The plan says `get_favorites_with_detail` should return empty for an unauthenticated caller. The function explicitly raises when `auth.uid()` is null or does not match `p_user_id`. Similarly, the plan proposes checking that `deactivate_account` enforces `auth.uid() = user_id`, but [`supabase/migrations/017_profile_account_hardening.sql`](/mnt/c/Users/T/Desktop/PeeDom/supabase/migrations/017_profile_account_hardening.sql#L92) has no `user_id` parameter at all. These are not minor wording issues; they indicate the plan is testing the wrong contract.  
   `exact fix recommendation:`  
   Rewrite the Supabase validation steps to match actual function contracts: unauthenticated favorite RPC should fail with auth denial, `deactivate_account()` should only affect `auth.uid()`, and auth coverage should verify grants plus function behavior separately.  
   `regression test suggestion:`  
   Add SQL or API tests for unauthenticated favorite RPC rejection, authenticated access to own favorites only, and `deactivate_account()` affecting only the caller’s profile and push subscriptions.

7. `severity: medium`  
   `file: [eas.json](/mnt/c/Users/T/Desktop/PeeDom/eas.json#L1)`  
   `issue: The build validation steps are partly outdated and miss the real Expo release path.`  
   `why it matters:`  
   The plan uses `expo build --platform android`, but this repo is configured for EAS in [`eas.json`](/mnt/c/Users/T/Desktop/PeeDom/eas.json). `expo build` is not the correct submission pipeline here. That means the validation section is not aligned with the actual release mechanism and may produce false confidence.  
   `exact fix recommendation:`  
   Remove `expo build` validation from the plan. Use `eas build` for preview/production profiles and validate native config resolution through EAS profile envs, not only local shell env.  
   `regression test suggestion:`  
   Add a release checklist that runs `eas build --profile preview` and `eas build --profile production` with explicit env injection and verifies expected config failures when required production vars are absent.

8. `severity: low`  
   `file: [app.config.ts](/mnt/c/Users/T/Desktop/PeeDom/app.config.ts#L1)`  
   `issue: The config phase misses existing config/runtime coverage and hidden dependencies.`  
   `why it matters:`  
   The repo already has AdMob runtime/config tests in [`__tests__/admob-config.test.ts`](/mnt/c/Users/T/Desktop/PeeDom/__tests__/admob-config.test.ts) and [`__tests__/admob-runtime.test.ts`](/mnt/c/Users/T/Desktop/PeeDom/__tests__/admob-runtime.test.ts). The plan adds build-time AdMob guards but does not account for runtime availability failure, rewarded-ad feature flags, or the fact that `.env.example` already documents the native IDs. This is incomplete rather than wrong, but it weakens launch readiness.  
   `exact fix recommendation:`  
   Expand the config phase to cover both build-time env guards and runtime fail-closed behavior for missing native modules / disabled rewarded ads. Keep `.env.example` changes focused on genuinely missing keys.  
   `regression test suggestion:`  
   Extend the existing AdMob tests to cover production env resolution from `app.config.ts` and verify that missing production app IDs fail during config generation, while local/staging continue to use test IDs.

Open questions:
- The plan says “all 18 migrations are already applied,” but its validation later says “run `supabase db push` against staging.” That is a deployment action, not a pure validation step, and should be separated from audit-only verification.
- The plan ignores the dirty worktree and parallel `_preflight` implementation. If `_preflight` is still authoritative for any launch checks, the plan needs to say so explicitly; otherwise it should exclude it to avoid split-brain fixes.

Change summary:
The main problems are not missing code ideas; they are scope errors. The plan targets the wrong auth-storage file, duplicates existing queue logic, misreads the profile surface, tests the wrong Supabase contracts, and under-scopes route validation to one screen instead of the shared API boundary.
