## Pee-Dom Launch-Readiness Report

---

## BLOCKERS

### B-1: `android/app/build.gradle` — Corrupted file (line 102)
**Line 102** reads `storeFile file('debug.keystore')8jy6666...` followed by thousands of garbage characters. Gradle cannot parse this file. **Android build fails unconditionally.**

### B-2: Release signing uses debug keystore
```groovy
release {
    signingConfig signingConfigs.debug  // line ~108
}
```
Even if you fix the corruption, publishing to Google Play with a debug keystore will be **rejected by the Play Store**. A production keystore must be created and referenced.

---

## HIGH-RISK ITEMS

### H-1: `CODE_NOT_AVAILABLE` not in client error map
`migration 018` introduces `vote_on_code` which raises a `CODE_NOT_AVAILABLE` exception. `src/utils/errorMap.ts` does not contain this key. The RPC error bubbles to the user as a generic "Something went wrong" toast instead of an actionable message (e.g., "This code is no longer available"). Low likelihood but bad UX when hit.

### H-2: `favoriteIdsQuerySchema` hard cap at 200
`src/lib/validators/favorites.ts`:
```ts
bathroomIds: z.array(z.string()).max(200)
```
Any user with >200 favorites whose IDs are passed in a single batch will throw a `ZodError`. The batch size is controlled by viewport-visible IDs passed from `useFavorites`. Power users will hit this. Needs either pagination or a raised/removed cap with server-side enforcement.

### H-3: `deactivate_account` does not revoke existing JWTs
`migration 017`'s `deactivate_account()` RPC sets `is_deactivated = true` and clears push tokens, but **does not call `auth.sign_out()`** or revoke the calling session. Other active devices retain valid JWTs. Until those tokens expire, deactivated users can still write to the database (the RPCs check `is_deactivated` — but only RPCs added in 017/018; older RLS-based paths are unprotected). **Fix**: call `auth.sign_out()` or use a Supabase Edge Function to revoke all sessions via the Admin API.

### H-4: Optimistic toggle state not replayed on reconnect
`useFavoritesStore` does not persist `optimisticToggles`. If the app is backgrounded during an offline toggle, the UI reverts to stale `favoritedIds` on next launch. The offline queue will replay the mutation, but there's a window between app launch and queue flush where the heart icon shows the wrong state. Needs either persisting `optimisticToggles` or seeding them from the queue on startup.

---

## MEDIUM-RISK ITEMS

### M-1: Google Maps API key silently falls back to empty string
`_preflight/app.config.ts` (and `app.json`):
```ts
googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? ''
```
If the env var is absent in EAS, the Maps SDK initializes with an empty key. On Android this silently shows a grey tile map; on iOS the key validation is stricter and may crash. Should `throw` at config time if missing in non-dev builds.

### M-2: EAS Project ID falls back to empty string
```ts
projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? ''
```
OTA updates and push notifications require a valid project ID. Silent fallback means failed pushes with no build-time warning. Should assert presence in production.

### M-3: `useBathroomDetail` refetches on every focus
`useBathroomDetail` has `staleTime: 60_000` but `app/bathroom/[id].tsx` calls `useFocusEffect` → `queryClient.invalidateQueries(bathroomDetailQueryKey)` on every screen focus. `invalidateQueries` bypasses `staleTime`, so every back-navigation triggers a network request. This is minor but wastes bandwidth and causes a brief loading flash on the detail screen. Consider `refetchOnWindowFocus: false` or checking `dataUpdatedAt` before invalidating.

### M-4: `update_display_name` rate-limit error is opaque
The RPC returns `{success: false, error: 'rate_limited'}` as a JSON payload (not a Postgres error). The calling hook in `useProfileSettings` must explicitly surface this as "You can only change your display name once per 24 hours." Verify the UI string is present — if the hook only checks `success === false` without reading `error`, the user sees a generic failure.

### M-5: Realtime channel not cleaned up on auth state change mid-session
`useRealtimeFavorites` subscribes to `favorites` filtered by `userId`. If the auth state changes (e.g., token refresh results in a new user object with same `sub`), the channel key does not change but the filter might drift. The `useEffect` dep array uses `userId` — this is safe for full sign-out/in cycles, but rapid token-refresh scenarios that emit `SIGNED_IN` events could cause a double-subscribe before the cleanup fires. Low probability but worth a `console.warn` guard.

### M-6: No Sentry release tagging in EAS config
Sentry captures errors but `app.json` does not configure `sentry.release` or `sentry.dist`. Without these, crash reports in Sentry cannot be correlated to a specific EAS build/OTA update. Add `@sentry/react-native`'s EAS plugin or manually set `release` in `Sentry.init`.

### M-7: AdMob test IDs in non-production code paths
`ADMOB_ANDROID_APP_ID` and ad unit IDs fall back to Google's test IDs (`ca-app-pub-3940256099942544/...`). If `APP_ENV !== 'production'` check is missing or mis-keyed, test ads ship to production — Play Store policy violation. Verify the guard is airtight.

---

## RECOMMENDED FIXES

| Priority | Fix |
|---|---|
| **B-1** | Re-generate `android/app/build.gradle` from template. The file is non-recoverable from the corruption — regenerate with `npx expo prebuild --clean` on a clean checkout. |
| **B-2** | Create a production keystore: `keytool -genkey -v -keystore release.jks ...`. Store in EAS Credentials. Update `signingConfigs.release` to reference it (via env vars, not hardcoded path). |
| **H-1** | Add `CODE_NOT_AVAILABLE: 'This access code is no longer available.'` to `src/utils/errorMap.ts`. |
| **H-2** | Raise or remove the Zod max (move enforcement server-side). The RPC already paginates — the client validator is redundant and dangerous. |
| **H-3** | After `deactivate_account()` succeeds, call the Supabase Admin API (`POST /auth/v1/admin/users/{uid}/logout`) from an Edge Function triggered by the RPC, or use a database webhook. |
| **H-4** | On `useFavorites` mount, seed `optimisticToggles` from pending offline queue entries with `action: 'toggle'`. |
| **M-1/M-2** | In `app.config.ts`, add a build-time guard for production: `if (process.env.APP_ENV === 'production' && !process.env.GOOGLE_MAPS_API_KEY) throw new Error(...)` |
| **M-6** | Add `sentry-expo` EAS plugin config with `release` and `dist` properties tied to `expo.version` and build number. |

---

## FINAL READINESS SUMMARY

**Not ready to ship.**

| Area | Status |
|---|---|
| Android build | **BLOCKED** — `build.gradle` is corrupted and cannot compile |
| Play Store signing | **BLOCKED** — release keystore is `debug.keystore` |
| Auth / session | Mostly solid. Sign-out chain is non-fatal and complete. Deactivation has a JWT-revocation gap (high risk, not a crash) |
| Offline handling | Queue, flush, and clear are all wired correctly. Optimistic state post-restart has a visible flicker window |
| RLS / write safety | All community writes are behind SECURITY DEFINER RPCs. `CODE_NOT_AVAILABLE` error is unhandled client-side |
| Realtime | Reference counting is correct. No premature teardown. Minor double-subscribe edge case on token refresh |
| Loading/error states | Generally present. Rate-limit copy for display name needs verification |
| App store compliance | AdMob test ID guard needs verification; Sentry release tagging missing |
| iOS | No iOS-specific blockers found in reviewed code |

**Fix B-1 and B-2 first** — nothing else matters until Android builds. After that, H-1 through H-4 before any store submission. Medium items can be addressed in a fast-follow release.
(isProduction ? '' : testAndroidAdMobAppId);
```

In production (`isProduction = true`), if `ANDROID_ADMOB_APP_ID` is blank, `androidAdMobAppId` becomes `''`. The `googleMobileAdsConfig` guard then excludes the AdMob plugin entirely — the rewarded ad unlock UI will render but calling `unlockWithAd()` will fail silently or crash the ad SDK. Verify production AdMob app IDs are set before release.

---

### M6 — `deactivate_account` does not revoke the Supabase session server-side

**File:** `supabase/migrations/017_profile_account_hardening.sql`

The `deactivate_account` RPC sets `is_deactivated = true` and clears the push token, but does **not** invalidate the Supabase JWT or call `auth.admin.signOut()`. The client handles sign-out afterward, but if the client call fails (crash, background kill), the JWT remains valid until it expires. A re-opened app will call `loadProfile`, detect `is_deactivated: true` in `handleDeactivatedProfile`, and properly demote the session — so the recovery path is covered, but the JWT is live until natural expiry.

**Fix:** Consider calling `auth.admin.deleteUser(v_user_id)` or using a Supabase Edge Function to revoke the token server-side, especially if deactivation is intended to be permanent and immediate.

---

## RECOMMENDED FIXES (PRIORITY ORDER)

| # | File | Fix |
|---|------|-----|
| 1 | `android/app/build.gradle:102` | Remove garbage characters from `storeFile` line |
| 2 | `android/app/build.gradle` | Configure production release signing (EAS keystore) |
| 3 | Production Supabase | Run `supabase db push` for migrations 016/017/018 and smoke-test each RPC |
| 4 | `src/hooks/useProfileAccount.ts:34` | Verify `offlineQueue.clear()` exists or switch to `clearForUser` |
| 5 | `.env.production` | Set `ANDROID_GOOGLE_MAPS_API_KEY`, `IOS_GOOGLE_MAPS_API_KEY`, `EXPO_PUBLIC_SENTRY_DSN` |
| 6 | `src/hooks/useFavorites.ts:185` | Add `resolvedBathroomIds` to `partialize`, or accept the round-trip with documented tradeoff |
| 7 | `src/api/favorites.ts` (useFavoriteDirectory) | Coerce `sortBy` → `date_added` when `origin` is null and persisted sort is `distance` |
| 8 | `app/bathroom/[id].tsx:259` | Replace `refetchBathroomDetail()` in `useFocusEffect` with `invalidateQueries` to respect staleTime |
| 9 | EAS project settings | Set `EAS_PROJECT_ID`, `ANDROID_ADMOB_APP_ID`, `IOS_ADMOB_APP_ID` before first store build |

---

## RELEASE CONFIDENCE SUMMARY

| Area | Status | Notes |
|------|--------|-------|
| Auth / session | ✅ Solid | Bootstrap, refresh, deactivation, and demotion paths are all covered. Rate-limit and error code normalization is consistent. |
| Offline handling | ✅ Solid | Queue scoping, retry semantics, auth-required stop, user_id mismatch skip — all implemented correctly. Flush orchestrator is well-structured. |
| Favorites surface | ⚠️ Conditional | Works correctly assuming migrations 016 are applied. Fallback chain (new RPC → legacy RPC → table) is sound. First-tap round-trip is a UX concern. |
| Community writes | ⚠️ Conditional | All writes moved behind SECURITY DEFINER RPCs in 018. If migration is applied, the app is more secure. If not, writes are broken. |
| Profile/account | ✅ Solid | Display name validation runs client + server. Deactivation double-confirmation with server-side state is correct. |
| Realtime | ✅ Solid | `clearChannels` / `destroy` split is correct. Favorites realtime clears optimistic state on confirmation. |
| Android build | ❌ Blocked | `build.gradle` corruption and debug-keystore release signing are both blockers. |
| iOS build | ✅ No issues found | App config, permissions, and bundle ID are correctly set. |
| Loading / error states | ✅ Solid | Every data-dependent screen handles loading, error, and empty consistently. |
| Maps / location | ⚠️ At risk | Map API keys are almost certainly blank in production config. |
| Telemetry | ⚠️ At risk | Sentry DSN likely not configured. No crash visibility in production. |
| App store compliance | ⚠️ Conditional | iOS: looks compliant. Android: release signing and Play Store setup needed. |

**Overall readiness: NOT READY TO SHIP.**

Fix the two Android build blockers (B1, B2), confirm the three migrations are applied to production (B3), verify the Google Maps keys and Sentry DSN are set, and the app is in a shippable state. All core flows — auth, favorites, offline sync, community writes, and account management — are architecturally sound.
e_bathroom_report` 6 times rapidly — confirm rate limit triggers (migration 018)

### Configuration

- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set in `.env.production` — app starts without config error screen
- [ ] Run `expo build --platform android` with `EXPO_PUBLIC_ENV=production` and `ANDROID_ADMOB_APP_ID` unset — confirm build throws error (not silent)
- [ ] Run same build with `ANDROID_ADMOB_APP_ID` set — confirm build succeeds

### EAS (Pre-Submission Gate)

- [ ] `eas build --platform android --profile preview` succeeds
- [ ] APK installs and launches on a physical Android device from EAS artifact
- [ ] `eas build --platform ios --profile preview` succeeds (requires Apple credentials)

---

**Status after this plan is executed:** All critical blockers resolved. Profile tab feature-complete. Offline, auth, and realtime layers hardened. Ready for TestFlight / internal track submission.
