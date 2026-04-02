# StallPass Play Store Review

Date: 2026-03-26

## Findings

### P0 - Production build secrets are mandatory before release review

The repo now fails closed for production Expo config and Android release signing, which is correct for release discipline, but it means Google Play submission is blocked until these values exist in EAS or your CI environment:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EAS_PROJECT_ID`
- `ANDROID_GOOGLE_MAPS_API_KEY`
- `IOS_GOOGLE_MAPS_API_KEY`
- `ANDROID_ADMOB_APP_ID`
- `IOS_ADMOB_APP_ID`
- `EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID`
- `ANDROID_RELEASE_STORE_FILE`
- `ANDROID_RELEASE_STORE_PASSWORD`
- `ANDROID_RELEASE_KEY_ALIAS`
- `ANDROID_RELEASE_KEY_PASSWORD`

Relevant files:
- `app.config.ts`
- `android/app/build.gradle`
- `eas.json`

### P1 - Play Console declarations still need manual completion

Google Play's App content page still requires manual entries for:

- Privacy policy URL
- Ads declaration
- App access instructions for restricted features
- Data safety
- Content rating
- Target audience and content

Relevant official reference:
- https://support.google.com/googleplay/android-developer/answer/9859455?hl=en

### P1 - The app should be declared as containing ads

The app includes AdMob-backed rewarded ad flows for code reveal. The Play Console ads declaration should be `Yes`.

Relevant files:
- `src/lib/admob.ts`
- `src/hooks/useRewardedCodeUnlock.ts`
- `app/bathroom/[id].tsx`

### P2 - Public support surfaces exist but must be live on the final domain

The repo now contains the required Play-facing pages:

- `web/privacy/index.html`
- `web/terms/index.html`
- `web/support/index.html`

Those URLs still need to be deployed and reachable under `stallpass.org` before review.

### P2 - Reviewer access instructions should mention guest mode first

The app supports guest browsing, which is good for Play review. Any restricted flows such as favorites, submissions, business claims, or admin screens should be described explicitly in Play Console App access so review does not stall on gated flows.

Relevant files:
- `src/contexts/AuthContext.tsx`
- `app/(tabs)/profile.tsx`
- `app/(tabs)/favorites.tsx`

## Positives

- Target SDK coverage is sufficient from the inspected Android build state.
- Privacy policy, terms, and support pages now exist in the codebase.
- The production EAS profile is explicitly configured for store distribution.
- Release signing no longer silently falls back to the debug keystore.
- Public branding, package IDs, and deep-link scheme are aligned to StallPass.

## Recommended Play Console Inputs

- Privacy policy URL:
  `https://stallpass.org/privacy/`
- Support URL:
  `https://stallpass.org/support/`
- Contains ads:
  `Yes`
- App access:
  `Guest browsing is available for the core map and search experience. Account sign-in is required only for favorites, contributions, and business-management features. If review needs a signed-in account, provide credentials in the access instructions field.`

## Final Play Readiness Summary

The codebase is materially closer to Google Play submission, but it is not fully review-ready until production credentials are configured, the `stallpass.org` support surfaces are deployed, and the Play Console declarations are completed from the actual production build.
