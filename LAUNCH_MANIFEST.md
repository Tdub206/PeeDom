**StallPass**

**MASTER LAUNCH MANIFEST**

May 1, 2026
Repo-verified on this workspace for the restroom-intelligence conversion checkpoint

This document is the canonical reference for StallPass. If a pasted status block or chat summary disagrees with this file, this file wins.

Current checkpoint:

1. Supabase migrations `054_restroom_intelligence_layer.sql`, `055_entitlement_idempotency_and_restroom_rls.sql`, `056_business_restroom_metadata_analytics.sql`, and `058_rewarded_unlock_verification_polling.sql` define the restroom-intelligence, entitlement idempotency, business metadata, analytics, and AdMob reward verification polling contracts.
2. Mobile surfaces now include trust/freshness labels, saved need profiles, field-level correction entry points, live-status summaries, route destination search, scalable Android clustering behavior, and safer emergency/code unlock flows that wait for server-side rewarded verification before grant RPCs.
3. Business Web exposes owner-verified restroom metadata controls and validates the restored dashboard analytics contract.
4. CI now includes business-web dependency install, typecheck, lint, Jest, Expo config, Android prebuild drift, Android debug build, and Maestro flow inventory checks.
5. Maestro device-flow assets live under `e2e/maestro` for permission denial, map smoke, route search, city-pack, offline, deep-link, and emergency smoke validation.

| Section | Title |
| :---- | :---- |
| 1 | Current Repo State |
| 2 | Verification Snapshot |
| 3 | Active Blockers |
| 4 | Architecture Contracts |
| 5 | Phase Status |
| 6 | Remaining Delivery Work |
| 7 | Builder Directive |

# **1. Current Repo State**

## **1.1 Root Configuration**

| File / Area | Status |
| :---- | :---- |
| [app.config.ts](C:/Users/T/Desktop/StallPass/app.config.ts) | Present and active. Expo config is driven from this file. |
| [package.json](C:/Users/T/Desktop/StallPass/package.json) | Present. Required runtime packages for the current implementation are installed. |
| `assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash.png` | Present. Placeholder build assets exist and unblock Expo prebuild. Final branded assets are still a release task. |
| [eas.json](C:/Users/T/Desktop/StallPass/eas.json) | Present. EAS profiles exist. |
| `android/` | Present and supported as the tracked native Android Studio surface. Regenerate it with `npm.cmd run android:prebuild` when Expo config, plugins, or native-capable dependencies change. |
| `.env` variants | Present. Repo standard is `EXPO_PUBLIC_SUPABASE_ANON_KEY`. |

## **1.2 App Surface**

| Route / Layer | Status |
| :---- | :---- |
| [app/_layout.tsx](C:/Users/T/Desktop/StallPass/app/_layout.tsx) | Wired with SplashScreen, providers, ErrorBoundary, OfflineBanner, and app shell. |
| [app/(auth)/login.tsx](C:/Users/T/Desktop/StallPass/app/(auth)/login.tsx) | Implemented. Zod validation, loading state, error handling. |
| [app/(auth)/register.tsx](C:/Users/T/Desktop/StallPass/app/(auth)/register.tsx) | Implemented. Zod validation, loading state, error handling. |
| [app/bathroom/[id].tsx](C:/Users/T/Desktop/StallPass/app/bathroom/[id].tsx) | Implemented detail route. |
| [app/(tabs)/index.tsx](C:/Users/T/Desktop/StallPass/app/(tabs)/index.tsx) | Implemented map screen. Not a Phase 1 scaffold anymore. |
| [app/(tabs)/search.tsx](C:/Users/T/Desktop/StallPass/app/(tabs)/search.tsx) | Implemented search screen. Not a Phase 1 scaffold anymore. |
| [app/(tabs)/favorites.tsx](C:/Users/T/Desktop/StallPass/app/(tabs)/favorites.tsx) | Implemented favorites screen. Not a Phase 1 scaffold anymore. |
| [app/(tabs)/profile.tsx](C:/Users/T/Desktop/StallPass/app/(tabs)/profile.tsx) | Partial. Auth-aware, but not full product-grade profile management yet. |
| `app/modal/*` | City packs, live status, route bathrooms, report/edit, submit-code, add-bathroom, and claim-business modal routes are implemented as the current source of truth. |

## **1.3 Supporting Modules**

| File / Area | Status |
| :---- | :---- |
| [src/lib/supabase.ts](C:/Users/T/Desktop/StallPass/src/lib/supabase.ts) | Single lazy fail-closed Supabase client. |
| [src/contexts/AuthContext.tsx](C:/Users/T/Desktop/StallPass/src/contexts/AuthContext.tsx) | Current source of truth for auth state, in-memory guest-intent replay, and `refreshUser()` demotion behavior. |
| [src/contexts/LocationContext.tsx](C:/Users/T/Desktop/StallPass/src/contexts/LocationContext.tsx) | Implemented. |
| [src/hooks/useLocation.ts](C:/Users/T/Desktop/StallPass/src/hooks/useLocation.ts) | Implemented. |
| [src/hooks/useBathrooms.ts](C:/Users/T/Desktop/StallPass/src/hooks/useBathrooms.ts) | Implemented. |
| [src/hooks/useFavorites.ts](C:/Users/T/Desktop/StallPass/src/hooks/useFavorites.ts) | Implemented. |
| [src/hooks/useOfflineSync.ts](C:/Users/T/Desktop/StallPass/src/hooks/useOfflineSync.ts) | Implemented. |
| [src/api/favorites.ts](C:/Users/T/Desktop/StallPass/src/api/favorites.ts) | Implemented. |
| [src/components/BathroomCard.tsx](C:/Users/T/Desktop/StallPass/src/components/BathroomCard.tsx) | Implemented. |
| [src/components/MapView.tsx](C:/Users/T/Desktop/StallPass/src/components/MapView.tsx) | Implemented. |
| [src/components/BottomSheet.tsx](C:/Users/T/Desktop/StallPass/src/components/BottomSheet.tsx) | Implemented. |
| [src/components/OfflineBanner.tsx](C:/Users/T/Desktop/StallPass/src/components/OfflineBanner.tsx) | Implemented. |
| [src/components/CodeBadge.tsx](C:/Users/T/Desktop/StallPass/src/components/CodeBadge.tsx) | Implemented. |
| [src/constants/colors.ts](C:/Users/T/Desktop/StallPass/src/constants/colors.ts) | Present. |
| [src/constants/routes.ts](C:/Users/T/Desktop/StallPass/src/constants/routes.ts) | Present. |
| [supabase/migrations/002_functions.sql](C:/Users/T/Desktop/StallPass/supabase/migrations/002_functions.sql) | Present. Includes `get_bathrooms_near` and `profiles.role` immutability guard. |
| [src/lib/return-intent.ts](C:/Users/T/Desktop/StallPass/src/lib/return-intent.ts) | Intentionally absent. Guest-intent replay now lives in memory inside AuthContext and must stay there. |

# **2. Verification Snapshot**

Verified on May 1, 2026 from this workspace.

| Command | Result |
| :---- | :---- |
| `npm run type-check` | PASS |
| `npm run lint` | PASS |
| `npm test -- --runInBand` | PASS, 72 suites / 350 tests |
| `npm run typecheck` in `apps/business-web` | PASS |
| `npm run lint` in `apps/business-web` | PASS |
| `npx.cmd expo config --type public` | PASS |
| `npm.cmd run android:prebuild` | PASS |
| `npm.cmd run android:assembleDebug:emulator` | PASS |

## **2.1 Test Coverage Present**

| Test File | Status |
| :---- | :---- |
| [__tests__/validate.test.ts](C:/Users/T/Desktop/StallPass/__tests__/validate.test.ts) | Passing |
| [__tests__/navigation.test.ts](C:/Users/T/Desktop/StallPass/__tests__/navigation.test.ts) | Passing |
| [__tests__/queued-mutations.test.ts](C:/Users/T/Desktop/StallPass/__tests__/queued-mutations.test.ts) | Passing |
| [__tests__/bathroom-utils.test.ts](C:/Users/T/Desktop/StallPass/__tests__/bathroom-utils.test.ts) | Passing |
| [__tests__/runtime-guards.test.ts](C:/Users/T/Desktop/StallPass/__tests__/runtime-guards.test.ts) | Passing |

# **3. Active Blockers**

## **3.1 Dependency Drift**

`npx.cmd expo install --check` failed on March 11, 2026. In this shell it also reported that networking was disabled and validation was using Expo's local dependency map, so the output is directionally useful but not perfect.

The key point is that this is not just a "missing packages" problem anymore. The reported drift now includes core-stack expectations such as:

| Package | Installed | Expected by check |
| :---- | :---- | :---- |
| `react` | `18.3.1` | `19.1.0` |
| `react-native` | `0.76.5` | `0.81.5` |
| `expo-router` | `~4.0.11` | `~6.0.23` |
| `react-native-reanimated` | `~3.16.1` | `~4.1.1` |
| `react-native-safe-area-context` | `4.12.0` | `~5.6.0` |
| `react-native-screens` | `~4.3.0` | `~4.16.0` |

Recommendation:

1. Treat dependency alignment as a separate upgrade track, not as a simple pre-Phase-4 package-install task.
2. Do not blindly run `expo install` across the whole drift list under the current pinned architecture.
3. Decide explicitly whether StallPass is staying on the current validated stack or upgrading to the newer Expo 54 ecosystem that `--check` expects.

## **3.2 Local Android Build Environment**

The local Android Studio workflow is now configured and verified on this machine.

Current state on March 12, 2026:

| Check | Result |
| :---- | :---- |
| Android SDK default path | Present at `C:\Users\T\AppData\Local\Android\Sdk` |
| Java runtime | Android Studio JBR configured for the user environment at `C:\Program Files\Android\Android Studio\jbr` |
| `android/local.properties` | Present locally and ignored by Git |
| Expo Android prebuild | PASS via `npm.cmd run android:prebuild` |
| Debug APK build | PASS via `npm.cmd run android:assembleDebug:emulator` |
| Debug artifact | Generated at `android/app/build/outputs/apk/debug/app-debug.apk` |

Operational note:

The full multi-ABI `assembleDebug` build is significantly slower on this Windows machine than the shell timeout used in this workspace. The supported smoke-check path is the emulator-focused `x86_64` build, while Android Studio can still build the selected target ABI during normal local development.

## **3.3 Release Automation**

The repo now has baseline GitHub mobile verification CI in [.github/workflows/mobile-verify.yml](C:/Users/T/Desktop/StallPass/.github/workflows/mobile-verify.yml).

What still remains for full mobile CI/CD:

1. Main branch authenticated `eas build`
2. Release-tag authenticated `eas build` plus `eas submit`
3. Expo GitHub App / `EXPO_TOKEN` / project linkage for cloud automation

## **3.4 Device Verification Gap**

Maestro flow assets now exist under `e2e/maestro` for permission denial, map smoke, city packs, route search, offline/deep-link smoke, and emergency entry. These flows still need to be executed on real Android and iOS targets before release sign-off.

# **4. Architecture Contracts**

## **4.1 The Three Laws**

1. Pre-Flight: simulate the dependency graph before writing. Verify imports, downstream effects, and data contracts.
2. Native Purity: banned web primitives stay banned. Use `View`, `Text`, `AsyncStorage`, `Alert.alert()`, and navigation helpers.
3. Atomic: edit whole files only. No placeholder snippets.

## **4.2 Auth Contracts**

| Contract | Rule |
| :---- | :---- |
| Single client | Only [src/lib/supabase.ts](C:/Users/T/Desktop/StallPass/src/lib/supabase.ts) may create the client. |
| States | `BOOTSTRAPPING`, `GUEST`, `SESSION_RECOVERY`, `AUTHENTICATED_USER`, `AUTHENTICATED_BUSINESS`, `AUTHENTICATED_ADMIN`, `SESSION_INVALID` |
| Splash | Splash may hide only after the app exits `BOOTSTRAPPING`. |
| `refreshUser()` | Must demote to `GUEST` on any failure. |
| Guest intent replay | In-memory only through AuthContext. Do not persist it. |
| Direct redirects | Use navigation helpers, not ad hoc route string handling. |

## **4.3 Offline Contracts**

| Contract | Rule |
| :---- | :---- |
| Queue eligibility | Authenticated transient failures only |
| Persistence | Zod-validated on load |
| Scope | User-scoped |
| Retry cap | 3 retries max |
| Sleep / backoff | No in-loop sleep; replay is event-driven |
| Mutation outcome | `completed | auth_required | queued_retry` |

## **4.4 Supabase / RLS Contracts**

| Contract | Rule |
| :---- | :---- |
| Public bathroom reads | Must respect public views and RLS |
| `profiles.role` | Immutable from client; guarded in [002_functions.sql](C:/Users/T/Desktop/StallPass/supabase/migrations/002_functions.sql) |
| Client secrets | Never use service-role keys in client code |
| Auth replay storage | Do not recreate persisted return-intent storage |

# **5. Phase Status**

## **5.1 Completed**

| Phase | Status |
| :---- | :---- |
| Phase 1 | Complete |
| Phase 2 | Complete |
| Phase 3 | Complete |
| Phase 4 | Complete for business-web metadata controls and analytics foundations |
| Phase 5 | In progress: CI/docs/coverage assets added; device execution remains pending |

## **5.2 Current Reality**

Phase 4 is not "not started". The repo contains the core Phase 4 implementation for map, search, favorites, location, business-web verified restroom metadata controls, and analytics foundations.

What is true as of May 1, 2026:

1. The major Phase 4 screens and supporting hooks/components exist in code.
2. The repo passes `npm run lint`, `npm run type-check`, `npm test -- --runInBand`, `apps/business-web` typecheck, and `apps/business-web` lint.
3. Local Android native build verification now passes through the tracked Android Studio surface with `npm.cmd run android:prebuild` and `npm.cmd run android:assembleDebug:emulator`.
4. Baseline GitHub mobile verification CI now includes root tests, business-web checks, Expo config, Android prebuild drift, Android debug build, and Maestro flow inventory.
5. Authenticated EAS build and submit automation is still pending.

## **5.3 Do Not Reintroduce Old Assumptions**

The following old assumptions are now false and must not be copied back into status blocks:

1. "Phase 4 not started"
2. "Map/search/favorites are still scaffolds"
3. "Required packages are missing"
4. "Placeholder assets are missing"
5. "return-intent.ts is the replay mechanism"

# **6. Remaining Delivery Work**

## **6.1 Near-Term Safe Work**

These are safe to do next without forcing a stack upgrade:

1. Add authenticated EAS build and submit automation once Expo GitHub App / `EXPO_TOKEN` / project linkage are configured
2. Execute and harden the Maestro flows in `e2e/maestro` on Android and iOS targets
3. Verify [002_functions.sql](C:/Users/T/Desktop/StallPass/supabase/migrations/002_functions.sql) is applied in the target Supabase project
4. Add CI execution for Maestro once a device runner or Maestro Cloud credentials are configured
5. Replace temporary app art with final branded assets before store submission
6. Deploy `supabase/functions/admob-reward-ssv` with `--no-verify-jwt`, set `ADMOB_REWARDED_AD_UNIT_IDS` as a Supabase secret, and point the AdMob rewarded-unit SSV callback at the deployed function before enabling rewarded code reveals in production

## **6.2 Work That Needs Explicit Approval**

These are not safe "background fixes" and should be treated as deliberate tracks:

1. Additional Expo / React / React Native / Expo Router upgrades beyond the currently aligned stack
2. Any further dependency realignment that changes generated native code or routing behavior
3. Any architectural rewrite of AuthContext beyond targeted cleanup

## **6.3 Release Gaps Still Open**

| Area | Status |
| :---- | :---- |
| Android local build | Verified locally through Android Studio / emulator ABI debug build |
| Device validation | Maestro flow assets added; execution pending |
| CI/CD | Baseline GitHub verification plus business-web checks added; authenticated EAS build, EAS submit, and device-flow execution pending |
| Store metadata | Pending |
| Final art | Pending |
| Screen integration tests | Pending |

# **7. Builder Directive**

Use this exact block for future coding sessions:

SYSTEM: ACTIVATE [BUILDER_PRIME_MODE]
Project: StallPass (bathroom-finder, iOS + Android)
Repo: Tdub206/StallPass
Stack: React 19.1.0, React Native 0.81.5, Expo SDK 54, Expo Router v6, TypeScript strict, NativeWind v4, Supabase (PostgreSQL + PostGIS + Auth), TanStack Query v5, AsyncStorage
STATUS:
- Phase 1/2/3: complete.
- Phase 4 repo implementation exists for map, search, favorites, location, business-web verified metadata controls, and analytics foundations.
- May 1, 2026 verification in this workspace: `npm run lint`, `npm run type-check`, `npm test -- --runInBand`, `apps/business-web` typecheck, and `apps/business-web` lint all pass.
- Active blockers: device-level Maestro execution still pending, authenticated EAS build or submit automation pending, final store metadata and art still pending.
THE 3 LAWS:
1. Pre-Flight: simulate the full dependency graph before writing.
2. Native Purity: banned web primitives stay banned. Use React Native primitives and `Alert.alert()`.
3. Atomic: output complete files only.
KEY CONTRACTS:
- Single Supabase client only in `src/lib/supabase.ts`
- `refreshUser()` demotes to `GUEST` on any failure
- Guest-intent replay is in-memory only via AuthContext
- Offline queue is authenticated-only, Zod-validated, user-scoped, max 3 retries
- `MutationOutcome` is `completed | auth_required | queued_retry`
- `profiles.role` is immutable from client
- Splash hides only after exiting `BOOTSTRAPPING`
- This manifest is canonical
