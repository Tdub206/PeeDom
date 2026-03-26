# StallPass Launch Readiness Audit

Date: 2026-03-26

## Assumptions

- Branding should ship as `StallPass` for store-facing and public-facing surfaces, even though the internal Expo slug, deep-link scheme, and package IDs still use `peedom`.
- Testing constraints for emulators and device matrices are intentionally excluded for now.
- The imported asset bundle in `assets/store/` is the approved source of truth for current store graphics.

## Status

StallPass is materially closer to submission, but it is not fully ready for App Store Connect or Google Play release today.

### Repo-verified strengths

- Guest access exists and is enforced in the auth layer and gated screens, which aligns with Apple guidance not to require login when significant account-based features are not required.
- In-app account deactivation and permanent deletion are implemented from the profile flow.
- Rewarded AdMob code unlocks, offline sync behavior, Sentry wiring, and public support/privacy/terms surfaces all exist in the codebase.
- The website now includes a real business-facing dashboard instead of only a marketing landing page.
- The current Android debug merged manifest resolves to `targetSdkVersion 36`, which is above Google Play's current minimum target SDK requirement.

### Launch blockers

1. iOS tracking and ad consent flow is incomplete.
   The app config declares AdMob and a tracking usage description in `app.config.ts`, and rewarded ads are implemented in `src/lib/admob.ts`, but no App Tracking Transparency request flow was found in `app/` or `src/`. If you intend to track users or use identifiers for advertising on iOS, this needs a real ATT decision path before submission.
2. Store disclosure work is still manual.
   Apple App Privacy answers and Google Play Data safety and app access forms still need to be completed from actual production behavior, not inferred from code alone.
3. Brand and package identity is still mixed.
   Public copy now says `StallPass`, but internal identifiers still use `peedom-mobile`, `scheme: 'peedom'`, `com.peedom.mobile`, and related package naming. That is not an automatic rejection, but it should be intentional before launch.
4. Production operational details are not verified from the repo.
   Support mailboxes, production env vars, release signing, store console metadata, and reviewer credentials are not confirmable from source control and remain required launch tasks.

### Medium-risk items

- Release-build Android permission verification is still advisable even though `app.config.ts` blocks `SYSTEM_ALERT_WINDOW`. The inspected merged manifest was from a debug build, not a signed store artifact.
- The website now references `privacy@stallpass.app` and `support@stallpass.app`; those addresses and the hosting domain need to exist before store review.

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

These files close the missing public surfaces for privacy policy, terms, support, and a browser-based business dashboard with persistent preferences and setup-state controls.

### Store asset placement

- `assets/store/`
  Full imported archive for App Store Connect and Google Play uploads.
- `assets/icon.png`
  Replaced with the supplied 1024px StallPass app icon.
- `assets/notification-icon.png`
  Added from the supplied Android notification icon export.
- `assets/adaptive-icon-background.png`
  Added from the supplied adaptive icon background export.
- `web/assets/pwa-icon-192.png`
- `web/assets/pwa-icon-512.png`
- `web/assets/open-graph-social-preview.png`

### Runtime and public asset wiring

- `app.config.ts`
  Updated to use the imported notification icon and adaptive icon background.
- `web/index.html`
- `web/business/index.html`
- `web/privacy/index.html`
- `web/terms/index.html`
- `web/support/index.html`
- `web/404.html`

These pages now reference the imported Open Graph image, PWA icons, and web manifest.

### Brand cleanup

User-facing naming was normalized from `Pee-Dom` to `StallPass` across auth, favorites, legal, error, loading, notifications, and profile-related app copy.

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

1. Decide whether iOS ads are contextual-only or require ATT, then implement the correct path before requesting ad-driven tracking.
2. Finish App Privacy and Play Data safety answers from actual production data flow and third-party SDK behavior.
3. Decide whether `peedom` identifiers stay internal for v1 or whether bundle/package/scheme renaming is worth doing before launch.
4. Verify the hosted website domain, support mailbox, and privacy mailbox are live and reachable.
5. Build a signed Android release artifact and verify final manifest permissions from the release output, not debug output.

## External Requirements Checked

- Google Play target API policy:
  https://developer.android.com/google/play/requirements/target-sdk
  As of the currently published policy, new apps and updates must target Android 15 (API level 35) or higher by August 31, 2025.
- Apple App Review Guidelines:
  https://developer.apple.com/app-store/review/guidelines/
  Guideline 5.1.1(v) requires account deletion within the app when account creation is supported.
- Apple App Privacy details:
  https://developer.apple.com/app-store/app-privacy-details/
  Privacy Nutrition Labels and third-party SDK/privacy-manifest disclosures still need store-console completion.
- Apple App Tracking Transparency:
  https://developer.apple.com/documentation/apptrackingtransparency
  If tracking is used for advertising or measurement across apps or websites, the app needs the proper ATT flow and disclosures.
