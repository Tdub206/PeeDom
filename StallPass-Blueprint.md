# StallPass
## Technical Requirement Document & Architecture Blueprint

> **Version 1.0 · React Native / Expo SDK 54 / Supabase**
> Chief Software Architect Blueprint — Authoritative Reference for All Phases

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Full File-Tree Schema](#2-full-file-tree-schema)
3. [Global State Management (Zustand)](#3-global-state-management-zustand)
4. [Service Layer Contracts](#4-service-layer-contracts)
5. [Data Fetching Hook Contracts (TanStack Query)](#5-data-fetching-hook-contracts-tanstack-query)
6. [Error Handling Strategy](#6-error-handling-strategy)
7. [Supabase RLS Security Audit](#7-supabase-rls-security-audit)
8. [Authentication & Session State Machine](#8-authentication--session-state-machine)
9. [Component Architecture Rules](#9-component-architecture-rules)
10. [Production Readiness Checklist](#10-production-readiness-checklist)
11. [Anti-Patterns & Banned Patterns](#11-anti-patterns--banned-patterns)
12. [Environment Variable Registry](#12-environment-variable-registry)

---

## 1. Executive Summary

StallPass is a community-powered mobile application enabling users to locate, rate, and access bathroom facilities in real time. The platform operates across iOS and Android, built on React Native with Expo SDK 54, Expo Router for file-based navigation, NativeWind v4 for styling, TanStack Query for server-state, and Supabase (PostgreSQL + PostGIS + Auth + Realtime) as the backend.

| Dimension   | Value                                                      |
|-------------|------------------------------------------------------------|
| Platform    | iOS 15+, Android 9+ (API 28+)                             |
| Language    | TypeScript 5.3 (strict mode — all flags on)               |
| Navigation  | Expo Router 4 (file-based, typed routes)                   |
| Styling     | NativeWind v4 + tailwind.config.js preset                  |
| State       | Zustand (global) + TanStack Query (server)                 |
| Auth        | Supabase Auth with AsyncStorage session persistence        |
| Backend     | Supabase PostgreSQL + PostGIS + RLS + Edge Functions       |
| Offline     | AsyncStorage queue + TTL cache manager                     |
| Maps        | react-native-maps (Apple Maps iOS / Google Maps Android)   |

---

## 2. Full File-Tree Schema

Every file listed below must exist and be non-placeholder before the app is considered production-ready. Files marked `[P1]`, `[P2]`, `[P3]` indicate the phase in which they were or will be created.

### 2.1 Root

```
stallpass/
  app.config.ts              [P1] Dynamic Expo config — reads all env vars
  babel.config.js            [P1] NativeWind + Reanimated plugin
  metro.config.js            [P1] NativeWind withNativeWind wrapper
  tailwind.config.js         [P1] Content paths + nativewind/preset
  tsconfig.json              [P1] Strict mode, @/* path alias to ./src/*
  package.json               [P1] All locked versions
  eas.json                   [P1] dev / preview / production profiles
  global.css                 [P1] @tailwind base/components/utilities
  nativewind-env.d.ts        [P1] /// <reference types="nativewind/types" />
  index.js                   [P1] Expo entry — imports expo-router/entry
  expo-env.d.ts              [P1] /// <reference types="expo/types/env" />
```

### 2.2 app/ (Expo Router)

```
app/
  _layout.tsx                [P1] Root layout — providers stack
  +not-found.tsx             [P1] 404 fallback

  (tabs)/
    _layout.tsx              [P1] Tab navigator with BlurView
    index.tsx                [P3] Map tab — MapView + bathroom pins
    search.tsx               [P3] Search tab — full-text + filter
    favorites.tsx            [P3] Favorites list — auth-gated
    profile.tsx              [P3] Profile + settings
    business.tsx             [P6] Business portal (claim / manage)

  (auth)/
    _layout.tsx              [P1] Modal stack layout
    login.tsx                [P3] Email/password sign-in form
    register.tsx             [P3] Registration + display name

  bathroom/
    [id].tsx                 [P3] Bathroom detail card screen

  modal/
    report.tsx               [P4] Report issue modal
    submit-code.tsx          [P4] Submit access code modal
    add-bathroom.tsx         [P4] Add new bathroom form
    claim-business.tsx       [P5] Business claim form
```

### 2.3 src/ (All Non-Route Source)

```
src/
  contexts/
    AuthContext.tsx           [P2] 7-state session machine

  lib/
    supabase.ts               [P2] Supabase client (anon key)
    storage.ts                [P2] AsyncStorage wrapper + key registry
    cache-manager.ts          [P2] TTL cache with stale detection
    offline-queue.ts          [P2] Authenticated mutation queue
    return-intent.ts          [P2] Guest-intent in-memory replay
    draft-manager.ts          [P2] Add-bathroom / claim drafts

  hooks/
    useProtectedRoute.ts      [P2] Route guard + intent setter
    useProtectedAction.ts     [P2] Action-level auth check
    useBathrooms.ts           [P3] TanStack query for map region
    useBathroomDetail.ts      [P3] Single bathroom + code summary
    useFavorites.ts           [P3] Favorites CRUD + optimistic
    useSearch.ts              [P3] Full-text + geo + filter query
    useOfflineSync.ts         [P3] AppState foreground flush trigger
    useLocation.ts            [P3] expo-location wrapper + permission
    useHaptic.ts              [P3] expo-haptics convenience hook

  services/
    bathroom.service.ts       [P3] Supabase CRUD for bathrooms
    code.service.ts           [P3] Access code submit + vote
    favorite.service.ts       [P3] Favorite toggle
    report.service.ts         [P3] Report creation
    rating.service.ts         [P3] Cleanliness rating upsert
    profile.service.ts        [P3] Profile update

  store/
    useMapStore.ts            [P3] Zustand: map region + active pin
    useFilterStore.ts         [P3] Zustand: search filters state
    useUIStore.ts             [P3] Zustand: toasts, modals, loading

  components/
    ui/
      Button.tsx              [P3] Primary / secondary / ghost variants
      Input.tsx               [P3] Controlled text input + error state
      Badge.tsx               [P3] Status / feature pills
      LoadingSpinner.tsx      [P3] Activity indicator wrapper
      ErrorBoundary.tsx       [P3] Class boundary + fallback UI
      Toast.tsx               [P3] Imperative toast system
      EmptyState.tsx          [P3] Reusable empty-list illustration
    map/
      BathroomPin.tsx         [P3] Map marker with status colors
      MapControls.tsx         [P3] Locate-me + zoom controls
      ClusterMarker.tsx       [P4] Marker cluster bubble
    bathroom/
      BathroomCard.tsx        [P3] List + search result card
      CodeReveal.tsx          [P3] Blurred code with reveal tap
      FlagChips.tsx           [P3] Accessible / locked / customer chips
      HoursDisplay.tsx        [P3] Parsed hours_json renderer
      RatingBar.tsx           [P3] 1-5 star rating selector
      VoteButtons.tsx         [P3] Upvote / downvote with optimistic

  constants/
    config.ts                 [P1] Runtime env var constants
    routes.ts                 [P3] Typed route name constants
    queryKeys.ts              [P3] TanStack query key factory

  types/
    index.ts                  [P2] All domain + API types
    database.ts               [P2] Generated Supabase schema types

  utils/
    geo.ts                    [P3] Haversine + bbox + region helpers
    format.ts                 [P3] Distance / address / date formatters
    validate.ts               [P3] Zod schemas for forms
    errorMap.ts               [P3] Supabase error code -> user message
```

### 2.4 supabase/

```
supabase/
  migrations/
    001_foundation_schema.sql  [P2] All tables, indexes, views, RLS
  functions/                   [P5] Edge Functions (code confidence)
```

---

## 3. Global State Management (Zustand)

TanStack Query handles all server state (fetching, caching, invalidation). Zustand handles the three remaining client-side state slices that are not server data: map UI state, search/filter state, and transient UI state.

> **RULE:** Never put server data (bathrooms, favorites, profile) in Zustand. That data lives in TanStack Query cache only.

### 3.1 useMapStore — `src/store/useMapStore.ts`

| Field / Action      | Description                                          |
|---------------------|------------------------------------------------------|
| `region`            | `MapRegion` (lat/lng/deltas) — current visible bounds |
| `activePin`         | `string \| null` — ID of the tapped bathroom pin      |
| `userLocation`      | `Coordinates \| null` — last known device location    |
| `isLocating`        | `boolean` — true while GPS fetch is in flight         |
| `setRegion`         | Action: update map region on drag/zoom               |
| `setActivePin`      | Action: open / close bottom-sheet detail card        |
| `setUserLocation`   | Action: update from expo-location result             |

### 3.2 useFilterStore — `src/store/useFilterStore.ts`

| Field / Action        | Description                                              |
|-----------------------|----------------------------------------------------------|
| `isAccessible`        | `boolean \| null` — filter for accessible bathrooms      |
| `isUnlocked`          | `boolean \| null` — show only unlocked bathrooms         |
| `isOpenNow`           | `boolean \| null` — honor hours_json to filter open ones |
| `maxDistanceMeters`   | `number` — radius slider value (500m to 10km)            |
| `hasCode`             | `boolean \| null` — has a verified access code           |
| `setFilter`           | Action: `(key, value)` → partial update                  |
| `resetFilters`        | Action: restore all to null / default                    |
| `activeFilterCount`   | Derived: number of non-null filter values                |

### 3.3 useUIStore — `src/store/useUIStore.ts`

| Field / Action    | Description                                           |
|-------------------|-------------------------------------------------------|
| `toasts`          | `Toast[]` — active notifications (max 3)              |
| `isModalOpen`     | `Record<ModalName, boolean>` — named modal registry   |
| `isPageLoading`   | `boolean` — full-screen overlay (login, logout)       |
| `addToast`        | Action: `(message, type)` → enqueue toast             |
| `removeToast`     | Action: `(id)` → dismiss toast                        |
| `openModal`       | Action: `(name)` → set modal visible                  |
| `closeModal`      | Action: `(name)` → set modal hidden                   |
| `setPageLoading`  | Action: `boolean`                                     |

---

## 4. Service Layer Contracts

Each service module is a plain TypeScript module (no class instantiation) that communicates exclusively with Supabase. Services never import from hooks, stores, or components. They are called by TanStack Query `queryFn` / `mutationFn` closures or by hook logic only.

### 4.1 bathroom.service.ts

| Function Signature                | Contract                                                                           |
|-----------------------------------|------------------------------------------------------------------------------------|
| `fetchNearby(region, filters)`    | Queries `v_bathrooms_public` with `ST_DWithin` PostGIS. Returns `BathroomListItem[]`. |
| `fetchDetail(id)`                 | Queries `v_bathroom_detail_public`. Returns `BathroomDetail`.                      |
| `createBathroom(draft)`           | `INSERT` into bathrooms. Requires authenticated session. Returns `id`.             |
| `updateBathroom(id, patch)`       | `UPDATE` — business/admin only. Returns updated row.                               |

### 4.2 code.service.ts

| Function Signature                    | Contract                                                     |
|---------------------------------------|--------------------------------------------------------------|
| `submitCode(payload: CodeSubmit)`     | `INSERT` into `bathroom_access_codes`.                       |
| `voteCode(payload: CodeVote)`         | `UPSERT` code_votes. DB trigger updates counts atomically.   |
| `fetchCodesForBathroom(bathroomId)`   | `SELECT` visible + active codes ordered by confidence.       |

### 4.3 favorite.service.ts

| Function Signature                      | Contract                                                       |
|-----------------------------------------|----------------------------------------------------------------|
| `toggleFavorite(bathroomId, userId)`    | `UPSERT` / `DELETE` favorites row. Returns `is_favorited` boolean. |
| `fetchFavorites(userId)`                | `SELECT` favorites with joined bathroom data.                  |

### 4.4 profile.service.ts

| Function Signature                | Contract                                                        |
|-----------------------------------|-----------------------------------------------------------------|
| `fetchProfile(userId)`            | `SELECT` profiles where `id = userId`.                          |
| `updateProfile(userId, patch)`    | `UPDATE` display_name, is_premium etc. RLS enforces self-only.  |

---

## 5. Data Fetching Hook Contracts (TanStack Query)

All query keys must come from `src/constants/queryKeys.ts` — never use inline strings. This ensures cache invalidation is reliable.

### 5.1 Query Key Factory — queryKeys.ts

```typescript
export const QK = {
  bathrooms: {
    nearby: (region, filters) => ['bathrooms', 'nearby', region, filters],
    detail:  (id)             => ['bathrooms', 'detail', id],
  },
  codes:     (bathroomId)     => ['codes', bathroomId],
  favorites: (userId)         => ['favorites', userId],
  profile:   (userId)         => ['profile', userId],
  search:    (query, filters) => ['search', query, filters],
};
```

### 5.2 Key Hooks

| Hook                              | Behavior                                                                                   |
|-----------------------------------|--------------------------------------------------------------------------------------------|
| `useBathrooms(region, filters)`   | `useQuery` — fetches nearby list; staleTime 5 min. Triggers on region change with 200ms debounce. |
| `useBathroomDetail(id)`           | `useQuery` — single bathroom detail; staleTime 5 min.                                      |
| `useFavorites()`                  | `useQuery` — auth-gated; returns `[]` for guests without error.                            |
| `useToggleFavorite()`             | `useMutation` — optimistic update: mutates TQ cache immediately, rollback on error.        |
| `useSubmitCode()`                 | `useMutation` — invalidates codes + bathroom detail on success.                            |
| `useVoteCode()`                   | `useMutation` — optimistic vote count delta; rollback on error.                            |
| `useCreateBathroom()`             | `useMutation` — invalidates nearby query on success.                                       |
| `useSearch(query, filters)`       | `useQuery` — debounced 300ms; disabled when query < 2 chars.                               |
| `useOfflineSync()`                | Custom hook — subscribes AppState; flushes offline queue on foreground.                    |

---

## 6. Error Handling Strategy

### 6.1 Error Hierarchy

| Layer                    | Responsibility                                                                                 |
|--------------------------|------------------------------------------------------------------------------------------------|
| React ErrorBoundary      | Wraps each screen subtree. Catches render-phase JS errors. Shows fallback UI with retry button. |
| TanStack Query onError   | All `useMutation` hooks call `useUIStore.addToast(errorMap(code))` on failure.                 |
| Service-level try/catch  | All Supabase calls catch and rethrow as typed `ApiError` with `message` + `code` fields.      |
| Global unhandled         | `LogBox.ignoreLogs` in dev; `Sentry.captureException` in production builds.                   |

### 6.2 errorMap.ts — Supabase Code to User Message

| Error Code                   | User-Facing Message                                            |
|------------------------------|----------------------------------------------------------------|
| `23505` (unique_violation)   | "You've already done that." (favorites / votes duplicate)     |
| `23503` (foreign_key)        | "That bathroom no longer exists."                             |
| `PGRST116` (row not found)   | "We couldn't find that item."                                 |
| `42501` (RLS denied)         | "You don't have permission to do that."                       |
| `AuthApiError`               | "Sign in failed. Check your email and password."              |
| `NETWORK_ERROR`              | "No connection. Your action has been saved for later."        |
| default                      | "Something went wrong. Please try again."                     |

### 6.3 Offline Mutation Flow

1. User performs authenticated action (favorite, vote, report, rating) while offline.
2. Service detects network error — catches and calls `offlineQueue.enqueue()`.
3. `MutationOutcome` returned: `queued_retry`.
4. UI shows a Toast: "Saved offline — will sync when connected."
5. On next app foreground (`AppState` active), `useOfflineSync` flushes the queue.
6. On flush success, TanStack Query cache invalidated for affected keys.

---

## 7. Supabase RLS Security Audit

The following is a complete audit of the current RLS policy coverage from `001_foundation_schema.sql`, with identified gaps and required remediations.

> ⚠️ **CRITICAL PRINCIPLE:** The Supabase anon key is public. RLS is the ONLY security boundary between public requests and your data. A missing policy defaults to DENY, but a misconfigured permissive policy can expose all rows.

### 7.1 Policy Coverage Audit

| Table                      | Current Policies                                      | Gap / Remediation                                                                                                                                      |
|----------------------------|-------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| `profiles`                 | SELECT self only, UPDATE self only                    | **GAP:** No public display_name lookup for leaderboards. Add `select_public_display` policy restricted to `(id, display_name)` via a view.             |
| `bathrooms`                | SELECT active rows public, INSERT by creator          | **GAP:** No UPDATE/DELETE for creator. Business owners need UPDATE after claim is approved. Add conditional `update_by_creator` policy.                 |
| `bathroom_access_codes`    | SELECT visible+active public, INSERT by submitter     | **GAP:** No UPDATE. Submitter should be able to mark their own code as superseded. Add `update_own` policy.                                             |
| `code_votes`               | SELECT own, INSERT own, UPDATE own, DELETE own        | ✅ **SECURE.** All four DML ops are scoped to `auth.uid() = user_id`.                                                                                  |
| `favorites`                | SELECT own, INSERT own, DELETE own                    | ✅ **SECURE.** No UPDATE needed (no mutable fields beyond created_at).                                                                                 |
| `bathroom_reports`         | SELECT own, INSERT own                                | **GAP:** Admin needs full access. Implement via `service_role` key in Edge Function only — never expose admin policies to client.                       |
| `cleanliness_ratings`      | SELECT own, INSERT own, UPDATE own                    | **GAP:** No unique constraint enforced at RLS level. `unique(bathroom_id, user_id)` is in DDL but verify trigger handles UPDATE correctly.              |
| `business_claims`          | SELECT own, INSERT own                                | **GAP:** Admin review (approve/reject) requires `service_role`. Do not add admin RLS — use Edge Function + `service_role` key.                         |

### 7.2 Critical Security Items

---

> 🔴 **SECURITY ISSUE 1 — .env.local committed with real Supabase key**
>
> The `EXPO_PUBLIC_SUPABASE_KEY` in `.env.local` appears to be a real publishable key. This file is NOT in `.gitignore`. **Rotate this key immediately** in the Supabase dashboard and add `.env.local` to `.gitignore`. Use `EXPO_PUBLIC_SUPABASE_ANON_KEY` (not `KEY`) consistent with all other env files.

---

> 🔴 **SECURITY ISSUE 2 — Supabase client key name mismatch**
>
> `utils/supabase.ts` reads `EXPO_PUBLIC_SUPABASE_KEY` but `src/lib/supabase.ts` reads `EXPO_PUBLIC_SUPABASE_ANON_KEY`. These are two separate Supabase clients — one will always fail. **Delete `utils/supabase.ts` entirely.** All app code must import from `src/lib/supabase.ts` only.

---

> 🟡 **SECURITY ISSUE 3 — No rate limiting on code submissions**
>
> A malicious user can spam access codes for any bathroom. Add a PostgreSQL function with a rate-limit check: max 5 code submissions per bathroom per user per 24h, enforced in a `BEFORE INSERT` trigger on `bathroom_access_codes`.

---

> 🟡 **SECURITY ISSUE 4 — Confidence score is user-writable**
>
> `confidence_score` on `bathroom_access_codes` has no server-side default enforcement. A user could `INSERT` with `confidence_score = 100`. Add a `BEFORE INSERT` trigger to force `confidence_score = 0` on all community insertions. Confidence should only be updated by the vote trigger logic.

---

### 7.3 Required Additional SQL

Add the following to `002_security_hardening.sql`:

```sql
-- Rate limit trigger for code submissions
CREATE OR REPLACE FUNCTION public.check_code_submission_rate()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE submission_count INT;
BEGIN
  SELECT COUNT(*) INTO submission_count FROM public.bathroom_access_codes
  WHERE submitted_by = NEW.submitted_by
    AND bathroom_id = NEW.bathroom_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF submission_count >= 5 THEN
    RAISE EXCEPTION 'rate_limit' USING HINT = 'Too many submissions';
  END IF;

  NEW.confidence_score := 0;  -- force reset
  RETURN NEW;
END; $$;

CREATE TRIGGER before_code_insert
  BEFORE INSERT ON public.bathroom_access_codes
  FOR EACH ROW EXECUTE FUNCTION public.check_code_submission_rate();
```

---

## 8. Authentication & Session State Machine

The 7-state session machine in `AuthContext` is the canonical auth source of truth. No component should read from `supabase.auth` directly.

| State                    | Condition                                                    | App Behavior                                                     |
|--------------------------|--------------------------------------------------------------|------------------------------------------------------------------|
| `BOOTSTRAPPING`          | App cold-start, reading persisted session from AsyncStorage  | Show full-screen splash/loader. Block all navigation.            |
| `GUEST`                  | No active session. User is browsing anonymously.             | Allow map browse, search. Gate favorites/codes/reports.          |
| `SESSION_RECOVERY`       | Session found in storage, fetching profile from DB.          | Show subtle loading indicator. Allow cached content.             |
| `AUTHENTICATED_USER`     | Valid session + profile with role = `user`.                  | Full access to all user features.                                |
| `AUTHENTICATED_BUSINESS` | Valid session + profile with role = `business`.              | Full access + business portal tab.                               |
| `AUTHENTICATED_ADMIN`    | Valid session + profile with role = `admin`.                 | Full access + admin moderation tools.                            |
| `SESSION_INVALID`        | Session token present but profile fetch failed.              | Force sign-out. Show error toast. Redirect to login.             |

### 8.1 Intent Replay Rules

> ✅ **RULE — Guest Intent is In-Memory Only**
>
> `returnIntent.set()` stores intent in memory AND AsyncStorage for 30-minute TTL. On successful auth, `AuthContext` calls `returnIntent.consume()` and the calling hook executes the action. **NEVER** enqueue guest actions in `offlineQueue` — the offline queue is strictly for authenticated transient network failures.

### 8.2 MutationOutcome Type

```typescript
type MutationOutcome = 'completed' | 'auth_required' | 'queued_retry';
```

Every service mutation must return a `MutationOutcome` so UI can respond appropriately:
- `completed` → success toast
- `auth_required` → navigate to login
- `queued_retry` → offline toast

---

## 9. Component Architecture Rules

### 9.1 Native Purity Protocol

> 🔴 **BANNED ELEMENTS:** `div`, `span`, `p`, `h1`–`h6`, `form`, `input`, `button`, `a`, `img`, `ul`, `li`. These are HTML DOM elements. React Native does not have a DOM. Using them will produce a runtime error on device.

| Web                 | React Native Equivalent                                     |
|---------------------|-------------------------------------------------------------|
| `div`               | `<View className="flex-1 bg-white">`                        |
| `span`              | `<Text>` (inline) with appropriate style                    |
| `input`             | `<TextInput>` with `onChangeText`                           |
| `button`            | `<Pressable>` or `<TouchableOpacity>`                       |
| `img`               | `<Image>` with `source={{ uri: ... }}`                      |
| `form`              | No form tag — use state + `onPress` submit                  |
| `alert()`           | `Alert.alert(title, message, buttons)`                      |
| `localStorage`      | `AsyncStorage` (already abstracted in `storage.ts`)         |
| `window.location`   | `router.push()` from `expo-router`                          |

### 9.2 SafeAreaView Rules

- Every top-level screen must be wrapped in `<SafeAreaView>`.
- Tab screens: `edges={["top", "left", "right"]}` — bottom handled by tab bar.
- Modal screens: `edges={["bottom"]}` — status bar is transparent in modal.
- Full-screen maps: use `<SafeAreaView style={{ flex: 1 }}>` then overlay controls inside.
- Never use raw `<View>` as the root of a screen — always `SafeAreaView`.

### 9.3 NativeWind v4 Usage

- All styling via `className` prop — no `StyleSheet.create()` except for dynamic/complex cases.
- Dynamic classes: use conditional template literals — `` className={`flex-1 ${isActive ? "bg-blue-500" : "bg-gray-100"}`} ``
- Platform-specific: use `Platform.OS` check in className strings or `Platform.select()` for style objects.
- Do NOT use arbitrary values in NativeWind without adding them to `tailwind.config.js` `theme.extend`.

---

## 10. Production Readiness Checklist

### 10.1 Performance

| Area                   | Requirement                                                                                                            |
|------------------------|------------------------------------------------------------------------------------------------------------------------|
| FlatList / FlashList   | All lists use `keyExtractor` and `getItemLayout`. Consider `FlashList` from Shopify for 60fps on large lists.          |
| Map clustering         | At zoom levels showing 50+ pins, use react-native-maps marker clustering. Pins beyond viewport must not render.        |
| Image caching          | All user-uploaded bathroom images use `expo-image` (not `<Image>`) for disk caching.                                  |
| Memoization            | `useMemo` on filter-derived data; `useCallback` on all event handlers passed to children; `React.memo` on BathroomCard, BathroomPin. |
| Bundle size            | Run `npx expo export --platform all` periodically. Target < 8MB JS bundle.                                            |
| Reanimated             | All animated transitions use Reanimated worklets (runs on UI thread). Never use `Animated` API from React Native core. |

### 10.2 Security Pre-Launch Checklist

- [ ] All `.env.*` files in `.gitignore` — verified with `git status`.
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` used consistently — anon key only, never `service_role` key.
- [ ] `utils/supabase.ts` deleted — single Supabase client at `src/lib/supabase.ts`.
- [ ] Rate-limit trigger on code submissions deployed (`002_security_hardening.sql`).
- [ ] `confidence_score` reset trigger deployed.
- [ ] All sensitive operations go through Edge Functions with `service_role` key (admin approve/reject).
- [ ] Sentry DSN configured for production build error reporting.
- [ ] `ANDROID_GOOGLE_MAPS_API_KEY` restricted to package `com.stallpass.app` in Google Cloud Console.

### 10.3 Phase Delivery Gates

| Phase   | Scope                              | Exit Criteria                                                                                             |
|---------|------------------------------------|-----------------------------------------------------------------------------------------------------------|
| Phase 3 | Root layout + auth screens         | Login, register UI complete. Session machine wired to navigation. Protected route hooks active.           |
| Phase 4 | Map + bathroom detail              | Map renders nearby pins. Detail sheet animates up. Code reveal works. All mutations return MutationOutcome. |
| Phase 5 | Search + favorites + profile       | Full-text search with filter sheet. Favorites persisted. Profile edit. Offline queue flushes correctly.   |
| Phase 6 | Business portal + admin moderation | Claim flow. Edge Functions for approval. Admin panel (web, not mobile).                                   |
| Phase 7 | Production hardening               | Sentry, Crashlytics, EAS Update OTA config, App Store / Play Store submission.                            |

---

## 11. Anti-Patterns & Banned Patterns

> 🔴 **BANNED: Two Supabase client instances**
>
> `utils/supabase.ts` and `src/lib/supabase.ts` create separate clients with different auth states. This causes session desync. Delete `utils/supabase.ts`. Use `src/lib/supabase.ts` exclusively.

---

> 🔴 **BANNED: Partial file snippets**
>
> Builder Prime Mode requires atomic file replacement. Output the entire file. Never output `// ... rest of code`. The LLM has no way to verify a partial file was integrated correctly.

---

> 🔴 **BANNED: Guest actions in offline queue**
>
> `offlineQueue` is for authenticated users who lose network. Guest users who tap a protected action get `returnIntent` flow (in-memory replay after auth). The two flows must never be mixed.

---

> 🔴 **BANNED: Inline query key strings**
>
> Never: `useQuery({ queryKey: ["bathrooms", id] })`. Always: `useQuery({ queryKey: QK.bathrooms.detail(id) })`. This ensures a single source of truth for cache invalidation.

---

> 🔴 **BANNED: `processLock` from `@supabase/supabase-js`**
>
> The current `utils/supabase.ts` imports `processLock` which does not exist in the `@supabase/supabase-js` public API. This will cause a runtime crash. Remove it. The auth config in `src/lib/supabase.ts` is the correct implementation.

---

## 12. Environment Variable Registry

All environment variables must use `EXPO_PUBLIC_` prefix for client-side access. Variables without this prefix are build-time only.

| Variable                       | Purpose                                   | Notes                                         |
|--------------------------------|-------------------------------------------|-----------------------------------------------|
| `EXPO_PUBLIC_SUPABASE_URL`     | Supabase project URL                      | Required in all environments                  |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`| Supabase anon (publishable) key           | Required. This is public by design.           |
| `EXPO_PUBLIC_ENV`              | `local \| staging \| production`          | Used in `config.ts` for feature flags         |
| `EXPO_PUBLIC_API_BASE_URL`     | Base URL for any custom REST endpoints    | Optional if Supabase-only                     |
| `ANDROID_GOOGLE_MAPS_API_KEY`  | Google Maps Android SDK key               | Build-time only. Injected by `app.config.ts`  |
| `EAS_PROJECT_ID`               | Expo Application Services project ID     | Required for EAS Build + OTA                  |

> ⚠️ **IMPORTANT:** `EXPO_PUBLIC_SUPABASE_KEY` (found in `.env.local`) is a non-standard name inconsistent with all other env files. Migrate to `EXPO_PUBLIC_SUPABASE_ANON_KEY` and rotate the exposed key.

---

*StallPass TRD v1.0 · Chief Software Architect Blueprint · All phases reference this document as canonical.*
