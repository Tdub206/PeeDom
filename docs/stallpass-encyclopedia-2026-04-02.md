# StallPass Application Encyclopedia

> Compiled 2026-04-02 from 26 development conversations between the project owner
> and Claude/Codex agents, cross-referenced against the current `feature/full-build`
> codebase (commit `116b608`).

---

## 1. Product Identity

| Field | Value |
|---|---|
| Public name | **StallPass** |
| Internal/repo name | PeeDom (Pee-Dom) |
| Purpose | Crowdsourced restroom/bathroom finder for iOS and Android |
| Domain | stallpass.org |
| Bundle ID | `com.stallpass.app` (iOS + Android) |
| Deep link scheme | `stallpass` |
| EAS project | `@stallpass/stallpass` / `9277c80b-8194-4229-8054-f5c6f70a8cbe` |
| GitHub | `Tdub206/StallPass` |
| Primary branch | `feature/full-build` |
| Production target | `main` |

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React Native via Expo (Managed Workflow) | SDK 54 |
| Navigation | Expo Router (file-based routing) | v6 |
| Language | TypeScript (strict, no `any`) | 5.8 |
| Backend | Supabase (PostgreSQL + PostGIS + Auth + RLS + Edge Functions + Storage) | -- |
| Client state | Zustand | 5.x |
| Server state | TanStack React Query | v5 |
| Styling | NativeWind (Tailwind CSS for RN) | v4 |
| Validation | Zod | 3.24 |
| Crash reporting | @sentry/react-native | 7.x |
| Network info | @react-native-community/netinfo | 11.4 |
| Maps | react-native-maps + react-native-map-clustering | 1.20 / 4.0 |
| Bottom sheets | @gorhom/bottom-sheet | 5.2 |
| Ads | react-native-google-mobile-ads (AdMob) | 16.2 |
| Animation | react-native-reanimated + react-native-worklets | 4.1 / 0.5 |
| Notifications | expo-notifications | 0.32 |
| Secure storage | expo-secure-store | 15.0 |
| Build/deploy | EAS Build + EAS Submit | -- |
| CI | GitHub Actions | -- |
| Web hosting | Firebase Hosting (static) | -- |
| Testing | Jest + ts-jest | 29.7 |

---

## 3. Architecture Decisions

### 3.1 Auth System
- **State machine**: `BOOTSTRAPPING > GUEST | SESSION_RECOVERY > AUTHENTICATED_USER | BUSINESS | ADMIN | SESSION_INVALID`
- **Single Supabase client**: `src/lib/supabase.ts` -- lazy, fail-closed
- **Guest-intent replay**: In-memory via `AuthContext.requireAuth()` with TTL-persisted return intent (`src/lib/return-intent.ts`)
- **`refreshUser()` contract**: Must demote to GUEST on any failure (including offline), must NOT delete offline queue
- **`profiles.role` immutability**: Enforced via RLS check policy
- **SplashScreen**: Hides only after `sessionStatus !== BOOTSTRAPPING`
- Conversations discussed decomposing AuthContext into `AuthService` singleton + `useAuthStore` (Zustand) + thin `AuthProvider` -- this decomposition was **planned but not shipped**; current codebase retains the monolithic `AuthContext.tsx`

### 3.2 Offline Architecture
- **Offline queue** (`src/lib/offline-queue.ts`): Authenticated transient failures only
- **User-scoped**: Storage keyed `@peedom/offline_queue:<user_id>`
- **Zod-validated on load**; max 3 retries
- **MutationOutcome**: `'completed' | 'auth_required' | 'queued_retry'`
- **Flush triggers**: auth_restore, re_auth, network_reconnect, app_foreground
- **NetInfo -> TanStack onlineManager**: Queries auto-pause offline, auto-resume on reconnect

### 3.3 Data Layer
- No separate backend API -- Supabase-first with typed client wrappers in `src/api/*`
- Postgres RPCs/views for server logic; Edge Functions for side effects only
- All forms validated with Zod schemas (`src/utils/validate.ts`, `src/lib/validators/`)
- React Query for all data fetching (no imperative fetches)

### 3.4 Build & Config
- `app.config.ts` is canonical config (not `app.json`)
- iOS ads: non-personalized only (avoids ATT prompt)
- Android release: fail-closed without real signing secrets + Maps API key guard
- Env vars: `EXPO_PUBLIC_*` prefix for client-visible; secrets in EAS Secrets

---

## 4. Feature Encyclopedia

### 4.1 Map & Location

| Feature | Description | Key Files |
|---|---|---|
| **Interactive map** | Google Maps with bathroom markers, region-based PostGIS queries | `app/(tabs)/index.tsx`, `src/components/MapView.tsx` |
| **Map clustering** | Pin clustering via react-native-map-clustering | `src/components/MapView.tsx` |
| **Color-coded pins** | Green (open+unlocked), yellow (locked, code available), red (locked, no code), grey (unverified) | `src/utils/bathroom.ts` |
| **Location context** | Centralized device location + permission handling | `src/contexts/LocationContext.tsx` |
| **Spatial queries** | PostGIS RPC `get_bathrooms_near` with distance sort, configurable radius | `src/api/bathrooms.ts`, `002_functions.sql` |
| **Map filter drawer** | Filter by Open Now, Accessible, No Code Required, Customer-Only, Cleanliness >= X | `src/components/MapFilterDrawer.tsx` |
| **Persistent filters** | Filter preferences persisted via Zustand + AsyncStorage | `src/store/useFilterStore.ts` |
| **Offline banner** | Network status indicator shown when offline | `src/components/OfflineBanner.tsx` |
| **"Navigate Here"** | Deep link to Apple Maps/Google Maps/Waze with coordinates | Emergency mode hook, bathroom detail |
| **Nearby bathrooms panel** | Nearest open/free bathroom + locked bathrooms sorted by distance | `src/components/NearbyBathroomsPanel.tsx` |
| **Hours checking** | Client-side `isCurrentlyOpen()` with day-of-week lookup against `hours_json` | `src/utils/bathroom.ts` |

### 4.2 Search & Discovery

| Feature | Description | Key Files |
|---|---|---|
| **Full-text search** | PostGIS + tsvector on place_name, address, city via `search_bathrooms` RPC | `src/api/bathrooms.ts`, `009_search.sql` |
| **Search history** | Last 10 searches stored in AsyncStorage, shown as chips | `src/lib/search-history.ts` |
| **City/neighborhood browse** | Geographic browsing via `get_city_browse` RPC | `src/api/bathrooms.ts` |
| **Contextual filters** | Open Now, Accessible, Has Code, distance radius slider | `app/(tabs)/search.tsx` |
| **Defensive fallback** | Client-side ilike/grouping when migration not applied | `src/api/bathrooms.ts` |

### 4.3 Bathroom Detail

| Feature | Description | Key Files |
|---|---|---|
| **Detail screen** | Full facility view with all attributes | `app/bathroom/[id].tsx` |
| **Access code system** | Submit, reveal, vote on bathroom codes with confidence scoring | `src/api/access-codes.ts` |
| **Code reveal card** | Gated code display (ad or premium) with clipboard copy | `src/components/CodeRevealCard.tsx` |
| **Live code confidence** | Visual trust meter (green/yellow/red) based on confidence_score + recency + votes | `src/components/CodeConfidenceCard.tsx` |
| **Code verification flow** | "I Just Used This" Yes/No prompt; Yes = upvote + points, No = report | `src/components/CodeVerificationCard.tsx` |
| **Photo proof gallery** | Photos (exterior, interior, keypad, sign) with moderation status | `src/components/PhotoProofGallery.tsx`, `src/api/bathroom-photos.ts` |
| **Cleanliness ratings** | User-submitted hygiene scores with history | `src/api/cleanliness-ratings.ts` |
| **Accessibility details** | Structured ADA data (grab bars, door width, changing table, gender neutral) | `src/components/accessibility/AccessibilitySummaryCard.tsx` |
| **Live status banner** | Transient status (clean/dirty/closed/out_of_order, 2-hour expiry) | `src/components/realtime/BathroomStatusBanner.tsx` |
| **Premium arrival alert** | Code-change alert before arrival for premium users | `src/components/PremiumArrivalAlertCard.tsx` |

### 4.4 Favorites

| Feature | Description | Key Files |
|---|---|---|
| **Favorites tab** | Paginated list with sort options and empty state | `app/(tabs)/favorites.tsx` |
| **Atomic toggle** | `toggle_favorite` RPC with optimistic updates | `src/api/favorites.ts` |
| **Batch hydration** | `get_favorite_ids` RPC for heart-state on map pins | `src/api/favorites.ts` |
| **Offline replay** | Favorite toggles queued when offline, replayed on reconnect | `src/hooks/useFavorites.ts` |
| **Realtime sync** | Cross-device favorites sync via Supabase Realtime | `src/hooks/useRealtimeFavorites.ts` |

### 4.5 Auth & Account

| Feature | Description | Key Files |
|---|---|---|
| **Login/Register** | Validated forms with Zod schemas | `app/(auth)/login.tsx`, `register.tsx` |
| **Guest mode** | Browse-only usage without authentication | `AuthContext.tsx` |
| **Return intent** | Post-auth redirect to intended screen (30-min TTL) | `src/lib/return-intent.ts` |
| **Account deactivation** | `deactivate_account()` RPC, client guard forces deactivated to guest | `017_profile_account_hardening.sql` |
| **Account deletion** | Hard delete with cascades (Google Play requirement) | `020_account_deletion.sql` |
| **Display name** | Editable via rate-limited `update_display_name` RPC | `src/api/profile.ts` |
| **Terms acceptance** | TermsGate component enforces terms before UGC | `src/components/TermsGate.tsx` |
| **Onboarding** | First-launch onboarding flow | `src/components/OnboardingScreen.tsx` |

### 4.6 Ad Wall / Rewarded Ads

| Feature | Description | Key Files |
|---|---|---|
| **Rewarded video ads** | User watches ad to unlock bathroom access codes | `src/lib/admob.ts` |
| **Unlock state** | Device-local unlocks with expiry handling | `src/hooks/useRewardedCodeUnlock.ts` |
| **UMP consent** | AdMob consent gathering implemented | `src/lib/admob.ts` |
| **iOS policy** | Non-personalized ads only (no ATT prompt needed) | `app.config.ts` |
| **Graceful fallback** | Fails silently when native AdMob module absent (dev builds) | `src/lib/admob.ts` |
| **Server-enforced reveal** | `get_revealed_bathroom_code` RPC, not just client gating | `src/api/access-codes.ts` |

### 4.7 Gamification

| Feature | Description | Key Files |
|---|---|---|
| **Points economy** | Point events table; add bathroom=50, verified code=25, vote=5, photo=15, report=20 | `006_gamification.sql` |
| **Badges** | user_badges table (first_flush, code_breaker, night_owl, accessibility_hero, city_expert) | `006_gamification.sql` |
| **Leaderboards** | Weekly + all-time by city, state, global | `src/api/gamification.ts` |
| **Streaks** | current_streak, longest_streak, last_contribution_date | `006_gamification.sql` |
| **Contribution dashboard** | Total bathrooms, codes, verifications, reports, photos, points, badges | `app/(tabs)/profile.tsx` |
| **Guest preview** | Leaderboard visible to unauthenticated users | `src/api/gamification.ts` |

### 4.8 Premium Tier

| Feature | Description | Key Files |
|---|---|---|
| **Subscriptions ledger** | `premium_subscriptions` table (tier, provider, receipt, expiry) | `011_premium_tier.sql` |
| **Instant code reveal** | Premium bypasses ad wall | `src/hooks/useRewardedCodeUnlock.ts` |
| **Offline city packs** | Download bathrooms + tiles per city (~2-5MB) | `src/lib/premium-city-packs.ts`, `app/modal/city-packs.tsx` |
| **Arrival alerts** | Destination-watching with code change alerts | `src/hooks/usePremiumArrivalAlert.ts` |
| **Advanced filters** | Cleanliness minimum, verified-only, family room (premium-only) | Filter store |
| **Premium gate** | UI gate component for premium features | `src/components/PremiumFeatureGate.tsx` |

### 4.9 Business Portal

| Feature | Description | Key Files |
|---|---|---|
| **Business tab** | Claim tracking, analytics, hours editing, featured placements | `app/(tabs)/business.tsx` |
| **Claim flow** | Authenticated ownership claim with validation, duplicate blocking | `app/modal/claim-business.tsx` |
| **Dashboard analytics** | Weekly views, favorites, code verification rate, cleanliness trends | `src/api/business.ts` |
| **Verification badge** | Blue checkmark on claimed bathrooms | `src/components/business/VerificationBadge.tsx` |
| **Business hours editor** | Sunday-first rows, editable slots, presets, manual override | `src/components/business/BusinessHoursEditorSheet.tsx` |
| **Hours grid display** | Visual hours display for bathrooms | `src/components/business/BathroomHoursGrid.tsx` |
| **Featured placement** | Paid placement inventory with sponsored tag | `src/api/featured-placements.ts`, `028_featured_placement_requests.sql` |
| **Coupon system** | Business-created coupons with redemption tracking | `src/api/business-coupons.ts`, `032_coupon_system.sql` |
| **Early adopter invites** | 30-day expiring invite codes for lifetime access | `src/api/early-adopter.ts`, `034_early_adopter_invites.sql` |
| **Visit analytics** | Track StallPass-attributed customer visits | `src/api/stallpass-visits.ts` |
| **Free-map toggle** | Business controls whether they show on free-tier map | `src/components/business/FreeMapToggle.tsx` |
| **Premium map gating** | StallPass-verified bathrooms hidden from free users | `031_stallpass_premium_map_gating.sql` |
| **Web dashboard** | Browser-based business console | `web/business/index.html` |

### 4.10 Accessibility

| Feature | Description | Key Files |
|---|---|---|
| **Structured ADA data** | grab_bars, door_width, automatic_door, changing_table, family_restroom, gender_neutral, audio_cue | `013_accessibility_layer.sql` |
| **Accessibility preferences** | Persisted user preferences (standard/accessible/gender_neutral mode) | `src/store/useAccessibilityStore.ts` |
| **Accessibility-first filter** | Reorders UX for nearest fully accessible bathroom | Filter store + search |
| **Accessibility score** | Computed field on detail view | `src/utils/accessibility.ts` |
| **VoiceOver/TalkBack** | accessibilityLabel/Hint/Role on all touchable elements | Throughout components |
| **Contribution modal** | User submissions for accessibility details | `app/modal/update-accessibility.tsx` |

### 4.11 Real-Time Features

| Feature | Description | Key Files |
|---|---|---|
| **Realtime manager** | Centralized channel lifecycle management | `src/lib/realtime-manager.ts` |
| **Live code updates** | Supabase Realtime on code submissions/verifications per bathroom | `src/hooks/useRealtimeCode.ts` |
| **Live code votes** | Real-time vote count changes | `src/hooks/useRealtimeCodeVotes.ts` |
| **Realtime favorites** | Cross-device sync | `src/hooks/useRealtimeFavorites.ts` |
| **Realtime presence** | Anonymous activity count per bathroom | `src/hooks/useRealtimePresence.ts` |
| **Status badge** | UI component showing live connection state | `src/components/realtime/RealtimeStatusBadge.tsx` |

### 4.12 Push Notifications

| Feature | Description | Key Files |
|---|---|---|
| **Token registration** | Push token stored on profiles | `src/lib/push-notifications.ts` |
| **Code verified alert** | When submitted code gets 5+ upvotes | Edge Function |
| **Favorite update alert** | When favorited bathroom gets new code/hours change | `supabase/functions/notify-favorite-update/` |
| **Preferences UI** | Profile tab with notification controls | `src/hooks/useNotificationPreferences.ts` |
| **Send function** | Server-side push dispatch | `supabase/functions/send-push-notification/` |

### 4.13 Content Moderation & Safety

| Feature | Description | Key Files |
|---|---|---|
| **Bathroom reports** | 6 categories of issue reporting | `app/modal/report.tsx`, `src/api/reports.ts` |
| **User reports** | Report/block user surface | `app/modal/report-user.tsx`, `src/api/user-moderation.ts` |
| **Photo moderation** | Status fields (approved/pending/rejected) with placeholder auto-approve | `021_photo_moderation.sql` |
| **User moderation** | Account suspension handling | `022_user_moderation.sql` |
| **Admin panel** | Moderation and claims review (admin-only tab) | `app/(tabs)/admin.tsx` |
| **Stale code expiration** | Nightly edge function expires unverified codes after 90 days | `supabase/functions/expire-stale-codes/` |

### 4.14 Additional Screens & Modals

| Screen | Purpose | Key File |
|---|---|---|
| **Add bathroom** | Submit new facilities with drafts | `app/modal/add-bathroom.tsx` |
| **Route bathrooms** | Find bathrooms along a drive/walk route | `app/modal/route-bathrooms.tsx` |
| **Submit code** | Access code submission with validation | `app/modal/submit-code.tsx` |
| **Rate cleanliness** | Hygiene rating submission | `app/modal/rate-cleanliness.tsx` |
| **Live status** | Availability status reporting | `app/modal/live-status.tsx` |
| **Request featured** | Featured placement requests | `app/modal/request-featured.tsx` |
| **City packs** | Offline city pack manager | `app/modal/city-packs.tsx` |
| **Legal** | Terms, privacy, policies | `app/modal/legal.tsx` |
| **Emergency mode** | Urgent nearest-bathroom flow | `src/hooks/useEmergencyMode.ts`, `EmergencyButton.tsx` |
| **Force update** | Blocks app when below minimum version | `src/components/ForceUpdateScreen.tsx`, `useAppUpdate.ts` |

### 4.15 Web Presence

| Page | URL Path | File |
|---|---|---|
| Landing page | `/` | `web/index.html` |
| Business console | `/business/` | `web/business/index.html` |
| Privacy policy | `/privacy/` | `web/privacy/index.html` |
| Terms of service | `/terms/` | `web/terms/index.html` |
| Support | `/support/` | `web/support/index.html` |
| 404 | fallback | `web/404.html` |
| PWA manifest | `/site.webmanifest` | `web/site.webmanifest` |

---

## 5. Database Schema

### 5.1 Migrations (40 total, sequential)

| # | File | Purpose |
|---|---|---|
| 001 | `foundation_schema.sql` | Core tables: bathrooms, access_codes, profiles, PostGIS |
| 002 | `functions.sql` | get_bathrooms_near RPC, profiles.role guard |
| 003 | `bathroom_report_moderation.sql` | Report tables and RLS |
| 004 | `bathroom_photos.sql` | Photo uploads with moderation |
| 005 | `trust_engine.sql` | Code confidence scoring, vote tracking, point_events |
| 006 | `gamification.sql` | Badges, achievements, streaks, leaderboards |
| 007 | `map_surface.sql` | v_bathroom_detail_public view, spatial index optimization |
| 008 | `notifications_realtime.sql` | Push channels, bathroom_status_events |
| 009 | `search.sql` | Full-text search, tsvector, filters |
| 010 | `favorites_profile.sql` | Bookmarks, profile display, sort |
| 011 | `premium_tier.sql` | Premium subscriptions, city packs |
| 012 | `business_tier.sql` | Business accounts, claim system |
| 013 | `accessibility_layer.sql` | Wheelchair accessibility, ADA details |
| 014 | `realtime_channels.sql` | Presence & live status channels |
| 015 | `search_discovery.sql` | Enhanced search queries |
| 016 | `favorites_surface.sql` | Atomic toggle, batch hydration, paginated sort |
| 017 | `profile_account_hardening.sql` | GDPR deactivation, session revocation |
| 018 | `bathroom_contribution_hardening.sql` | Server-enforced RPCs for all mutations |
| 019 | `deactivated_user_guard.sql` | Prevent mutations by deactivated users |
| 020 | `account_deletion.sql` | Hard delete with cascades |
| 021 | `photo_moderation.sql` | Enhanced photo validation (placeholder auto-approve) |
| 022 | `user_moderation.sql` | Account suspension handling |
| 023 | `data_export.sql` | GDPR data export RPC |
| 024 | `app_version_config.sql` | App versioning, forced updates |
| 025 | `bathroom_views.sql` | Navigation analytics |
| 026 | `admin_claim_moderation.sql` | Admin review workflows |
| 027 | `business_notifications.sql` | Business-targeted alerts |
| 028 | `featured_placement_requests.sql` | Premium placements |
| 029 | `view_verification_badge.sql` | Verification badge system |
| 030 | `business_kudos.sql` | Recognition for businesses |
| 031 | `stallpass_premium_map_gating.sql` | Premium map visibility, business settings |
| 032 | `coupon_system.sql` | Coupon redemption with tracking |
| 033 | `bathroom_hours_presets.sql` | Hours editor presets |
| 034 | `early_adopter_invites.sql` | Lifetime invite codes |
| 035 | `early_adopter_invites.sql` | (duplicate number, renamed) |
| 036 | `fix_dashboard_show_on_free_map.sql` | Free map toggle fix |
| 037 | `coupon_code_uniqueness.sql` | Coupon uniqueness constraint |
| 038 | `early_adopter_invite_hardening.sql` | Invite race condition fix |
| 039 | `business_hours_google_sync.sql` | Google hours sync fields |
| 040 | `fix_app_db_lint_functions.sql` | Linting fixes |

### 5.2 Edge Functions

| Function | Purpose | Status |
|---|---|---|
| `expire-stale-codes` | Nightly code expiration (90-day unverified) | Exists |
| `send-push-notification` | Server-side push dispatch | Exists |
| `notify-favorite-update` | Alert on favorited bathroom changes | Exists |
| `google-place-autocomplete` | Google Places autocomplete proxy | Exists |
| `google-place-hours` | Google Places hours lookup | Exists |
| `google-place-address` | Google Places address lookup | Exists |

### 5.3 Zustand Stores (8)

`useAuthStore`, `useMapStore`, `useFilterStore`, `useSearchStore`, `useFavoritesStore`, `useBusinessStore`, `useAccessibilityStore`, `useRealtimeStore`

---

## 6. Resolved Bugs (from conversations)

| Bug | Resolution |
|---|---|
| Return-intent incorrectly persisted to AsyncStorage | Fixed to TTL-based persistence |
| Offline queue unvalidated on load | Added Zod validation |
| Duplicate Supabase client (`utils/supabase.ts`) | Removed duplicate |
| Env var `SUPABASE_KEY` vs `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Standardized |
| Missing placeholder assets (icon, splash) | Created |
| Invalid `react-native-maps` config plugin | Removed |
| Stale `app.json` conflicting with `app.config.ts` | Deleted stale |
| Windows path-length Gradle/CMake failure | Short `GRADLE_USER_HOME` path |
| Jest-expo React version conflict | Switched to plain Jest + ts-jest |
| Missing `react-native-worklets` dependency | Installed |
| Migration shape-change on remote push | Added explicit DROP before CREATE |
| `gen_random_bytes()` unavailable in Postgres | Replaced with `gen_random_uuid()` |
| EAS project slug mismatch | Relinked to `stallpass` |
| Release builds using debug keystore | Fail-closed signing config |
| `SYSTEM_ALERT_WINDOW` permission leak | Removed via blockedPermissions |
| Brand inconsistency (Pee-Dom vs StallPass) | Standardized to StallPass |
| 11 bare `catch {}` blocks (Hermes-incompatible) | Added proper catch bindings |
| `CI=1 ` trailing whitespace crashing Metro | Sanitizer wrapper script |
| Duplicate `show_on_free_map` from merge | Removed duplicate properties |

---

## 7. Launch Compliance Requirements

### Google Play Store
- Target SDK API 35+ (met)
- Data Safety declaration (manual -- not in code)
- Content Rating questionnaire (manual)
- In-app account deletion (implemented via migration 020)
- Privacy policy at live URL (deployed at stallpass.org/privacy/)

### Apple App Store
- Non-personalized ads only (ATT not required)
- App Privacy declaration (manual)
- In-app account deletion (5.1.1(v) compliance -- implemented)
- Privacy policy at live URL (deployed)

### Both Stores
- Terms of service (deployed at stallpass.org/terms/)
- Support page (deployed at stallpass.org/support/)

### Required Production Env Vars
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `ANDROID_GOOGLE_MAPS_API_KEY`
- `IOS_GOOGLE_MAPS_API_KEY`
- `ANDROID_ADMOB_APP_ID`
- `IOS_ADMOB_APP_ID`
- `EXPO_PUBLIC_ADMOB_CODE_REVEAL_UNIT_ID`

---

## 8. Development Phase History

| Phase | Scope | Status |
|---|---|---|
| 1 | Scaffold (Expo, TypeScript, NativeWind, Supabase client) | Complete |
| 2 | Non-visual foundation (DB, RLS, AuthContext, offline queue, cache, drafts) | Complete |
| 3 | Root layout + auth screens + core UI components | Complete |
| 4 | Map, Search, Favorites, Location, Profile | Complete |
| 5 | Business claim flow | Complete |
| 6 | Business portal / dashboard | Complete |
| StallPass | Premium tiering, business controls, coupons, invites, hours editor | Complete |

---

## 9. Proposed Future Features (from conversations, not built)

These were discussed as moonshots or future roadmap items:

1. **AI Code Recognition** -- Photograph keypad, use Vision API/on-device ML to extract code
2. **Indoor Positioning** -- HERE or IndoorAtlas SDK for malls/airports
3. **Apple Watch Companion** -- Nearest bathroom, one-tap verification
4. **iOS Widgets** -- Lock screen widget, background fetch
5. **CarPlay / Android Auto** -- Nearby bathrooms while driving
6. **Arrival-Confidence Engine** -- Composite score from code recency, live status, hours, verification, contributor reliability
7. **Temporal Intelligence** -- "Usually busy now", "usually clean at this hour"
8. **Contributor Reputation** -- Accuracy streaks, false-report penalties, moderator tooling
9. **Multi-Location Enterprise** -- Business tier at $199-999/month for chains
10. **Points-to-Premium Conversion** -- Spend points to unlock Premium (500 monthly / 4000 yearly)
11. **Level System** -- Points-based levels 1-50 with tiers (Beginner > Explorer > Navigator > Pathfinder > Legend)
