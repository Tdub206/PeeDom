# StallPass Store Privacy Submission Worksheet

Date: April 5, 2026

This worksheet translates the current StallPass production repo state into a submission-ready privacy inventory for Apple and Google store metadata.

## Launch Assumptions

- Current production env keeps `EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED=false`.
- Current production env does not set `EXPO_PUBLIC_ANALYTICS_ENABLED`, so the separate analytics ingestion endpoint is disabled.
- Paid premium purchases are not launching in the current release.
- Sentry crash reporting is enabled in production.
- Guest browsing is available, but account-bound features still collect account data when a user signs in.

If any of those assumptions change, update this worksheet before shipping the new build.

## Public URLs To Publish

Deploy these pages under your production domain and use the final absolute URLs in the store consoles:

- Support URL: `/support/`
- Privacy Policy URL: `/privacy/`
- User Privacy Choices URL: `/privacy-choices/`
- Terms URL: `/terms/`

## High-Confidence Data Inventory

These data types are clearly present in the active app code or production config:

- Account info: email address, display name, account role, account status, and Supabase auth account ID.
- Location: latitude and longitude when the user grants foreground location permission.
- User-generated content: bathroom submissions, access codes, ratings, reports, accessibility updates, business claims, and optional bathroom photos.
- Push notification registration: Expo push token and notification preferences.
- Diagnostics: Sentry crash and error telemetry in production.
- Local-only storage: cached bathrooms, favorites, drafts, search history, terms/onboarding flags, and offline queue state.

These features are not active in the current production release:

- Paid premium purchases and receipt verification.
- Rewarded ads.
- Separate behavioral analytics ingestion endpoint.

## Google Play Data Safety Starting Answers

Manual completion in Play Console is still required, but this is the recommended starting position for the current production release.

### Global Questions

- Does the app collect or share any of the required user data types?
  - Yes. The app collects account data, location, optional photos, push-registration data, and crash diagnostics.
- Is all user data encrypted in transit?
  - Yes.
- Can users request that their data be deleted?
  - Yes. The app includes in-app deletion and export controls, and the public privacy choices page gives support instructions.

### Data Types To Review In The Form

Use this as the initial checklist when answering the Play form:

| Data type | Present now | Required or optional | Primary purpose |
| --- | --- | --- | --- |
| Name (display name) | Yes | Optional for guest mode, required for signed-in account experience | Account management, app functionality |
| Email address | Yes | Required for signed-in account experience | Account management |
| User IDs / account identifiers | Yes | Required for signed-in account experience | Account management, app functionality |
| Approximate location | Yes | Optional | App functionality |
| Precise location | Yes | Optional | App functionality |
| Photos | Yes | Optional | App functionality, user-generated content |
| Device or other IDs (push token / installation identifier class) | Yes | Optional | App functionality |
| Crash logs / diagnostics | Yes | Automatic in production | App functionality, diagnostics |

Do not declare rewarded ads, purchase history, payment info, or behavioral analytics for the current production build unless you turn those features on before release.

## App Store Connect App Privacy Starting Answers

Manual completion in App Store Connect is still required, but this is the recommended starting position for the current production release.

### Tracking

- Data is not currently used for cross-app tracking.
- The current production release should not require App Tracking Transparency for the launch posture described above.

### Recommended Collected Data Review List

| Apple data type family | Recommended disclosure target | Why |
| --- | --- | --- |
| Contact Info | Email Address | Account registration and sign-in |
| Contact Info | Name | Display name on the StallPass profile |
| Location | Precise Location | Nearby search, emergency mode, map relevance |
| User Content | Photos or Videos | Optional bathroom photo uploads |
| User Content | Other User Content | Submissions, ratings, reports, claims, and related content |
| Identifiers | User ID | Authenticated account identity |
| Diagnostics | Crash Data | Sentry production crash reporting |

If App Store Connect prompts you to classify push tokens under device identifiers in your final metadata flow, include that disclosure before submission.

## Future Toggle Checklist

Update this worksheet before release if any of the following become true:

- `EXPO_PUBLIC_ADMOB_CODE_REVEAL_ENABLED=true`
- `EXPO_PUBLIC_ANALYTICS_ENABLED=true`
- Paid premium purchases or receipt verification ship
- A third-party ad, analytics, or attribution SDK is added

Those changes would likely require new Apple and Google privacy answers.

## Official References

- Google Play Data safety documentation: <https://support.google.com/googleplay/android-developer/answer/10787469?hl=en>
- Apple App Privacy details overview: <https://developer.apple.com/app-store/app-privacy-details/>
