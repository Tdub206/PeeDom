# Pee-Dom Launch Checklist

Target: Top 100 Utility on iOS App Store & Google Play

---

## 1. App Store Assets

### iOS (App Store Connect)
- [ ] App name: "Pee-Dom: Find Bathrooms Fast"
- [ ] Subtitle (30 chars): "Crowd-Sourced Restroom Finder"
- [ ] Keywords (100 chars): bathroom,restroom,finder,nearby,accessible,code,public,emergency,clean,toilet
- [ ] App icon (1024x1024 PNG, no alpha, no rounded corners)
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max), 6.5" (iPhone 11 Pro Max), 5.5" (iPhone 8 Plus)
  - [ ] Map view with pins
  - [ ] Emergency "Go Now" button in action
  - [ ] Bathroom detail with code + cleanliness rating
  - [ ] Search with filters
  - [ ] Accessibility features
  - [ ] Gamification profile with badges
- [ ] iPad screenshots (if universal): 12.9" (6th gen)
- [ ] App preview video (15-30 sec, optional but recommended)
- [ ] Privacy policy URL hosted and live
- [ ] Support URL live
- [ ] Age rating questionnaire completed
- [ ] App category: Utilities (primary), Navigation (secondary)

### Android (Google Play Console)
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots: phone (min 2), 7" tablet, 10" tablet
- [ ] Short description (80 chars): "Find the nearest bathroom instantly. Crowd-sourced codes & ratings."
- [ ] Full description (4000 chars max)
- [ ] Content rating questionnaire
- [ ] Data safety form completed
- [ ] Target API level >= 34 (Android 14)
- [ ] Privacy policy URL

---

## 2. Environment Variable Security

### Required Production Variables
- [ ] `EXPO_PUBLIC_SUPABASE_URL` - Production Supabase project URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Production anon key (NOT service role key)
- [ ] `EXPO_PUBLIC_SENTRY_DSN` - Production Sentry project DSN
- [ ] `EXPO_PUBLIC_ENV=production` - Environment flag

### Security Audit
- [ ] `.env` is listed in `.gitignore` (verified)
- [ ] `.env.example` has placeholder values only (verified)
- [ ] No service role keys in client code
- [ ] No API keys hardcoded in source (grep for patterns: `sk_`, `key_`, `secret`)
- [ ] `expo-secure-store` used for any sensitive user credentials
- [ ] Supabase RLS enabled on ALL tables (19 migrations verified)
- [ ] `assert_active_user()` guard on all mutation RPCs (migration 019 verified)
- [ ] AdMob app IDs switch to production values in `app.config.ts`
- [ ] Google Maps API key restricted to app bundle ID
- [ ] Sentry source maps uploaded but not publicly accessible

### EAS Build Secrets
- [ ] All production env vars set in EAS Secrets (not in eas.json)
- [ ] `eas.json` production profile uses `distribution: "store"`
- [ ] iOS provisioning profile + distribution certificate configured
- [ ] Android keystore configured for production signing

---

## 3. Error Logging & Monitoring

### Sentry Configuration
- [ ] `@sentry/react-native` initialized in `_layout.tsx` (verified)
- [ ] Production DSN is NOT the development DSN
- [ ] `tracesSampleRate` set to 0.1 for production (verified in `config.ts`)
- [ ] User context attached (ID, role, premium status)
- [ ] React Query errors forwarded to Sentry (verified in `query-client.ts`)
- [ ] Source maps uploaded via `@sentry/expo` plugin in EAS build
- [ ] Alert rules configured for: crash rate > 1%, new issue spike
- [ ] Release health tracking enabled

### Analytics
- [ ] Analytics endpoint configured for production
- [ ] `app_bootstrapped` event tracking verified
- [ ] `emergency_mode_activated` event tracking verified
- [ ] Key funnel events tracked: search, favorite, code_submit, code_reveal, report

---

## 4. Performance Benchmarks

### Startup
- [ ] Cold start to interactive map < 3 seconds on mid-range device
- [ ] Splash screen covers full bootstrap (fonts + auth + initial location)
- [ ] Offline launch shows cached data within 1 second

### Map
- [ ] Map renders 150 pins without jank (clustering enabled via react-native-map-clustering)
- [ ] Region change debounced at 300ms (verified in `useBathrooms.ts`)
- [ ] Emergency mode locates + navigates in < 5 seconds

### Network
- [ ] Supabase requests timeout at 15s (resilientFetch verified)
- [ ] Offline queue processes on reconnect (useOfflineSync verified)
- [ ] Realtime reconnects with exponential backoff (verified)
- [ ] React Query stale time: 5 min, GC time: 10 min (verified)

---

## 5. Offline & Edge Cases

- [ ] App launches without network and shows cached bathrooms
- [ ] Offline banner displayed when connection lost
- [ ] Mutations queue when offline and replay on reconnect
- [ ] Location permission denied shows graceful fallback
- [ ] Emergency mode handles no-location with clear user message
- [ ] Empty states for: no search results, no favorites, no bathrooms nearby
- [ ] Deactivated account detected and user signed out
- [ ] Deep links to bathroom detail handle deleted bathrooms

---

## 6. Accessibility Compliance

- [ ] All buttons have `accessibilityRole="button"` and `accessibilityLabel`
- [ ] Emergency button has descriptive accessibility label (verified)
- [ ] Screen reader announces map pin selection
- [ ] Contrast ratios meet WCAG AA (brand-600 on white, ink-900 on surface-base)
- [ ] Touch targets >= 44x44 points (emergency button: 64x64 verified)
- [ ] Accessibility mode filters work end-to-end
- [ ] VoiceOver (iOS) and TalkBack (Android) manual testing completed

---

## 7. Legal & Compliance

- [ ] Privacy policy covers: location data, email, push tokens, analytics
- [ ] Terms of service published
- [ ] GDPR: account deactivation deletes push subscriptions (verified in migration 017)
- [ ] CCPA: no personal data sold to third parties
- [ ] COPPA: age gate if app targets under 13 (not applicable for PeeDom)
- [ ] AdMob GDPR consent (UMP SDK) integrated for EU users
- [ ] Location usage description strings set in `app.config.ts`:
  - iOS: `NSLocationWhenInUseUsageDescription`
  - Android: `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION`

---

## 8. Pre-Submission Testing

### Device Matrix
- [ ] iPhone SE (3rd gen) - smallest screen
- [ ] iPhone 15 Pro - primary iOS target
- [ ] iPhone 15 Pro Max - largest screen
- [ ] Pixel 7a - mid-range Android
- [ ] Samsung Galaxy S24 - flagship Android
- [ ] Android Go device (1-2 GB RAM) - stress test

### Test Scenarios
- [ ] Fresh install → onboarding → map loads
- [ ] Sign up → submit bathroom → earn points → see badge
- [ ] Emergency "Go Now" → navigation launches
- [ ] Offline → queue mutations → reconnect → mutations process
- [ ] Background → foreground → realtime channels reconnect
- [ ] Search → filter → select result → view detail → favorite
- [ ] Code submit → code vote → code reveal via rewarded ad
- [ ] Business claim → verification badge appears
- [ ] Push notification received → tap → navigates to bathroom detail
- [ ] Rotate device → layout remains correct

---

## 9. App Store Review Preparation

### Common Rejection Reasons to Preempt
- [ ] Login is optional (guest browsing works)
- [ ] Location permission requested in context (not on first launch)
- [ ] Ad frequency is reasonable (rewarded ads only, user-initiated)
- [ ] No placeholder content in screenshots
- [ ] App description matches actual functionality
- [ ] In-app purchases (if any) described accurately

### Demo Account
- [ ] Create test account credentials for Apple reviewer
- [ ] Pre-populate account with: favorites, badges, submitted codes
- [ ] Document in App Store review notes

---

## 10. Launch Day

- [ ] Production Supabase database seeded with initial bathroom data
- [ ] Sentry alerts configured and on-call rotation set
- [ ] EAS production build submitted to both stores
- [ ] App Store review initiated (allow 24-48 hrs)
- [ ] Social media launch post prepared
- [ ] App Store Optimization: first-week keyword monitoring
- [ ] Crash-free rate target: > 99.5% in first 48 hours
