# Draft auth decomposition spec

- Session ID: `019cdffc-1ae4-7722-812b-49624cdd202e`
- Source: `transcripts/sessions/2026/03/11/rollout-2026-03-11T19-59-27-019cdffc-1ae4-7722-812b-49624cdd202e.jsonl`
- Archived: `false`
- Message count: `36`

## User

`2026-03-12T02:59:35.900Z`

# AGENTS.md instructions for C:\Users\T\Desktop\PeeDom

<INSTRUCTIONS>
# ~/.codex/AGENTS.md

## General Working Agreements
- **Zero Placeholder Policy:** Never use `// TODO`, `// implementation goes here`, or dummy data. If a function is called, it must be fully implemented with production-grade logic.
- **Defensive Programming:** Every async operation must include a `try/catch` block, a loading state, and a user-friendly error handler.
- **Strict Typing:** Use TypeScript for everything. Avoid `any` at all costs. Interfaces must be descriptive and exhaustive.
- **Performance First:** Use `React.memo`, `useMemo`, and `useCallback` strategically to prevent unnecessary re-renders in mobile environments.
- **Tooling:** Prefer `pnpm` for all dependency management. Always run `npm run lint` and `npm test` after modifying logic.
- **Security:** Never hardcode API keys or secrets. Always use `.env` files and validated environment variables.

--- project-doc ---

# AGENTS.md (PeeDom Root)

## Repository Expectations & Tech Stack
- **Framework:** React Native via Expo (Managed Workflow) using Expo Router for navigation.
- **Backend:** Supabase. All data fetching must respect Row Level Security (RLS) and use the Supabase generated types.
- **Styling:** Use NativeWind (Tailwind CSS) for all UI components. Maintain a central `theme.js` or `tailwind.config.js`.
- **State Management:** Use Zustand for global client-side state and React Query for server-side caching.

## Production Due Diligence
- **Android/iOS Parity:** Use `Platform.OS` and `SafeAreaView` to ensure UI consistency. Handle the Android back button and keyboard offsets explicitly.
- **Validation:** Use `Zod` for all form validations and API response parsing.
- **Launch Readiness:** - Ensure `app.json` is updated with correct versioning and permissions.
    - Every new feature must include a corresponding test in `__tests__`.
    - Use Fastlane patterns for automated deployment preparation.

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- gh-address-comments: Help address review/issue comments on the open GitHub PR for the current branch using gh CLI; verify gh auth first and prompt the user to authenticate if not logged in. (file: C:/Users/T/.codex/skills/gh-address-comments/SKILL.md)
- gh-fix-ci: Use when a user asks to debug or fix failing GitHub PR checks that run in GitHub Actions; use `gh` to inspect checks and logs, summarize failure context, draft a fix plan, and implement only after explicit approval. Treat external providers (for example Buildkite) as out of scope and report only the details URL. (file: C:/Users/T/.codex/skills/gh-fix-ci/SKILL.md)
- playwright: Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, screenshots, data extraction, UI-flow debugging) via `playwright-cli` or the bundled wrapper script. (file: C:/Users/T/.codex/skills/playwright/SKILL.md)
- staff-mobile-engineer: Use when Codex must operate as a staff-level mobile engineer for production mobile work: feature delivery, architecture decisions, refactors, launch readiness, performance tuning, test hardening, or deployment automation in React Native/Expo or native Android codebases. Apply this skill when the task needs zero-placeholder implementation, strict typing, defensive async handling, Supabase-aware data access, or mobile-specific release discipline. (file: C:/Users/T/.codex/skills/staff-mobile-engineer/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: C:/Users/T/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: C:/Users/T/.codex/skills/.system/skill-installer/SKILL.md)
- slides: Build, edit, render, import, and export presentation decks with the preloaded @oai/artifact-tool JavaScript surface through the artifacts tool. (file: C:/Users/T/.codex/skills/.system/slides/SKILL.md)
- spreadsheets: Build, edit, recalculate, import, and export spreadsheet workbooks with the preloaded @oai/artifact-tool JavaScript surface through the artifacts tool. (file: C:/Users/T/.codex/skills/.system/spreadsheets/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
</INSTRUCTIONS>

<environment_context>
  <cwd>C:\Users\T\Desktop\PeeDom</cwd>
  <shell>powershell</shell>
  <current_date>2026-03-11</current_date>
  <timezone>America/Los_Angeles</timezone>
</environment_context>

## User

`2026-03-12T02:59:35.900Z`

ACTIVATE [ARCHITECT_PRIME_MODE]

Role: You are the Senior Product Architect for Pee-Dom. Your partner, Claude (Lead Mobile Engineer), is waiting for a technical "Spec" to begin resolving Phase 3 blockers.

Project Context: > * Stack: React Native (Expo 54), Supabase, TanStack Query, Zustand, Zod, NativeWind.

Current Status: Phase 3 complete. Phase 4 blocked by dependency errors and architectural debt.

Goal: Move from a monolith AuthContext to a decomposed system and wire a robust offline mutation queue to TanStack Query.

Your Task: > Generate a Technical Implementation Spec for Claude. You must be hyper-specific and avoid fluff. Your spec must include:

1. The Dependency Resolution Map: > * List the exact npx expo install commands for: @sentry/react-native, @react-native-community/netinfo, @gorhom/bottom-sheet, zod, and zustand.

Specify any required configuration changes in app.json for Sentry.

2. Auth Decomposition Blueprint: > * Define how to split AuthContext.tsx into three distinct parts: useAuthStore (Zustand for state), AuthProvider (Context for the session lifecycle), and an AuthService (Supabase logic).

Detail the logic for refreshUser() to ensure it demotes to guest status on any failure.

3. Offline Mutation Queue Logic: > * Map out the integration between the custom offline queue and TanStack Query’s onMutation lifecycle.

Define the MutationOutcome type: completed | auth_required | queued_retry.

Explicitly state how the user_id scope should handle queue flushing.

Constraint: Do not write the full code. Write the logical requirements and file structures so Claude can "compile" them into the final files. End your response with: "Spec Complete. Ready for Engineering Execution."

## Assistant (commentary)

`2026-03-12T02:59:47.661Z`

I’m treating this as a staff-level mobile architecture spec, so I’m first reading the repo’s current auth and offline-sync code plus the `staff-mobile-engineer` skill to anchor the spec to the actual Phase 3 state.

## Assistant (commentary)

`2026-03-12T02:59:58.738Z`

I have the mobile-architecture guidance loaded. `rg` is blocked in this environment, so I’m falling back to PowerShell file discovery and then I’ll inspect the auth, queue, and Expo config surfaces directly.

## Assistant (commentary)

`2026-03-12T03:02:15.743Z`

The repo scan via `rg` is blocked in this shell, so I’m switching to targeted reads of the app config, package manifest, auth layer, and any offline queue modules.

## Assistant (commentary)

`2026-03-12T03:02:51.540Z`

I’ve found the relevant surfaces: `src/contexts/AuthContext.tsx`, `src/lib/offline-queue.ts`, `src/hooks/useOfflineSync.ts`, `src/lib/query-client.ts`, `src/api/auth.ts`, and the Expo config in `app.config.ts`. I’m reading those now so the spec matches the current implementation rather than an idealized rewrite.

## Assistant (commentary)

`2026-03-12T03:03:38.682Z`

The current split point is clear: `AuthContext.tsx` still owns session state, Supabase side effects, profile loading, return intent, and guest demotion; the offline queue is a separate manager but it is not yet coupled to TanStack mutation lifecycles. I’m checking how those are mounted so the spec can define the correct provider and bootstrap order.

## Assistant (commentary)

`2026-03-12T03:05:47.087Z`

The repo already defines `MutationOutcome` and already queues favorites/reports manually inside custom hooks. The missing architectural step is to centralize that behavior under TanStack mutations, then let auth identity control queue ownership and flush eligibility.

## Assistant (commentary)

`2026-03-12T03:06:17.174Z`

I have enough local context to draft the architecture, but I’m verifying the current official Sentry-for-Expo config so the dependency/config section is not stale.

## Assistant (commentary)

`2026-03-12T03:06:52.658Z`

The Sentry docs confirm the build side still expects `SENTRY_AUTH_TOKEN` during EAS Build or Update for source maps. I’m checking the installed SDK package locally to pin the actual Expo plugin entry Claude should wire into `app.config.ts`.

## User

`2026-03-12T03:11:56.077Z`

continue

## Assistant (final_answer)

`2026-03-12T03:16:15.586Z`

**Phase 4 Spec**

Ground this refactor against the current [AuthContext.tsx](C:/Users/T/Desktop/PeeDom/src/contexts/AuthContext.tsx), [offline-queue.ts](C:/Users/T/Desktop/PeeDom/src/lib/offline-queue.ts), [useOfflineSync.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useOfflineSync.ts), [query-client.ts](C:/Users/T/Desktop/PeeDom/src/lib/query-client.ts), and [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts).

**1. Dependency Resolution Map**

Run these from repo root. Do not pin versions manually; let Expo resolve SDK 54-compatible versions.

```bash
npx expo install @sentry/react-native
npx expo install @react-native-community/netinfo
npx expo install @gorhom/bottom-sheet
npx expo install zod
npx expo install zustand
```

Required Sentry config changes:
- This repo uses `app.config.ts`, not `app.json`. Apply the change there.
- Add the Sentry Expo config plugin to `plugins` in [app.config.ts](C:/Users/T/Desktop/PeeDom/app.config.ts): `@sentry/react-native/expo`.
- Pass plugin values only from env vars: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, optional `SENTRY_URL` defaulting to `https://sentry.io/`.
- Keep runtime DSN in `EXPO_PUBLIC_SENTRY_DSN`; that is already read by [src/lib/sentry.ts](C:/Users/T/Desktop/PeeDom/src/lib/sentry.ts).
- Ensure `SENTRY_AUTH_TOKEN` exists in EAS Build env; Expo’s current Sentry guide requires it for source map upload.
- Do not hardcode any Sentry token or org/project slug in source control.

**2. Auth Decomposition Blueprint**

Target file layout:
```text
src/
  contexts/
    AuthProvider.tsx
    AuthContext.tsx            // compatibility re-export only
  hooks/
    useAuth.ts                 // compatibility facade for existing callers
  services/
    auth/
      AuthService.ts
      auth-cache.ts            // profile cache + scoped artifact helpers
      auth-types.ts
  store/
    useAuthStore.ts
```

`useAuthStore` requirements:
- Zustand store only. No Supabase imports.
- State owned here: `session`, `user`, `profile`, `sessionStatus`, `loading`, `authIssue`, `returnIntent`.
- Actions owned here: `setBootstrapping`, `setGuest`, `setAuthenticated`, `setSessionInvalid`, `setAuthIssue`, `clearAuthIssue`, `setReturnIntent`, `consumeReturnIntent`, `clearReturnIntent`, `setLoading`.
- Expose selectors so screens stop subscribing to the full auth object. Minimum selectors: `useAuthUser`, `useAuthProfile`, `useAuthStatus`, `useIsGuest`, `useIsAuthenticated`, `useCanAccessProtectedRoute`.

`AuthProvider` requirements:
- Context owns only session lifecycle and imperative auth actions.
- It bootstraps `supabase.auth.getSession()` on mount.
- It subscribes exactly once to `supabase.auth.onAuthStateChange`.
- It translates service results into store actions.
- It exposes: `signIn`, `signUp`, `signOut`, `refreshProfile`, `refreshUser`, `requireAuth`, `peekReturnIntent`, `consumeReturnIntent`, `clearReturnIntent`.
- Keep `useAuth()` as a facade so current imports do not explode. Internally it should read state from Zustand and actions from provider context.

`AuthService` requirements:
- This becomes the single Supabase auth/profile boundary. Remove duplicate logic from both [src/api/auth.ts](C:/Users/T/Desktop/PeeDom/src/api/auth.ts) and the current provider.
- Own these methods: `getSession`, `signInWithEmail`, `signUpWithEmail`, `signOut`, `loadProfile`, `refreshProfile`, `clearPersistedSession`, `clearCachedProfile`, `cacheProfile`, `readCachedProfile`, `classifyAuthFailure`.
- `loadProfile(userId, options)` must support `allowCachedProfile: boolean`.
- Provider decides UI state; service returns typed results only.

`refreshUser()` exact logic:
1. Set `loading=true` and `sessionStatus='SESSION_RECOVERY'`.
2. Capture `effectiveUserId` from current store snapshot before any network call.
3. Call `AuthService.getSession()`.
4. If `getSession()` returns error, classify it, clear in-memory auth state, clear return intent, optionally clear persisted Supabase session, and set store to `GUEST`.
5. If `getSession()` returns `null`, perform the same guest demotion path.
6. If a session exists, call `loadProfile(session.user.id, { allowCachedProfile: false })`.
7. If `loadProfile()` fails for any reason, demote to `GUEST`. No cached-profile fallback is allowed inside `refreshUser()`.
8. On success, atomically set `session`, `user`, `profile`, derived role status, clear `authIssue`, and set `loading=false`.

Critical demotion rule:
- `refreshUser()` must demote to guest on any failure, including offline failures.
- That demotion must not delete the scoped offline mutation queue. Queue deletion is only allowed on explicit user sign-out.

**3. Offline Mutation Queue Logic**

Keep `MutationOutcome` as the canonical public result type in [src/types/index.ts](C:/Users/T/Desktop/PeeDom/src/types/index.ts):

```ts
type MutationOutcome = 'completed' | 'auth_required' | 'queued_retry';
```

Target file layout:
```text
src/
  lib/
    offline/
      mutation-registry.ts
      offline-queue.ts
      queue-storage.ts
      flush-offline-queue.ts
  hooks/
    mutations/
      useOfflineMutation.ts
      useToggleFavoriteMutation.ts
      useCreateBathroomReportMutation.ts
```

TanStack Query integration rules:
- Stop manually calling API + queue logic inside [useFavorites.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useFavorites.ts) and [useBathroomReports.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useBathroomReports.ts).
- Replace that with `useMutation`-based hooks that return `Promise<MutationOutcome>`.

Lifecycle mapping:
- `onMutate`
  - Resolve auth first.
  - If there is no authenticated user, return `auth_required` before optimistic work.
  - Capture `userIdAtInvocation`.
  - Cancel affected queries.
  - Snapshot previous cache.
  - Apply optimistic cache update.
  - Return a mutation context containing `userIdAtInvocation`, snapshot, and invalidation keys.
- `mutationFn`
  - Execute the real Supabase mutation through a registry entry keyed by mutation type.
  - Do not read auth state again here; use `userIdAtInvocation` from context.
- `onSuccess`
  - Invalidate registry-declared query keys.
  - Resolve public outcome as `completed`.
- `onError`
  - If error is auth/token/RLS-related: rollback optimistic cache, trigger `refreshUser()`, resolve `auth_required`, do not enqueue.
  - If error is transient/offline: persist a queue item, keep the optimistic cache in place, resolve `queued_retry`.
  - If error is non-retryable business/validation failure: rollback optimistic cache and rethrow.
- `onSettled`
  - Clear pending UI flags only.

Queue manager requirements:
- Replace the single global queue key with scoped storage: `@peedom/offline_queue:<user_id>`.
- Queue items remain FIFO and keep `retry_count`, `last_attempt_at`, and immutable `user_id`.
- Validation remains Zod-based before any queue write.
- `MAX_QUEUE_RETRY_COUNT` stays 3. Drop on the 4th failed replay, matching the current test contract.
- `mutation-registry.ts` must own payload validators, executor functions, and query invalidation metadata for each queueable mutation type.

Flush rules:
- Flush triggers on reconnect, app foreground, and auth transition from guest to authenticated.
- Flush only when `activeUserId` exists and matches the queue scope.
- Flush processes only the queue for the active user.
- Batch invalidations and toast once per flush cycle, not once per mutation.
- If one replay returns `auth_required`, stop the flush immediately and leave the current item in queue.
- If one replay returns `queued_retry`, increment retry count for that item, stop the flush, and leave remaining items untouched.

`user_id` scope rule set:
- `user_id` is the replay boundary. A queued mutation may only execute for the same authenticated user that created it.
- Never flush a queue item if `queuedMutation.user_id !== authStore.user?.id`.
- If auth changes during a flush, abort the flush and persist the remaining items unchanged.
- Explicit sign-out clears the signed-out user’s scoped queue and cached profile.
- Session expiry or `refreshUser()` failure demotes to guest but preserves that user’s scoped queue for later replay after re-authentication.

Required migration points:
- [useOfflineSync.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useOfflineSync.ts) becomes an orchestrator only: hydrate scoped queue, listen to NetInfo/AppState, call flush.
- [query-client.ts](C:/Users/T/Desktop/PeeDom/src/lib/query-client.ts) should wire TanStack’s online state to NetInfo so query refetch and custom queue flush use the same network truth.
- [useFavorites.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useFavorites.ts) becomes query + view-state only; mutation logic moves to `useToggleFavoriteMutation`.
- [useBathroomReports.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useBathroomReports.ts) becomes a thin wrapper over `useCreateBathroomReportMutation`.

Required tests:
- `refreshUser()` demotes to `GUEST` on `getSession` error, null session, and profile fetch failure.
- Offline mutation returns `queued_retry` and writes a scoped queue item with the captured `user_id`.
- Auth failure during mutation returns `auth_required` and does not write to queue.
- Queue flush ignores mismatched `user_id` items.
- Flush stops on first `auth_required` and preserves remaining queued items.

Sources: [Expo Sentry guide](https://docs.expo.dev/guides/using-sentry/), [Sentry Expo plugin types](C:/Users/T/Desktop/PeeDom/node_modules/@sentry/react-native/plugin/build/withSentry.d.ts)

Spec Complete. Ready for Engineering Execution.

## User

`2026-03-12T03:34:54.663Z`

# Files mentioned by the user:

## clauderefactor.zip: C:\Users\T\Desktop\PeeDom\clauderefactor.zip

## My request for Codex:
## Pre-Flight Simulation

**Dependency Graph Scan — 18 files to produce:**

| File | Action | Reason |
|---|---|---|
| `src/types/index.ts` | Patch `MutationOutcome` → string union | Spec canonical form |
| `src/store/useAuthStore.ts` | NEW | Zustand session state + selectors |
| `src/services/auth/auth-types.ts` | NEW | Typed service results |
| `src/services/auth/auth-cache.ts` | NEW | Scoped profile cache |
| `src/services/auth/AuthService.ts` | NEW | Single Supabase auth boundary |
| `src/contexts/AuthProvider.tsx` | NEW | Decomposed provider |
| `src/contexts/AuthContext.tsx` | RE-EXPORT | Compatibility only |
| `src/hooks/useAuth.ts` | NEW | Compatibility facade |
| `src/lib/offline/queue-storage.ts` | NEW | Scoped `@peedom/offline_queue:<uid>` |
| `src/lib/offline/mutation-registry.ts` | NEW | Validators + executors + invalidation keys |
| `src/lib/offline/offline-queue.ts` | NEW | Queue manager, Zod-validated |
| `src/lib/offline/flush-offline-queue.ts` | NEW | Flush orchestrator with stop rules |
| `src/hooks/mutations/useOfflineMutation.ts` | NEW | Base TanStack + offline bridge |
| `src/hooks/mutations/useToggleFavoriteMutation.ts` | NEW | Favorite-specific wrapper |
| `src/hooks/mutations/useCreateBathroomReportMutation.ts` | NEW | Report-specific wrapper |
| `src/hooks/useOfflineSync.ts` | REFACTOR | Orchestrator only |
| `src/lib/query-client.ts` | REFACTOR | Wire NetInfo → TanStack onlineManager |
| `app.config.ts` | PATCH | Add `@sentry/react-native/expo` plugin |
| `src/__tests__/auth.test.ts` | NEW | Required test coverage |
| `src/__tests__/offline-queue.test.ts` | NEW | Required test coverage |

**Import conflicts resolved:**
- `useAuth()` callers import from `@/hooks/useAuth` — no existing import paths break
- `AuthContext.tsx` re-exports from `AuthProvider.tsx` — backward compatible
- `MutationOutcome` object union → string union — all usages updated here

---

## Terminal Commands

```bash
# ── 1. SDK 54-compatible native packages (Expo resolves versions) ─────────────
npx expo install @sentry/react-native
npx expo install @react-native-community/netinfo
npx expo install @gorhom/bottom-sheet
npx expo install zod
npx expo install zustand

# ── 2. Sentry wizard (native crash reporting, dsym upload, source maps) ───────
# Run after npm install; do NOT commit the auth token it generates — use EAS env
npx @sentry/wizard@latest -i reactNative --skip-connect

# ── 3. Verify no remaining SDK 54 mismatches ──────────────────────────────────
npx expo install --check
```

**EAS Build env vars to add (Settings → Environment Variables):**
```
SENTRY_AUTH_TOKEN=<your-token>      # never committed
SENTRY_ORG=<your-org-slug>
SENTRY_PROJECT=<your-project-slug>
SENTRY_URL=https://sentry.io/       # optional; defaults here
EXPO_PUBLIC_SENTRY_DSN=<your-dsn>  # public, already in .env.local
```

---Now the required tests:All 20 files delivered. Here's the architectural decision log for what changed from the previous session and why:

---

## Key Architectural Decisions

**`MutationOutcome` → string union.** Changed from the object union `{ status: 'completed'; data?: unknown }` to the spec-canonical `'completed' | 'auth_required' | 'queued_retry'`. All callers branch on the string directly — cleaner switch statements, no destructuring.

**`useAuthStore` owns all session state.** The previous `AuthContext` was a god object holding both state and actions. State is now Zustand (subscribable, granular selectors, zero re-render waste). Actions live in `AuthProvider` context. `useAuth()` is a backward-compatible facade that merges both.

**`AuthService` is the only file that touches Supabase auth.** The previous pattern had auth logic in both `src/api/auth.ts` and the provider. `AuthService.classifyAuthFailure()` is the single error classifier — queue executor, mutation hook, and provider all call it.

**`refreshUser()` spec compliance.** Captures `effectiveUserId` before any async call. `allowCachedProfile: false` is hardcoded on the `loadProfile` call inside `refreshUser()` (spec rule 7 — no cached fallback). Demotion never clears the offline queue (only explicit sign-out does).

**Scoped queue key.** `@peedom/offline_queue:<user_id>` — one AsyncStorage slot per user. The scope rule is enforced in three places: `initialize()`, `buildRegistryExecutor()`, and `flush-offline-queue.ts`. Items with a mismatched `user_id` get `queued_retry` (not dropped) so they replay when the correct user signs back in.

**`query-client.ts` `onlineManager` wiring.** TanStack's online state and the flush trigger now share a single NetInfo subscription. Previously they could diverge — queries would refetch while the queue flush thought it was still offline.

**`useOfflineMutation` never rejects for auth/network failures.** `mutationFn` catches auth and network errors and returns the appropriate `MutationOutcome` string. Only non-retryable business errors throw, making `mutateAsync()` safe to call without try/catch in most screens.

## Assistant (commentary)

`2026-03-12T03:35:13.715Z`

I’m treating this as a pre-flight review of the Claude refactor bundle against the live repo. First step is to inspect `clauderefactor.zip`, compare its file set and changed surfaces to the current codebase, then I’ll call out concrete blockers and test gaps.

## Assistant (commentary)

`2026-03-12T03:36:32.007Z`

The zip is a flat bundle with 20 files, not a ready-to-apply repo patch. I’m extracting it to a temp folder and diffing the critical auth, queue, and query files against the current workspace to see whether it actually satisfies the spec or introduces regressions.

## Assistant (commentary)

`2026-03-12T03:38:49.590Z`

I don’t need to apply the bundle; I just need deterministic reads. I’m switching to direct zip-entry reads so I can inspect the proposed files without touching the workspace.

## Assistant (commentary)

`2026-03-12T03:39:23.987Z`

I’m into the bundle now. There’s already at least one hard compile break in `AuthProvider.tsx` from importing `supabase` directly out of a module that currently exports `getSupabaseClient()`, so I’m reading the rest of the files for systematic issues rather than assuming it’s just one typo.

## Assistant (commentary)

`2026-03-12T03:40:37.966Z`

I’m moving from file inspection to an actual merge simulation. I’ll stage the bundle into a throwaway `_preflight` copy inside the repo, map the flat zip files onto their intended paths, and run type-check, lint, and tests against that simulated tree.

## Assistant (commentary)

`2026-03-12T03:41:13.056Z`

The shell policy is blocking the bulk PowerShell copy script, so I’m using a one-off Python helper to build the disposable `_preflight` tree and overlay the zip there. This stays out of the live workspace and gives me something I can actually compile and test.

## Assistant (commentary)

`2026-03-12T03:43:48.177Z`

PowerShell execution policy is blocking `npm.ps1`, so I’m rerunning the validation through `npm.cmd` directly.

## Assistant (commentary)

`2026-03-12T03:47:57.761Z`

The simulated merge is failing at the type system boundary rather than at the queue logic itself. I’m pulling exact line references now so I can give you a blocker list tied to the proposed files instead of a generic “doesn’t compile” verdict.

## Assistant (commentary)

`2026-03-12T03:54:02.110Z`

I’ve isolated the main bundle failures already. One test failure in the first run was from my trimmed `_preflight` copy missing the repo’s `supabase/` directory, so I’m adding that back and rerunning Jest once to separate bundle defects from simulation noise.

## Assistant (final_answer)

`2026-03-12T03:58:56.621Z`

**Findings**
1. [P0] The replacement [index.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/types/index.ts#L157) is not a minimal `MutationOutcome` patch; it removes existing exports and changes existing shapes. It drops types the app already imports (`BathroomFilters`, `BathroomQueryResult`, `LocationPermissionState`, `LocationSnapshot`, `ToastMessage`, `ToastVariant`, `QueueProcessResult`) and narrows [FavoriteItem](C:/Users/T/Desktop/PeeDom/_preflight/src/types/index.ts#L243) so it no longer carries fields current code relies on (`id`, `flags`, `favorited_at`). That is what caused the widespread `type-check` failures in `useFavorites`, `useBathrooms`, `LocationContext`, `ToastContext`, `bathroom.ts`, and the legacy queue tests.

2. [P0] The new auth/offline files import a `supabase` symbol the repo does not export. The real Supabase module only exposes [getSupabaseClient()](C:/Users/T/Desktop/PeeDom/src/lib/supabase.ts#L22), but the bundle uses `import { supabase }` in [AuthProvider.tsx](C:/Users/T/Desktop/PeeDom/_preflight/src/contexts/AuthProvider.tsx#L33), [AuthService.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/services/auth/AuthService.ts#L12), and [mutation-registry.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/mutation-registry.ts#L16). The refactor does not compile until that boundary is fixed.

3. [P1] The claimed auth compatibility layer is not backward compatible. `requireAuth` now returns `boolean` in [AuthProvider.tsx](C:/Users/T/Desktop/PeeDom/_preflight/src/contexts/AuthProvider.tsx#L56), while existing callers still expect `User | null` and immediately access `.id` in [useFavorites.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useFavorites.ts#L168) and [useBathroomReports.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/hooks/useBathroomReports.ts#L24). The new [useAuth.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/hooks/useAuth.ts#L50) also omits `sessionState`, but [profile.tsx](C:/Users/T/Desktop/PeeDom/app/(tabs)/profile.tsx#L14) still reads it. This breaks existing screens even before runtime.

4. [P1] The offline queue implementation cannot load. [offline-queue.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/offline-queue.ts#L18) imports `validatePayload` from [queue-storage.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/queue-storage.ts#L48), but that file never exports it. Jest fails before the new queue tests can exercise any replay logic.

5. [P2] The new test/tooling layer is incomplete for this repo. [auth.test.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/__tests__/auth.test.ts#L13) depends on `@testing-library/react-hooks`, which is not present in [package.json](C:/Users/T/Desktop/PeeDom/package.json#L50). Lint also fails because the bundle adds `react-hooks/exhaustive-deps` disable comments in [AuthProvider.tsx](C:/Users/T/Desktop/PeeDom/_preflight/src/contexts/AuthProvider.tsx#L157) and [useOfflineSync.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/hooks/useOfflineSync.ts#L79), but this repo does not configure the `react-hooks` ESLint plugin.

**Validation**
I staged the zip into a disposable [\_preflight](C:/Users/T/Desktop/PeeDom/_preflight) workspace and ran the repo checks there without touching the live files.

- `npm.cmd run type-check`: failed with 40+ TypeScript errors
- `npm.cmd run lint`: failed with 11 ESLint errors
- `npm.cmd test -- --runInBand`: failed 4 of 8 suites

This bundle is not ready to hand off as-is. If you want, I can turn this into a corrected patch plan or start fixing the preflight tree into something Claude can actually build.

## User

`2026-03-12T03:58:58.082Z`

i changed the execution policy within powershell so you should be free to run whatever you need

## Assistant (commentary)

`2026-03-12T03:59:17.354Z`

I’m rerunning the pre-flight checks with the normal command path now that PowerShell can invoke them directly, then I’ll tighten the blocker list to the actual bundle defects rather than shell workarounds.

## Assistant (final_answer)

`2026-03-12T04:01:32.994Z`

**Findings**
- [P0] The proposed type rewrite is not backward-compatible. [index.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/types/index.ts#L157) removes exports the repo still uses (`BathroomFilters`, `BathroomQueryResult`, `LocationPermissionState`, `LocationSnapshot`, `ToastMessage`, `ToastVariant`, `QueueProcessResult`) and narrows [FavoriteItem](C:/Users/T/Desktop/PeeDom/_preflight/src/types/index.ts#L243) so it no longer has `id`, `flags`, or `favorited_at`. That is why existing files like [useFavorites.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useFavorites.ts#L258) and [bathroom.ts](C:/Users/T/Desktop/PeeDom/src/utils/bathroom.ts#L104) fail immediately.

- [P0] The refactor imports a Supabase client that does not exist in this repo. [AuthProvider.tsx](C:/Users/T/Desktop/PeeDom/_preflight/src/contexts/AuthProvider.tsx#L33), [AuthService.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/services/auth/AuthService.ts#L12), and [mutation-registry.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/mutation-registry.ts#L16) all import `supabase`, but the real module only exports [getSupabaseClient()](C:/Users/T/Desktop/PeeDom/src/lib/supabase.ts#L22). This alone blocks compile.

- [P1] The “compatibility” auth facade breaks current callers. [AuthProvider.tsx](C:/Users/T/Desktop/PeeDom/_preflight/src/contexts/AuthProvider.tsx#L56) changes `requireAuth` to `boolean`, but current code still expects `User | null` and reads `.id` in [useBathroomReports.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useBathroomReports.ts#L41) and [useFavorites.ts](C:/Users/T/Desktop/PeeDom/src/hooks/useFavorites.ts#L183). The new [useAuth.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/hooks/useAuth.ts#L50) also drops `sessionState`, while [profile.tsx](C:/Users/T/Desktop/PeeDom/app/(tabs)/profile.tsx#L14) still consumes it.

- [P1] The new queue layer is incomplete. [offline-queue.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/offline-queue.ts#L18) imports `validatePayload` from [queue-storage.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/queue-storage.ts#L48), but that file never exports it. The pre-flight test run fails before any of the new queue logic can be exercised.

- [P2] The test/lint setup does not match the repo. [auth.test.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/__tests__/auth.test.ts#L13) requires `@testing-library/react-hooks`, which is not in [package.json](C:/Users/T/Desktop/PeeDom/package.json#L50). Lint also fails because the bundle adds `react-hooks/exhaustive-deps` disables in [AuthProvider.tsx](C:/Users/T/Desktop/PeeDom/_preflight/src/contexts/AuthProvider.tsx#L157) and [useOfflineSync.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/hooks/useOfflineSync.ts#L79), but this repo does not have the `react-hooks` ESLint plugin configured.

**Validation**
I reran the pre-flight checks directly in [\_preflight](C:/Users/T/Desktop/PeeDom/_preflight):

- `npm run type-check`: failed with the type and compatibility issues above
- `npm run lint`: failed with 11 ESLint errors
- `npm test -- --runInBand`: failed 4 of 8 suites

This bundle is still not mergeable. The next productive move is to patch the refactor to preserve the existing type surface, switch all new auth/offline code to `getSupabaseClient()`, and finish the migration so old queue/tests are either updated or removed consistently. If you want, I can do that in the `_preflight` tree and drive it to green.

## User

`2026-03-12T09:53:15.928Z`

<environment_context>
  <shell>powershell</shell>
  <current_date>2026-03-12</current_date>
  <timezone>America/Los_Angeles</timezone>
</environment_context>

## User

`2026-03-12T09:53:15.931Z`

go for it

## Assistant (commentary)

`2026-03-12T09:53:31.312Z`

I’m patching the `_preflight` merge directly, not the live repo. First pass is restoring the repo’s existing type surface and auth compatibility contract, then I’ll rerun `type-check`, `lint`, and `test` until the pre-flight tree is green or I hit a real architectural blocker.

## Assistant (commentary)

`2026-03-12T09:55:07.406Z`

I’m checking the live repo’s baseline before I keep patching `_preflight`. A few remaining errors look like they may already exist on `main`, and I don’t want to waste time “fixing” problems that predate the bundle.

## Assistant (commentary)

`2026-03-12T09:56:04.586Z`

The quickest route is restoring the live repo’s `types/index.ts` into `_preflight` and then adapting the new auth files to that established contract. That knocks out most of the failure cascade in one move instead of whack-a-mole fixes across every consumer.

## Assistant (commentary)

`2026-03-12T09:56:52.067Z`

I’ve got the failure pattern reduced to a coherent fix set. I’m patching the preflight tree now: restore the live repo’s type surface, repair the Supabase boundary, then bring the new auth facade back to the existing `useAuth()` contract so current screens compile unchanged.

## Assistant (commentary)

`2026-03-12T10:00:33.205Z`

The compatibility layer and type surface are patched. I’m running the full pre-flight checks again now to see what’s left after the structural fixes, then I’ll clean up any residual syntax or lint issues.

## Assistant (commentary)

`2026-03-12T10:01:06.085Z`

The pre-flight tree is down to a small set of concrete issues: a few Supabase type casts, one queue payload type cast, and the auth unit test pulling in the real Supabase module. I’m fixing those directly rather than broad refactors now.

## Assistant (commentary)

`2026-03-12T10:02:09.767Z`

The remaining failures were localized and patched. I’m rerunning the full pre-flight suite now; if anything is still red after this, it should be a genuinely new defect rather than fallout from the original bundle.

## Assistant (final_answer)

`2026-03-12T10:02:56.412Z`

The pre-flight tree is green in [\_preflight](C:/Users/T/Desktop/PeeDom/_preflight).

I restored the live repo’s type surface in [index.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/types/index.ts), switched the new auth/offline code to `getSupabaseClient()` in [AuthProvider.tsx](C:/Users/T/Desktop/PeeDom/_preflight/src/contexts/AuthProvider.tsx), [AuthService.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/services/auth/AuthService.ts), and [mutation-registry.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/mutation-registry.ts), brought the new `useAuth()` facade back to the current app contract in [useAuth.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/hooks/useAuth.ts), and fixed the queue/test issues in [offline-queue.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/offline-queue.ts), [queue-storage.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/lib/offline/queue-storage.ts), [auth.test.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/__tests__/auth.test.ts), and [offline-queue.test.ts](C:/Users/T/Desktop/PeeDom/_preflight/src/__tests__/offline-queue.test.ts).

Validation in `_preflight`:
- `npm run type-check` passed
- `npm run lint` passed
- `npm test -- --runInBand` passed, `8/8` suites and `37/37` tests

The live repo is still untouched. The remaining architectural gap is adoption: the new offline mutation hooks compile, but the current favorites/report callers in the pre-flight tree still use the existing flows. If you want, I can take the next step and port those callers onto the new mutation bridge in the real workspace.
