Here is the full implementation plan:

---

## 1. Goal

Replace the thin `ErrorBoundary` with a beta-aware crash screen: text input for user context, a "Submit a Bug" button, beta-contributor framing, and in-place recovery. Submissions go through a new Supabase edge function; reports queue offline via the existing `offlineQueue` singleton.

---

## 2. Assumptions

1. **Auth from SecureStore, not context.** The Supabase session is stored in `expo-secure-store` via `supabaseAuthStorage`. Key: `buildSupabaseAuthStorageKey(supabaseUrl)` → `sb-${projectRef}-auth-token`. The stored JSON contains `access_token`, readable at button-press time without hooks.

2. **`sentry_event_id` is always null in beta.** `Sentry.init()` has `enabled: isProductionEnv`. `Sentry.lastEventId()` returns nothing in non-production. The client never calls it; the field is nullable everywhere.

3. **Guest `device_id` from `@stallpass/analytics_anonymous_id`.** This AsyncStorage key is already a stable per-device identifier. If absent, the boundary creates and persists a fallback guest ID. This `device_id` doubles as the queue `userId` for unauthenticated submitters.

4. **`offlineQueue.enqueue()` is callable from a class component.** It's a singleton module export — no hooks required.

5. **`screen_name = 'unknown'` for pre-router crashes is acceptable.** `setActiveScreen()` runs only after `RootNavigator` mounts. Bootstrap crashes get `'unknown'`, which is documented and fine for beta triage.

6. **No new test dependencies.** Tests cover pure logic only (Zod schemas, PII scrubbing, key uniqueness).

---

## 3. Files to Inspect (done)

`src/components/ErrorBoundary.tsx` · `app/_layout.tsx` · `src/lib/offline-queue.ts` · `src/hooks/useOfflineSync.ts` · `src/utils/validate.ts` · `src/types/index.ts` · `src/lib/storage.ts` · `src/lib/supabase-auth-storage.ts` · `src/lib/supabase-auth-storage-shared.ts` · `src/lib/sentry.ts` · `src/constants/config.ts` · `supabase/functions/delete-account/index.ts` · `supabase/tests/business_security.sql`

---

## 4. Files to Change / Create

**Changed:**

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `'bug_report'` to `MutationType`; add `BugReportMutationPayload` interface |
| `src/utils/validate.ts` | Add `'bug_report'` to `queuedMutationSchema` enum; add `bugReportQueuePayloadSchema` |
| `src/components/ErrorBoundary.tsx` | Full rewrite: form UI, beta copy, submit/dismiss, async submit handler |
| `src/hooks/useOfflineSync.ts` | Add `'bug_report'` mutation case; suppress toast for bug-report-only syncs |
| `app/_layout.tsx` | `usePathname()` + `setActiveScreen()` in `RootNavigator` |

**Created:**

| File | Purpose |
|------|---------|
| `src/utils/active-screen-tracker.ts` | Module-level `getActiveScreen()` / `setActiveScreen()` singleton |
| `src/api/bug-reports.ts` | SecureStore token reader, payload builder, edge function caller |
| `supabase/migrations/044_beta_bug_reports.sql` | Table, idempotency index, rate-limit index, RLS |
| `supabase/functions/submit-bug-report/index.ts` | Rate limit · PII scrub · optional auth · service-role upsert |
| `__tests__/bug-report-queue.test.ts` | Pure logic: Zod schema, PII regex, key uniqueness |
| `supabase/tests/beta_bug_reports_security.sql` | RLS: anon/auth INSERT blocked, user can read own rows only |

---

## 5. Step-by-Step Implementation

### Step 1 — `src/utils/active-screen-tracker.ts`
Module-level singleton. `getDerivedStateFromError` calls `getActiveScreen()` synchronously when the crash fires.
```ts
let _activeScreen = 'unknown';
export const setActiveScreen = (s: string) => { _activeScreen = s.length > 0 ? s : 'unknown'; };
export const getActiveScreen = () => _activeScreen;
```

### Step 2 — `src/types/index.ts`
Add `'bug_report'` to `MutationType` and a new `BugReportMutationPayload` interface with: `schema_version: 1`, `idempotency_key`, `device_id`, `screen_name`, `error_message`, `error_stack`, `user_comment`, `app_version`, `os_name`, `os_version`, `device_model`, `captured_at`, `sentry_event_id: string | null`.

### Step 3 — `src/utils/validate.ts`
- Add `'bug_report'` to the `queuedMutationSchema` type enum
- Add `bugReportQueuePayloadSchema` (Zod, mirrors the interface; `error_stack` max 10,000; `user_comment` max 1,000; `sentry_event_id` nullable)

### Step 4 — `src/api/bug-reports.ts`
Three functions:
- `readStoredAuthToken()` — reads `expo-secure-store` via `buildSupabaseAuthStorageKey`, parses `access_token`, returns `null` on any failure
- `readOrCreateDeviceId()` — reads `ANALYTICS_ANONYMOUS_ID` from `storage`, falls back to a `@stallpass/bug_report_guest_id` in AsyncStorage, generates one if absent
- `buildBugReportPayload(opts)` — assembles the payload using `Device.*`, `Constants.expoConfig.version`, truncates fields, sets `sentry_event_id: null`
- `submitBugReportToEdge(payload)` — POSTs to `/functions/v1/submit-bug-report` with `apikey` header and optional `Authorization`

### Step 5 — `supabase/migrations/044_beta_bug_reports.sql`
```sql
create table public.beta_bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  device_id text not null,
  screen_name text not null default 'unknown',
  error_message text not null default '',
  error_stack text not null default '',
  user_comment text not null default '',
  app_version text not null default '',
  os_name text not null default '',
  os_version text not null default '',
  device_model text not null default '',
  sentry_event_id text,
  idempotency_key text not null,
  schema_version smallint not null default 1,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index beta_bug_reports_idempotency_key_idx on public.beta_bug_reports (idempotency_key);
create index beta_bug_reports_device_created_idx on public.beta_bug_reports (device_id, created_at desc);
alter table public.beta_bug_reports enable row level security;
-- No INSERT policy. Authenticated SELECT for own rows only.
create policy "Users can view own bug reports" on public.beta_bug_reports
  for select to authenticated using (user_id = auth.uid());
```

### Step 6 — `supabase/functions/submit-bug-report/index.ts`
- 64 KB body cap (check `content-length` and raw text length)
- Rate limit: count rows for `device_id` in past hour via service-role client; reject with 429 if ≥ 5
- Optional auth: if `Authorization` header present, call `userClient.auth.getUser()` to resolve `user_id`; null for guests
- PII scrub: `EMAIL_REGEX.replace('[redacted]')` on `user_comment` and `error_stack`
- Upsert with `{ onConflict: 'idempotency_key', ignoreDuplicates: true }` — offline queue retries are idempotent
- Returns `{ success: true }`

### Step 7 — `src/components/ErrorBoundary.tsx`
**New state:** `capturedScreenName`, `idempotencyKey`, `userComment`, `isSubmitting`, `hasSubmitted`, `submitError`.

**`getDerivedStateFromError` (static):** captures `getActiveScreen()` and generates the idempotency key at crash time.

**`handleSubmit` (async class method):**
1. `readOrCreateDeviceId()`
2. `buildBugReportPayload(…)`
3. Try `submitBugReportToEdge(payload)` → on failure, `offlineQueue.enqueue('bug_report', payload, deviceId)`
4. Set `hasSubmitted: true`

**Render — three states:**
- No error → `children`
- Error, not submitted → TextInput ("What were you doing?") + "Submit a Bug" button + "Skip & Retry" button + beta copy: *"You're helping build StallPass — your name will be part of its story."*
- Submitted → "Thanks for reporting." + beta copy + "Retry App Shell"

### Step 8 — `app/_layout.tsx`
Inside `RootNavigator`, after existing hooks:
```ts
const pathname = usePathname();
useEffect(() => { setActiveScreen(pathname); }, [pathname]);
```

### Step 9 — `src/hooks/useOfflineSync.ts`
Add `case 'bug_report':` — parse with `bugReportQueuePayloadSchema.safeParse`; drop if invalid; call `submitBugReportToEdge`; return `false` on transient error (retry), `true` otherwise. Suppress "Offline changes synced" toast for bug-report-only sync cycles by tracking non-`bug_report` processed count separately.

### Step 10 — `__tests__/bug-report-queue.test.ts`
Pure node tests: schema validation, PII regex, idempotency key uniqueness (100-iteration set check).

### Step 11 — `supabase/tests/beta_bug_reports_security.sql`
Four test blocks (pattern from `business_security.sql`): anon INSERT blocked, authenticated INSERT blocked, user reads own rows (0 rows, no error), user cannot read other user's rows (filtered by RLS).

---

## 6. Risks

| # | Risk | Sev | Mitigation |
|---|------|-----|------------|
| 1 | SecureStore unavailable (locked device, emulator) | MED | `readStoredAuthToken` wraps everything in try/catch; proceeds as guest |
| 2 | Guest queue items survive sign-out (keyed to `device_id` not `user_id`) | LOW | Correct by design — guest bug reports should still sync. Document. |
| 3 | Crash loop re-uses same idempotency key | LOW | `ignoreDuplicates: true` on upsert; new crash event = new key |
| 4 | Rate limit hit during developer testing | LOW | 429 treated as drop-after-retries; no crash |
| 5 | `screen_name = 'unknown'` for bootstrap crashes | INFO | Documented; acceptable for triage |
| 6 | "Offline changes synced" toast fires for bug-report-only syncs | LOW | Guard toast on non-`bug_report` processed count |

---

## 7. Validation Checklist

**Logic:** schema accepts/rejects correctly · PII scrubber strips emails · 100 unique idempotency keys · `'bug_report'` in both `MutationType` and `queuedMutationSchema`

**DB:** anon INSERT blocked · authenticated INSERT blocked · service-role INSERT succeeds · duplicate idempotency key → no error, no duplicate row

**Edge function:** missing `device_id` → 400 · body > 64 KB → 413 · 6th report/hour → 429 · no JWT → `user_id = null` · valid JWT → resolved · PII scrubbed in stored fields

**ErrorBoundary UI:** form renders · beta copy present · submit disabled while loading · success state shown · dismiss resets in-place · empty comment accepted · works offline · works unauthenticated

**Offline queue:** queued while offline → sent on reconnect · transient error retries · malformed payload dropped · no "Offline changes synced" toast · survives sign-out

**Screen tracking:** pathname changes update `getActiveScreen()` · `screen_name` captured at crash time · bootstrap crash = `'unknown'`
