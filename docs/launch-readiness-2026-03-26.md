# StallPass Launch Readiness Audit

Date: 2026-03-26

## Assumptions

- Branding, package identifiers, and deep-link scheme ship as `StallPass`.
- iOS launch uses non-personalized rewarded ads and does not rely on an App Tracking Transparency prompt.
- Testing constraints for emulators and device matrices are intentionally excluded for now.
- The imported asset bundle in `assets/store/` is the approved source of truth for current store graphics.

## Status

StallPass is materially closer to submission, but store-console work and production credentials still block final release.

### Repo-verified strengths

- Guest access exists and is enforced in the auth layer and gated screens.
- In-app account deactivation and permanent deletion are implemented from the profile flow.
- Rewarded AdMob code unlocks, offline sync behavior, Sentry wiring, and public support, privacy, and terms surfaces all exist in the codebase.
- The website now includes a real business-facing dashboard instead of only a marketing landing page.
- The current Android debug merged manifest resolves to `targetSdkVersion 36`, which is above Google Play's current minimum target SDK requirement.
- `app.config.ts` now uses the final `stallpass` slug and scheme plus `com.stallpass.app` identifiers for both iOS and Android.
- Production EAS configuration is explicit about store distribution, and Android release signing now fails closed if release credentials are missing.

### Current launch blockers

1. Store disclosure work is still manual.
   Apple App Privacy answers and Google Play Data safety, ads, app access, and content declarations still need to be completed in the store consoles from actual production behavior.
2. Production build credentials are not present in the repo.
   The build now requires production Supabase, Sentry, Maps, AdMob, EAS, and Android signing inputs before a production artifact can be generated.
3. Production operational details are not verified from source control.
   The hosted `stallpass.org` domain, reachable support mailbox, reviewer notes, and console-side release setup still need human verification.
4. Signed release artifact verification is still pending.
   A signed Android app bundle and final release manifest still need to be built and checked before submission.

### Resolved repo-side issues

- iOS ATT risk was reduced by removing the tracking-usage path from app config and forcing rewarded ads on iOS into a non-personalized request path.
- The previously mixed `Pee-Dom` and `StallPass` public branding has been normalized to `StallPass`.
- Store-facing contact details now use `support@stallpass.org`.
- Android release signing no longer defaults silently to the debug keystore for release tasks.

## Files Added Or Updated

### Website and hosted submission surfaces

- `web/index.html`
- `web/404.html`
- `web/business/index.html`
- `web/privacy/index.html`
- `web/terms/index.html`
- `web/support/index.html`
- `web/assets/site.css`
- `web/assets/site.js`
- `web/assets/business.css`
- `web/assets/business.js`
- `web/site.webmanifest`

### Store asset placement

- `assets/store/`
- `assets/icon.png`
- `assets/notification-icon.png`
- `assets/adaptive-icon-background.png`
- `web/assets/pwa-icon-192.png`
- `web/assets/pwa-icon-512.png`
- `web/assets/open-graph-social-preview.png`

### Release-hardening updates

- `app.config.ts`
  Enforces required production build inputs and removes the ATT-shaped tracking usage string for the launch strategy.
- `src/lib/admob.ts`
  Forces iOS rewarded ads to request non-personalized ads only.
- `android/app/build.gradle`
  Requires real Android release signing credentials for release tasks instead of silently shipping the debug keystore.
- `eas.json`
  Marks the production profile as `distribution: "store"`.

## Asset Upload Map

- App Store Connect 6.7-inch screenshots:
  `assets/store/ios/iphone_6.7/`
- App Store Connect 6.5-inch screenshots:
  `assets/store/ios/iphone_6.5/`
- Google Play phone screenshots:
  `assets/store/android/screenshots/`
- Google Play feature graphic:
  `assets/store/android/graphics/google_play_feature_graphic_1024x500.png`
- Promotional banner:
  `assets/store/additional/app_store_promotional_banner_1024x500.png`
- Open Graph preview:
  `web/assets/open-graph-social-preview.png`

## Repo-Backed Evidence

- Guest mode:
  `src/contexts/AuthContext.tsx`
  `app/(tabs)/profile.tsx`
  `app/(tabs)/favorites.tsx`
- Account deactivation and deletion:
  `app/(tabs)/profile.tsx`
  `src/hooks/useProfileAccount.ts`
  `src/api/profile.ts`
- Rewarded ads and AdMob:
  `src/lib/admob.ts`
  `src/hooks/useRewardedCodeUnlock.ts`
  `app/bathroom/[id].tsx`
- Business dashboard in-app:
  `app/(tabs)/business.tsx`
  `src/hooks/useBusiness.ts`
  `src/api/business.ts`
- Offline and retry infrastructure:
  `src/hooks/useOfflineSync.ts`
  `src/lib/query-client.ts`
- Error telemetry:
  `src/lib/sentry.ts`
  `app/_layout.tsx`

## Required Next Actions Before Submission

1. Complete App Store Connect and Play Console declarations using the real production configuration.
2. Set production environment variables and Android release signing credentials in your build system.
3. Verify that `https://stallpass.org/privacy/`, `https://stallpass.org/terms/`, and `https://stallpass.org/support/` are live and reachable.
4. Build a signed Android app bundle and verify final manifest permissions from the release output.
5. Prepare reviewer notes and any optional reviewer account details for restricted flows.

## External Requirements Checked

- Google Play target API policy:
  https://developer.android.com/google/play/requirements/target-sdk
  As of the currently published policy, new apps and updates must target Android 15 (API level 35) or higher by August 31, 2025.
- Google Play review preparation:
  https://support.google.com/googleplay/android-developer/answer/9859455?hl=en
  Apps with ads must declare ads, apps with restricted content must provide app-access instructions, and privacy policies must be linked from an active URL.
- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
  Guideline 5.1.1(v) requires account deletion within the app when account creation is supported.
- Apple App Privacy details:
  https://developer.apple.com/app-store/app-privacy-details/
  Privacy Nutrition Labels and third-party SDK/privacy-manifest disclosures still need store-console completion.
