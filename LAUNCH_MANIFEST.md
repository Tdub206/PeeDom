

**PEE-DOM**

**MASTER LAUNCH MANIFEST**

Production-Grade System Directive for Google Play Launch

Stack: Expo SDK 54  •  React Native  •  TypeScript  •  Supabase  •  NativeWind v4

Phases: 1–2 Complete  •  Target: Phase 3 → Production

CONFIDENTIAL — Internal Engineering Reference

# **§1  Structural Audit — Complete Production File Tree**

Every file required for a production-grade launch. Files marked NEW are absent from the current repo and must be created before submission. Files marked SCAFFOLD exist but need full implementation.

## **1.1  Root-Level Configuration**

| File | Status / Purpose |
| :---- | :---- |
| **app.config.ts** | EXISTS — Dynamic config with env-var injection. Verified correct. |
| **babel.config.js** | EXISTS — NativeWind \+ Reanimated plugin configured. |
| **tsconfig.json** | EXISTS — Strict mode enabled. Keep strictPropertyInitialization. |
| **tailwind.config.js** | EXISTS — NativeWind preset \+ brand colours. |
| **metro.config.js** | NEW — Required for NativeWind v4 CSS transform pipeline. |
| **global.css** | NEW — NativeWind base stylesheet (tailwind directives). |
| **nativewind-env.d.ts** | NEW — Type declarations for className prop on RN components. |
| **index.js** | NEW — Expo Router entry: registerRootComponent(ExpoRoot). |
| **.env.local** | EXISTS — ⚠ Contains live Supabase key. Rotate immediately if committed. |
| **.env.example** | EXISTS — Template for team. Anon key correctly renamed. |
| **eas.json** | EXISTS — All three profiles present. |
| **.gitignore** | NEW — Must exclude .env.local, \*.keystore, \*.p8, \*.p12, /android, /ios. |
| **proguard-rules.pro** | NEW — Android release build obfuscation rules (see §3.2). |

## **1.2  App Directory (Expo Router Routes)**

| Route File | Status / Notes |
| :---- | :---- |
| **app/\_layout.tsx** | EXISTS — Root layout. Missing: SplashScreen.preventAutoHideAsync, font loading, error boundary wrapper. |
| **app/(tabs)/\_layout.tsx** | EXISTS — Tab bar. Needs real icons (Ionicons/lucide-rn). TabBarIcon placeholder must be removed. |
| **app/(tabs)/index.tsx** | SCAFFOLD — Map tab. Full MapView \+ location \+ bathroom pins needed in Phase 3\. |
| **app/(tabs)/search.tsx** | SCAFFOLD — Search tab. Phase 3 target. |
| **app/(tabs)/favorites.tsx** | SCAFFOLD — Favorites tab. Phase 3 target. |
| **app/(tabs)/profile.tsx** | SCAFFOLD — Profile tab. Auth state integrated. Needs full UI. |
| **app/(tabs)/business.tsx** | SCAFFOLD — Business portal. Phase 6 target. |
| **app/(auth)/\_layout.tsx** | EXISTS — Modal stack. Correct. |
| **app/(auth)/login.tsx** | SCAFFOLD — Phase 3 target. Full form \+ validation \+ error handling. |
| **app/(auth)/register.tsx** | SCAFFOLD — Phase 3 target. |
| **app/bathroom/\[id\].tsx** | SCAFFOLD — Detail screen. Phase 3 target. Dynamic route confirmed. |
| **app/modal/report.tsx** | NEW — Report bathroom modal. |
| **app/modal/submit-code.tsx** | NEW — Code submission modal. |
| **app/modal/add-bathroom.tsx** | NEW — Add bathroom flow (draft-managed). |
| **app/modal/claim-business.tsx** | NEW — Business claim flow (draft-managed). |
| **app/+not-found.tsx** | NEW — 404 fallback route required by Expo Router. |

## **1.3  Source Layer (src/)**

### **src/lib/  — Infrastructure**

| supabase.ts | EXISTS — ⚠ Key reads EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY but .env.local exports EXPO\_PUBLIC\_SUPABASE\_KEY. Must align. |
| :---- | :---- |
| **storage.ts** | EXISTS — AsyncStorage abstraction. Production-ready. |
| **cache-manager.ts** | EXISTS — TTL cache. Production-ready. |
| **offline-queue.ts** | EXISTS — Mutation queue. No sleep-in-loop. Correct. |
| **draft-manager.ts** | EXISTS — Draft persistence. Production-ready. |
| **return-intent.ts** | EXISTS — Guest-intent replay. In-memory only. Correct. |
| **query-client.ts** | NEW — Centralised TanStack Query client (move out of \_layout.tsx). |
| **api/bathrooms.ts** | NEW — All Supabase bathroom queries wrapped as typed async fns. |
| **api/auth.ts** | NEW — Supabase auth calls (signIn/signUp/signOut/resetPassword). |
| **api/favorites.ts** | NEW — Favorites CRUD. |
| **api/codes.ts** | NEW — Code submit \+ vote mutations. |
| **api/profile.ts** | NEW — Profile read/update. |
| **sentry.ts** | NEW — Sentry.init() with DSN from EXPO\_PUBLIC\_SENTRY\_DSN. |

### **src/hooks/  — React Hooks**

| useProtectedRoute.ts | EXISTS — Auth guard hook. Production-ready. |
| :---- | :---- |
| **useBathrooms.ts** | NEW — useQuery wrapper for bathroom list \+ detail. |
| **useFavorites.ts** | NEW — useQuery \+ useMutation for favorites. |
| **useLocation.ts** | NEW — expo-location permission request \+ watch-position. |
| **useOfflineSync.ts** | NEW — AppState listener triggering queue flush on foreground. |
| **useToast.ts** | NEW — Lightweight imperative toast/snackbar hook. |

### **src/contexts/  — React Contexts**

| AuthContext.tsx | EXISTS — 7-state machine. requireAuth() missing — add before Phase 3\. |
| :---- | :---- |
| **ToastContext.tsx** | NEW — Global toast provider for mutation feedback. |
| **LocationContext.tsx** | NEW — Share last-known coordinates app-wide. |

### **src/components/  — Shared UI**

| ErrorBoundary.tsx | NEW — Class component wrapping entire app \+ Sentry.captureException. |
| :---- | :---- |
| **LoadingScreen.tsx** | NEW — Branded splash/loading state. |
| **BathroomCard.tsx** | NEW — Reusable card: place name, distance, lock icon, code badge. |
| **MapView.tsx** | NEW — MapView wrapper with bathroom marker clustering. |
| **CodeBadge.tsx** | NEW — Displays code\_value or "No code yet" with confidence bar. |
| **BottomSheet.tsx** | NEW — react-native-reanimated bottom sheet base component. |
| **Button.tsx** | NEW — Primary / Secondary / Destructive variants with loading state. |
| **Input.tsx** | NEW — Controlled text input with error display. |
| **OfflineBanner.tsx** | NEW — Sticky top banner when NetInfo detects offline state. |

### **src/constants/**

| config.ts | EXISTS — Reads process.env.EXPO\_PUBLIC\_\* correctly. |
| :---- | :---- |
| **colors.ts** | NEW — Single source of truth for brand palette (mirrors tailwind.config.js). |
| **routes.ts** | NEW — Typed route constants preventing magic-string navigation. |

### **src/types/**

| index.ts | EXISTS — Comprehensive domain types. Production-ready. |
| :---- | :---- |
| **database.ts** | EXISTS — Manual Supabase schema types. Regenerate via CLI after schema changes. |
| **env.d.ts** | NEW — declare const for all EXPO\_PUBLIC\_\* vars so TS can resolve them. |

### **supabase/  — Backend**

| migrations/001\_foundation\_schema.sql | EXISTS — Full schema with PostGIS \+ RLS \+ triggers. |
| :---- | :---- |
| **migrations/002\_functions.sql** | NEW — RPC functions: get\_bathrooms\_near(lat, lng, radius\_m). |
| **seed.sql** | NEW — Development seed data (10+ Seattle bathrooms). |
| **.env (supabase CLI)** | NEW — SUPABASE\_DB\_URL for local dev with supabase start. |

# **§2  Dependency Synchronization**

Complete library manifest with version locks, interaction contracts, and integration notes. All versions are Expo SDK 54 compatible.

## **2.1  Core Runtime Dependencies**

| Package | Version | Category | Integration Notes |
| :---- | :---- | :---- | :---- |
| expo | \~54.0.0 | Platform | Lock minor. Do not upgrade mid-development. |
| expo-router | \~4.0.11 | Navigation | File-based routing. Requires index.js entry \+ scheme in app.config.ts. |
| react-native | 0.76.5 | Core | Locked by Expo SDK. Do not override. |
| @supabase/supabase-js | ^2.39.7 | Backend | Uses AsyncStorage for session. processLock must be removed (deprecated in 2.39+). |
| nativewind | ^4.0.1 | Styling | Requires metro.config.js withNativeWind() \+ global.css import in \_layout.tsx. |
| react-native-reanimated | \~3.16.1 | Animation | Plugin in babel.config.js. Must be last plugin. Used for bottom sheets. |
| @tanstack/react-query | ^5.28.4 | Data Fetching | QueryClientProvider in \_layout.tsx. Move QueryClient to src/lib/query-client.ts. |
| @react-native-async-storage/async-storage | 1.23.1 | Persistence | Supabase session storage. Also used by cache/queue/draft managers. |
| expo-location | \~18.0.4 | Device API | Foreground permission only. Request in useLocation hook, not at app start. |
| react-native-maps | 1.18.0 | Maps | Android: needs ANDROID\_GOOGLE\_MAPS\_API\_KEY. iOS: Apple Maps free by default. |
| expo-secure-store | \~14.0.0 | Security | NOT currently used. Future: store refresh token here instead of AsyncStorage. |
| expo-haptics | \~14.0.0 | Device API | Haptic feedback on map pin tap \+ code reveal. |
| react-native-gesture-handler | \~2.20.2 | Gestures | GestureHandlerRootView must wrap entire app in \_layout.tsx. Already done. |
| react-native-safe-area-context | 4.12.0 | Layout | SafeAreaProvider in \_layout.tsx. Already done. |
| react-native-screens | \~4.3.0 | Navigation | Expo Router dependency. No direct usage needed. |
| expo-blur | \~14.0.1 | UI | iOS tab bar blur. Currently used in tabs \_layout. Correct. |
| expo-constants | \~17.0.3 | Config | Access app.config.ts extra fields. Prefer process.env for EXPO\_PUBLIC\_ vars. |
| expo-status-bar | \~2.0.0 | UI | StatusBar component in root layout. Already used. |
| react-native-url-polyfill | ^2.0.0 | Polyfill | Import at top of supabase.ts. Already done. |

## **2.2  Missing Production Dependencies — Install Before Phase 3**

| Package | Install Command | Priority | Purpose |
| :---- | :---- | :---- | :---- |
| @sentry/react-native | npx expo install @sentry/react-native | P0 | Crash reporting. Required for Play Store production builds. |
| zod | npm install zod | P0 | Runtime schema validation for API responses \+ offline queue payloads. |
| @react-native-community/netinfo | npx expo install @react-native-community/netinfo | P0 | Offline detection for OfflineBanner \+ queue flush gating. |
| expo-font | npx expo install expo-font | P1 | Load custom fonts in \_layout.tsx with SplashScreen.preventAutoHideAsync. |
| expo-splash-screen | npx expo install expo-splash-screen | P1 | Control splash screen hide timing after fonts \+ auth bootstrap. |
| @expo/vector-icons | npx expo install @expo/vector-icons | P1 | Ionicons/MaterialIcons for tab bar and UI. Replace TabBarIcon placeholder. |
| react-native-reanimated-bottom-sheet | npx expo install @gorhom/bottom-sheet | P1 | Bathroom detail bottom sheet on map tap. |
| date-fns | npm install date-fns | P2 | Format last\_verified\_at timestamps. Lightweight vs moment.js. |
| expo-image | npx expo install expo-image | P2 | Performant image component for bathroom thumbnails (future). |

## **2.3  Dependency Interaction Contract**

This matrix defines how the major subsystems must wire together. Violating these contracts causes silent runtime failures.

| Subsystem A | Subsystem B | Contract |
| :---- | :---- | :---- |
| NativeWind v4 | Metro Bundler | metro.config.js must export withNativeWind(config, { input: "./global.css" }). Without this, className props silently do nothing. |
| NativeWind v4 | Babel | jsxImportSource: "nativewind" in babel-preset-expo options. Already present in babel.config.js. |
| Supabase Auth | AuthContext | onAuthStateChange listener owns all session state transitions. Never call setSession() directly outside this listener. |
| Supabase Auth | AsyncStorage | supabase createClient auth.storage \= AsyncStorage. Session persists across app restarts. |
| TanStack Query | Supabase | All API calls wrapped in queryFn closures. Never call supabase directly in components. |
| TanStack Query | OfflineQueue | useMutation onError callback enqueues failed mutations. onSuccess callback invalidates relevant query keys. |
| OfflineQueue | NetInfo | NetInfo addEventListener triggers queue.process() when isConnected transitions false→true. |
| OfflineQueue | AppState | AppState addEventListener triggers queue.process() on "active" foreground event. |
| Zod | OfflineQueue | zod.safeParse() on every mutation loaded from AsyncStorage before execution. Discard invalid entries. |
| Sentry | ErrorBoundary | ErrorBoundary.componentDidCatch calls Sentry.captureException(error). Sentry.init() in \_layout.tsx before all providers. |
| Expo Router | AuthContext | Protected routes use useProtectedRoute() hook. Never redirect inside AuthProvider directly. |
| ExpoSplashScreen | AuthContext | SplashScreen.preventAutoHideAsync() on mount. Hide only after sessionStatus \!== BOOTSTRAPPING. |

# **§3  The Last Mile — Android Production Checklist**

All items below must be completed and verified before submitting the AAB to the Google Play Console. Each item has caused Play Store rejections in React Native apps.

## **3.1  App Bundle & Build Configuration**

### **eas.json Production Profile — Required Settings**

| Setting | Required Value / Explanation |
| :---- | :---- |
| **android.buildType** | "aab" — Play Store requires .aab, not .apk for production submissions. |
| **android.gradleCommand** | :app:bundleRelease — Ensure ProGuard runs on release builds. |
| **env.ANDROID\_GOOGLE\_MAPS\_API\_KEY** | Must be set in EAS secret, not .env files. Use: eas secret:create |
| **env.EXPO\_PUBLIC\_SUPABASE\_URL** | EAS secret. The Supabase URL is not sensitive but keep consistent with staging/prod distinction. |
| **env.EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY** | EAS secret. Anon key is public-facing but must match the correct project per environment. |
| **env.EXPO\_PUBLIC\_SENTRY\_DSN** | EAS secret. Required before first production build. |

### **Keystore Management**

**🚨  CRITICAL:** Never store the Android keystore in the repo. EAS manages it automatically when using EAS Build. For self-managed: use eas credentials.

| Task | Command / Action |
| :---- | :---- |
| **Generate keystore via EAS** | eas credentials — select Android → Production → create new keystore |
| **Back up keystore** | Download and store in password manager \+ encrypted backup. Loss \= permanent Play Store lockout. |
| **Set key alias** | Typically "key0" — verify with: eas credentials \--platform android |
| **Verify signing config** | eas build \--platform android \--profile production \--dry-run |

## **3.2  ProGuard Rules**

The following proguard-rules.pro contents must be placed at the Android project root. Run expo prebuild first to generate the native android/ directory.

\# ── Expo / React Native ──────────────────────────────────────────────

\-keep class com.facebook.react.\*\* { \*; }

\-keep class com.facebook.hermes.\*\* { \*; }

\-keep class com.swmansion.\*\* { \*; }

\# ── Supabase / OkHttp ────────────────────────────────────────────────

\-keep class okhttp3.\*\* { \*; }

\-keep class okio.\*\* { \*; }

\-dontwarn okhttp3.\*\*

\# ── Google Maps ──────────────────────────────────────────────────────

\-keep class com.google.android.gms.\*\* { \*; }

\-keep class com.google.android.maps.\*\* { \*; }

\# ── Sentry ───────────────────────────────────────────────────────────

\-keep class io.sentry.\*\* { \*; }

\-dontwarn io.sentry.\*\*

\# ── AsyncStorage ─────────────────────────────────────────────────────

\-keep class com.reactnativecommunity.asyncstorage.\*\* { \*; }

## **3.3  AndroidManifest.xml Permissions**

After expo prebuild, the android/app/src/main/AndroidManifest.xml will be generated. The following permissions must be present. Expo plugins handle most of these — verify after each prebuild.

| Permission | Required By | Auto-Added? |
| :---- | :---- | :---- |
| INTERNET | Supabase, Maps, Sentry | Yes |
| ACCESS\_FINE\_LOCATION | expo-location | Yes (via plugin) |
| ACCESS\_COARSE\_LOCATION | expo-location | Yes (via plugin) |
| ACCESS\_NETWORK\_STATE | NetInfo | Yes (via plugin) |
| VIBRATE | expo-haptics | Yes (via plugin) |
| FOREGROUND\_SERVICE | Background location (future only) | No — do not add unless Phase 7+ requires it. |
| READ\_EXTERNAL\_STORAGE | Image picker (future) | No — defer until Phase 5\. |
| CAMERA | Proof-of-bathroom photo (future) | No — defer until Phase 5\. |

**⚠**  Never add ACCESS\_BACKGROUND\_LOCATION. Google Play enforces a manual review process for apps using it and will reject Pee-Dom at this stage.

## **3.4  Play Store Metadata Checklist**

| Asset / Item | Specification |
| :---- | :---- |
| **App Icon** | 512×512 PNG, no alpha, no rounded corners (Play Store adds them). |
| **Feature Graphic** | 1024×500 PNG or JPEG. |
| **Screenshots** | Min 2, max 8 per device type. Required: Phone. Recommended: 7-inch tablet. |
| **Short Description** | Max 80 characters. Suggested: "Find bathrooms near you. Access codes included." |
| **Full Description** | Max 4000 characters. Mention: crowd-sourced, access codes, favorites, offline support. |
| **Content Rating** | Complete IARC questionnaire. Pee-Dom: Everyone (no violent/sexual/gambling content). |
| **Privacy Policy URL** | Required before first release. Host on peedom.com/privacy. |
| **Data Safety Form** | Declare: Location (approximate \+ precise), User ID, App activity, App info. Purpose: App functionality \+ Analytics. |
| **Target SDK** | API 35 (Android 15). Expo SDK 54 targets this by default. |
| **Minimum SDK** | API 24 (Android 7.0). Set in app.config.ts android.minSdkVersion: 24\. |

# **§4  Holistic State Flow — Supabase RLS to UI**

This section maps the complete data lifecycle from database policy to rendered component. Every layer must be understood before implementing Phase 3 screens.

## **4.1  Authentication State Machine**

The 7-state machine in AuthContext governs all routing and data access. No component should read session state directly from Supabase.

| State | Entry Condition | UI Behaviour |
| :---- | :---- | :---- |
| BOOTSTRAPPING | App cold start. supabase.auth.getSession() not yet resolved. | Show LoadingScreen. SplashScreen.preventAutoHideAsync holds splash visible. |
| GUEST | No valid session. getSession() returns null. | All tabs accessible. Protected actions trigger returnIntent \+ redirect to login. |
| SESSION\_RECOVERY | Valid Supabase session exists. Profile fetch in progress. | Show LoadingScreen. Prevents flash of unauthenticated content. |
| AUTHENTICATED\_USER | Session \+ profile.role \=== "user". | Full app access. Offline queue active. Favorites synced. |
| AUTHENTICATED\_BUSINESS | Session \+ profile.role \=== "business". | Business tab enabled. Claim management visible. |
| AUTHENTICATED\_ADMIN | Session \+ profile.role \=== "admin". | Moderation controls visible. All content accessible. |
| SESSION\_INVALID | Profile fetch failed despite valid session token. | Force sign-out. Clear AsyncStorage. Redirect to login with error toast. |

## **4.2  Data Flow: Map Screen (Primary User Journey)**

The complete lifecycle of bathroom data from database to rendered map pin:

1. User opens app → \_layout.tsx mounts → SplashScreen.preventAutoHideAsync() called.

2. AuthContext initialises → BOOTSTRAPPING → supabase.auth.getSession() → GUEST or SESSION\_RECOVERY.

3. SplashScreen.hideAsync() called once status \!== BOOTSTRAPPING.

4. Map tab renders → useLocation() hook requests ACCESS\_FINE\_LOCATION permission.

5. On permission grant → watchPositionAsync() starts → LocationContext updated.

6. useBathrooms({ lat, lng, radius: 1000 }) hook fires → TanStack Query checks staleTime (5min).

7. Cache MISS → Supabase RPC call: select \* from get\_bathrooms\_near(lat, lng, 1000).

8. Supabase evaluates RLS: bathrooms\_select\_public policy → moderation\_status \= "active" enforced at DB level.

9. Response arrives → zod schema validates shape → TanStack Query stores in memory cache.

10. CacheManager.set() persists to AsyncStorage with TTL (5 min hard, 1 min stale).

11. MapView component re-renders with bathroom markers.

12. User taps marker → Reanimated BottomSheet animates up → bathroom/\[id\] detail data fetched.

13. Detail view calls v\_bathroom\_detail\_public view → includes code summary if code exists.

14. Code value rendered via CodeBadge component (visibility: shown / hidden / premium\_gated).

## **4.3  Data Flow: Protected Action (Favorite Toggle)**

15. Guest user taps heart icon on BathroomCard.

16. useFavorites().toggle() calls useProtectedAction() hook.

17. useProtectedAction detects isGuest → calls returnIntent.set({ type: "favorite\_toggle", route: "/bathroom/\[id\]", params: { bathroom\_id } }).

18. Router.push("/(auth)/login") — modal slides up.

19. User signs in → Supabase SIGNED\_IN event fires → AuthContext transitions to AUTHENTICATED\_USER.

20. useProtectedRoute in auth layout detects auth → checks returnIntent.consume().

21. Intent found → replay\_strategy: "immediate\_after\_auth" → execute favorite toggle automatically.

22. useMutation calls supabase.from("favorites").insert({ user\_id, bathroom\_id }).

23. RLS policy favorites\_insert\_own: auth.uid() \= user\_id — enforced at DB level.

24. On success → queryClient.invalidateQueries(\["favorites"\]) → UI updates optimistically.

25. On network failure → offlineQueue.enqueue("favorite\_add", { bathroom\_id }, userId).

26. When connectivity restores (NetInfo or AppState) → offlineQueue.process() retries.

## **4.4  RLS Policy Reference — Enforced at DB Level**

These policies are the single source of truth for data access. No client-side filtering should be relied upon as a security boundary.

| Table | Operation | Policy Condition | Notes |
| :---- | :---- | :---- | :---- |
| bathrooms | SELECT | moderation\_status \= "active" | Public read. No auth required. Unauthenticated guests see all active bathrooms. |
| bathrooms | INSERT | auth.uid() \= created\_by | Authenticated only. Validate created\_by \= current user server-side. |
| bathroom\_access\_codes | SELECT | visibility \= "visible" AND lifecycle \= "active" | Public read. No auth required. |
| bathroom\_access\_codes | INSERT | auth.uid() \= submitted\_by | Authenticated only. |
| code\_votes | ALL | auth.uid() \= user\_id | Full CRUD for own votes only. DB UNIQUE(code\_id, user\_id) prevents double-voting. |
| favorites | SELECT | auth.uid() \= user\_id | User sees only own favorites. |
| favorites | INSERT | auth.uid() \= user\_id | Authenticated only. |
| favorites | DELETE | auth.uid() \= user\_id | Own favorites only. |
| profiles | SELECT | auth.uid() \= id | Users read only own profile. Admin reads via service role key (server-side only). |
| profiles | UPDATE | auth.uid() \= id | Users update own profile only. role field must be immutable from client — add server-side constraint. |
| bathroom\_reports | INSERT | auth.uid() \= reported\_by | Authenticated only. One report per user per bathroom recommended — add UNIQUE constraint. |
| business\_claims | ALL | auth.uid() \= claimant\_user\_id | Authenticated. review\_status must be immutable from client — server only via service role. |

**🚨  CRITICAL:** profiles.role must never be updatable from the client. Add a Supabase check: create policy "profiles\_update\_role\_blocked" on profiles for update using (auth.uid() \= id) with check (role \= OLD.role).

## **4.5  Offline State Flow**

| Scenario | Behaviour |
| :---- | :---- |
| **App launches offline** | CacheManager.get() serves stale data (is\_stale \= true). OfflineBanner shows. Map renders from AsyncStorage. |
| **Mutation attempted offline** | useMutation onError callback detects network error → offlineQueue.enqueue(). Toast: "Saved. Will sync when online." |
| **App comes online (foreground)** | AppState "active" event → offlineQueue.process() → execute pending mutations. |
| **Network restores in background** | NetInfo isConnected → true → offlineQueue.process() triggered. |
| **Mutation replay succeeds** | Remove from queue. Invalidate relevant TanStack Query keys. Toast: "Synced." |
| **Mutation replay fails (3x)** | Remove from queue with MAX\_RETRIES exceeded. Toast: "Action could not be synced. Please retry." |
| **Session expires while offline** | On next online event, Supabase auth refresh → if fails → SESSION\_INVALID → queue cleared → sign out. |

# **§5  Critical Fixes Required Before Phase 3**

These are confirmed bugs and misalignments found in the existing codebase that will cause production failures if not resolved.

## **5.1  Environment Variable Mismatch — SEVERITY: P0**

**🚨  CRITICAL:** .env.local exports EXPO\_PUBLIC\_SUPABASE\_KEY but src/lib/supabase.ts reads EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY. The Supabase client will silently use an empty string, causing all API calls to fail in the production build.

Fix: Standardise all references to EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY across:

* .env.local — rename EXPO\_PUBLIC\_SUPABASE\_KEY → EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY

* src/lib/supabase.ts — already reads EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY (correct)

* app.config.ts extra block — update key name

* utils/supabase.ts — legacy file, reads EXPO\_PUBLIC\_SUPABASE\_KEY. Delete or align.

* src/constants/config.ts — no supabase key reference (correct, do not add one)

## **5.2  Duplicate Supabase Client — SEVERITY: P0**

**🚨  CRITICAL:** Two supabase.ts files exist: utils/supabase.ts (legacy, root-level) and src/lib/supabase.ts (canonical). Both export a supabase client. Having two Supabase clients creates two separate auth state listeners and two separate session stores — this will cause random sign-out loops.

Fix:

27. Delete utils/supabase.ts entirely.

28. Ensure all imports use: import { supabase } from "@/lib/supabase"

29. Check App.tsx (root) — it imports from "../utils/supabase". App.tsx appears to be a legacy file. Delete it. Expo Router uses app/\_layout.tsx as the entry point.

## **5.3  processLock Removed in Supabase JS 2.39+ — SEVERITY: P1**

**⚠**  utils/supabase.ts passes lock: processLock to createClient. processLock was deprecated and removed in @supabase/supabase-js 2.39. This will throw a TypeScript error and break the build.

Fix: Remove lock: processLock from the createClient options. The canonical src/lib/supabase.ts already omits it correctly.

## **5.4  TabBarIcon Uses require() Inside Component — SEVERITY: P1**

**⚠**  app/(tabs)/\_layout.tsx uses a function component that calls require("react-native") on every render. This is an anti-pattern that breaks Fast Refresh and can cause build failures with Hermes.

Fix: Import View and Text at the top of the file. Replace TabBarIcon placeholder with @expo/vector-icons Ionicons component.

## **5.5  Missing SplashScreen Control — SEVERITY: P1**

**⚠**  app/\_layout.tsx has no SplashScreen.preventAutoHideAsync() call. The splash screen will flash and disappear before authentication bootstrap completes, causing a white screen flicker on every cold start.

Fix: Add to app/\_layout.tsx:

import \* as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync(); // Call before component mount

Then in RootLayout, watch sessionState.status and call SplashScreen.hideAsync() when status \!== "BOOTSTRAPPING".

## **5.6  app.json vs app.config.ts Conflict — SEVERITY: P2**

**⚠**  Both app.json and app.config.ts exist. Expo uses app.config.ts when both are present, but app.json has divergent settings: supportsTablet: true (should be false per spec), NSLocationAlwaysAndWhenInUseUsageDescription (not in app.config.ts), and iosGoogleMapsApiKey (empty string, not needed).

Fix: Delete app.json. app.config.ts is the canonical config. Ensure app.config.ts has all required fields. The always-on location permission string in app.json was a Phase 1 overstep — remove it.

## **5.7  Missing metro.config.js — SEVERITY: P0 for NativeWind**

**🚨  CRITICAL:** NativeWind v4 requires a metro.config.js with withNativeWind() wrapper. Without it, all className props on React Native components are silently ignored — every NativeWind style is a no-op.

Required metro.config.js:

const { getDefaultConfig } \= require('expo/metro-config');

const { withNativeWind } \= require('nativewind/metro');

const config \= getDefaultConfig(\_\_dirname);

module.exports \= withNativeWind(config, { input: './global.css' });

Required global.css:

@tailwind base;

@tailwind components;

@tailwind utilities;

# **§6  Phase 3 — Root Layout \+ Auth Screens  \[COMPLETE\]**

Phase 3 has been fully delivered. This section records what was landed and the outstanding blocker before Phase 4 can begin.

## **6.1  Delivered Files — Phase 3**

| File | Status |
| :---- | :---- |
| **index.js** | DONE — Expo Router entry point. |
| **metro.config.js** | DONE — withNativeWind() pipeline. NativeWind v4 unblocked. |
| **global.css** | DONE — Tailwind directives. |
| **nativewind-env.d.ts** | DONE — className prop type extension. |
| **src/types/env.d.ts** | DONE — EXPO\_PUBLIC\_\* type declarations. |
| **src/constants/config.ts** | DONE — Typed env/config with defaults. |
| **src/lib/query-client.ts** | DONE — Centralised TanStack Query client. |
| **src/lib/sentry.ts** | DONE — Sentry.init() with DSN \+ environment tagging. |
| **app/\_layout.tsx** | DONE — Rewritten: SplashScreen, ErrorBoundary, AuthProvider, ToastProvider. |
| **app/(auth)/login.tsx** | DONE — Validated sign-in form with Zod. |
| **app/(auth)/register.tsx** | DONE — Validated registration form with Zod. |
| **src/api/auth.ts** | DONE — signIn / signUp / signOut / resetPassword. |
| **src/utils/validate.ts** | DONE — Zod schemas for auth forms. |
| **src/utils/errorMap.ts** | DONE — AuthError to human-readable message mapping. |
| **src/components/Button.tsx** | DONE — Primary/secondary/ghost/destructive variants, loading state. |
| **src/components/Input.tsx** | DONE — Controlled input: label, error, secureTextEntry. |
| **src/components/LoadingScreen.tsx** | DONE — Branded loading indicator. |
| **src/components/ErrorBoundary.tsx** | DONE — Sentry-integrated class component. |
| **src/contexts/ToastContext.tsx** | DONE — Imperative global toast system. |
| **src/hooks/useToast.ts** | DONE — useToast() consumer hook. |
| **app/(tabs)/\_layout.tsx** | DONE — Real Ionicons tab bar. Placeholder removed. |
| **app/(tabs)/profile.tsx** | DONE — Auth-aware profile screen. |
| **app/+not-found.tsx** | DONE — 404 fallback route. |
| **app/bathroom/\[id\].tsx** | DONE — Detail route with typed fetcher. |
| **src/api/bathrooms.ts** | DONE — Typed fetcher (RPC query completes in Phase 4). |
| **src/contexts/AuthContext.tsx** | DONE — Runtime drift fixed. |
| **src/lib/supabase.ts** | DONE — Duplicate client resolved. processLock removed. |
| **src/lib/draft-manager.ts** | DONE — Runtime drift fixed. |
| **src/lib/offline-queue.ts** | DONE — Runtime drift fixed. |
| **src/lib/return-intent.ts** | DONE — Runtime drift fixed. |

## **6.2  Phase 3 Outstanding Blocker**

**🚨  CRITICAL:** npm install has NOT been run. No node\_modules, no lockfile refresh, no build verification. This must be the FIRST action before any Phase 4 work begins.

| Task | Command |
| :---- | :---- |
| **Install all dependencies** | npm install |
| **Verify TypeScript compiles** | npm run type-check |
| **Verify lint passes** | npm run lint |
| **Check Expo dep compatibility** | npx expo install \--check |
| **Dev build — Android** | eas build \--platform android \--profile development |
| **Dev build — iOS** | eas build \--platform ios \--profile development |

## **6.3  Carry-Forward to Phase 4 (Not Started in Phase 3\)**

| Feature | Notes |
| :---- | :---- |
| **src/components/OfflineBanner.tsx** | NetInfo-driven sticky offline indicator. |
| **src/hooks/useOfflineSync.ts** | AppState \+ NetInfo listener triggering queue flush. |
| **app/modal/report.tsx** | Report bathroom modal flow. |
| **app/modal/submit-code.tsx** | Code submission modal. |
| **app/modal/add-bathroom.tsx** | Add bathroom multi-step flow (draft-managed). |
| **app/modal/claim-business.tsx** | Business claim flow (draft-managed). |

# **§7  Phase 4 Execution Plan — Map, Search, Favorites, Location**

Next phase scope. Hard dependency: Phase 3 blocker (npm install \+ successful dev build) must be resolved first.

## **7.1  Files to Create or Replace in Phase 4**

| File | Deliverable |
| :---- | :---- |
| **src/hooks/useLocation.ts** | expo-location permission request \+ watchPositionAsync. Foreground only. Feeds LocationContext. |
| **src/contexts/LocationContext.tsx** | Share last-known coordinates app-wide. Prevents duplicate permission requests. |
| **src/hooks/useBathrooms.ts** | useQuery for bathroom list by region. Calls get\_bathrooms\_near RPC. Integrates CacheManager. |
| **src/hooks/useFavorites.ts** | useQuery \+ useMutation for favorites. Optimistic update. Offline queue on network failure. |
| **src/hooks/useOfflineSync.ts** | AppState \+ NetInfo listener. Triggers offlineQueue.process() on foreground \+ connectivity restore. |
| **src/components/MapView.tsx** | MapView wrapper with bathroom marker clustering. Taps open BottomSheet. |
| **src/components/BathroomCard.tsx** | Card: place name, distance, lock/accessible icons, code confidence badge. |
| **src/components/CodeBadge.tsx** | Displays code value or no-code state. Confidence score progress bar. |
| **src/components/OfflineBanner.tsx** | Sticky top banner driven by NetInfo.isConnected. |
| **src/components/BottomSheet.tsx** | Reanimated bottom sheet base via @gorhom/bottom-sheet. |
| **src/api/favorites.ts** | Supabase favorites CRUD: list, add, remove. |
| **supabase/migrations/002\_functions.sql** | get\_bathrooms\_near(lat, lng, radius\_m) RPC using PostGIS ST\_DWithin. |
| **app/(tabs)/index.tsx** | REPLACE — Full map tab: LocationContext, MapView, BottomSheet, bathroom pins. |
| **app/(tabs)/search.tsx** | REPLACE — Search by name/address. Debounced query. BathroomCard list. |
| **app/(tabs)/favorites.tsx** | REPLACE — Authenticated list. Guest empty state with sign-in CTA. |

## **7.2  Phase 4 Build Order**

30. Resolve Phase 3 blocker: npm install \+ type-check \+ lint \+ dev build.

31. Run supabase/migrations/002\_functions.sql to create get\_bathrooms\_near RPC.

32. Implement LocationContext \+ useLocation. Verify permission flow on physical device.

33. Implement src/api/favorites.ts. Verify RLS allows insert/delete for authenticated user.

34. Implement useBathrooms wired to get\_bathrooms\_near \+ CacheManager TTL.

35. Implement useFavorites with optimistic updates \+ offline queue fallback.

36. Implement BathroomCard, CodeBadge, OfflineBanner components.

37. Implement useOfflineSync. Smoke test: kill network, create favorite, restore, verify sync.

38. Implement BottomSheet base component.

39. Implement MapView. Verify markers render on Android emulator.

40. Replace app/(tabs)/index.tsx with full map tab.

41. Replace app/(tabs)/search.tsx with debounced search.

42. Replace app/(tabs)/favorites.tsx with authenticated list \+ guest empty state.

43. Full integration test: guest map browse → sign in → favorite → offline → sync.

# **§8  System Directive — Paste Into Coding AI**

The following block is the complete system directive to paste into a coding AI session to ensure full-context awareness of the Pee-Dom architecture. Update the "Current Phase" line before each new session.

| ACTIVATE \[BUILDER\_PRIME\_MODE\] — PEE-DOM SYSTEM DIRECTIVE You are the Lead Mobile Engineer for Pee-Dom, a bathroom-finder app targeting iOS and Android. You operate with strict architectural discipline. STACK:   Expo SDK 54 | React Native 0.76.5 | TypeScript strict | Expo Router v4 | NativeWind v4 | Supabase | TanStack Query v5 | AsyncStorage COMPLETED PHASES:   Phase 1: Scaffold. Phase 2: Non-visual foundation (DB, RLS, AuthContext, offline queue, cache, drafts). Phase 3: Root layout \+ auth screens (NativeWind, Sentry, validated login/register, UI components, ErrorBoundary, ToastContext, bathroom detail route, all runtime drift fixed). CURRENT PHASE:   Phase 4: Map, Search, Favorites, Location (see §7 for full scope). BLOCKER: Run npm install \+ dev build before writing Phase 4 code. CANONICAL ARCHITECTURAL REFERENCE:   The Pee-Dom Master Launch Manifest (TRD/Blueprint) is the authoritative spec. All design decisions must be reconciled against it. THE 3 LAWS:   1\. Pre-Flight Simulation: Mentally compile every file before writing. Map all import dependencies. Identify all downstream effects.   2\. Native Purity: BANNED: div, span, localStorage, window, alert(). REQUIRED: View, Text, AsyncStorage, Alert.alert(), Platform.OS.   3\. Atomic Replacement: Output ENTIRE file contents only. No partial snippets. No "// ... rest of code". CRITICAL CONSTRAINTS:   \- Guest-intent replay: in-memory only via AuthContext.requireAuth(). NEVER persisted to offline queue.   \- Offline queue: authenticated transient failures only. Zod-validated on load. User-scoped flush. No in-loop sleep.   \- refreshUser() must demote to GUEST on any failure.   \- MutationOutcome type: completed | auth\_required | queued\_retry.   \- Env var standard: EXPO\_PUBLIC\_SUPABASE\_ANON\_KEY (not SUPABASE\_KEY).   \- One supabase client only: src/lib/supabase.ts. Delete utils/supabase.ts.   \- profiles.role is immutable from client. Enforce via RLS check policy. |
| :---- |

Before each session: paste the above block, then append your phase spec. The AI will have full architectural context without re-explaining the foundation.

Pee-Dom Master Launch Manifest  •  Internal Engineering Reference  •  Keep Updated Each Phase