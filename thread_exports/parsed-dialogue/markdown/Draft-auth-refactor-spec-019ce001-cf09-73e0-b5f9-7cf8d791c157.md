# Draft auth refactor spec

- Session ID: `019ce001-cf09-73e0-b5f9-7cf8d791c157`
- Source: `transcripts/sessions/2026/03/11/rollout-2026-03-11T20-05-46-019ce001-cf09-73e0-b5f9-7cf8d791c157.jsonl`
- Archived: `false`
- Message count: `13`

## User

`2026-03-12T03:05:53.081Z`

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

`2026-03-12T03:05:53.082Z`

ACTIVATE [ARCHITECT_PRIME_MODE]

Role: Senior Product Architect for Pee-Dom.
Environment: GPT-5.4 Codex (Reasoning Mode: Enabled).

Objective: Deliver a Technical Implementation Spec for Phase 3/4 transitions.

Architecture Guidelines:

Offline-First: Must use the MutationOutcome pattern (completed | auth_required | queued_retry).

Native Purity: Zero DOM/Web components.

Zustand/TanStack: Use for all state and sync logic.

Your Task:
Use your advanced reasoning to generate an Upfront Planning Report and a Technical Spec for Claude. Address the following:

Refactor Strategy: How to break the AuthContext.tsx monolith into useAuthStore (Zustand), AuthProvider, and AuthService without breaking current session persistence.

Queue Integrity: Map the exact logic for how the user_id scoped offline queue flushes when a user re-authenticates.

Dependency Graph: Identify which screens in Phase 4 will be affected by these refactors.

Requirement: Do not write implementation code. Focus on the logical flow, data structures, and Zod schemas. Be hyper-precise so Claude can execute this with zero "hallucination."

Output format: > 1. Reasoning Plan (Steps you took to solve this).
2. Terminal Commands for new dependencies.
3. Structural Blueprint (Pseudo-code & Logic).

Spec Complete. Ready for Engineering Execution.

## Assistant (commentary)

`2026-03-12T03:05:58.402Z`

Producing an implementation spec for the Phase 3/4 auth and offline-sync transition. I’m using the `staff-mobile-engineer` skill and starting by reading its instructions plus the current auth/sync structure so the spec matches the codebase instead of guessing.

## Assistant (commentary)

`2026-03-12T03:06:14.415Z`

The repo search tool in PATH is blocked here, so I’m falling back to PowerShell file discovery. Next I’m locating the auth surface, app config, and any queue/sync modules that define the current offline behavior.

## Assistant (commentary)

`2026-03-12T03:06:41.950Z`

I have enough to avoid scanning `node_modules`. I’m narrowing to the app source, docs, and data layer so the spec can name exact modules and Phase 4 screen dependencies instead of abstract patterns.

## Assistant (commentary)

`2026-03-12T03:07:18.577Z`

The core modules are now identified: `src/contexts/AuthContext.tsx`, `src/api/auth.ts`, `src/lib/offline-queue.ts`, and `src/hooks/useOfflineSync.ts`. I’m reading those alongside the product blueprint to derive exact state transitions, queue scoping, and the screens that Phase 4 currently routes through.

## Assistant (commentary)

`2026-03-12T03:08:09.479Z`

The queue schema already exists and is useful, but I need the app’s route graph and type definitions next. That will let me map the refactor blast radius screen-by-screen instead of only at the service layer.

## Assistant (commentary)

`2026-03-12T03:08:28.369Z`

There are only nine route files in `app/`, which keeps the dependency graph tractable. I’m now tracing `useAuth`, `requireAuth`, and queue consumers through those routes and APIs so the spec can state which screens will change directly versus indirectly.

## Assistant (commentary)

`2026-03-12T03:09:14.259Z`

The root layout confirms the refactor affects bootstrapping and global sync immediately. I’m checking the route files that sit on top of auth-gated mutations so the dependency graph can distinguish root-level wiring from user-facing screens.

## Assistant (commentary)

`2026-03-12T03:12:25.799Z`

I have the core modules. I’m pulling the blueprint sections around the auth state machine and phase table now so the report can explicitly note where the current implementation already diverges from the canonical design.

## Assistant (commentary)

`2026-03-12T03:14:50.771Z`

The blueprint and code already diverge in one important way: the spec says return intents persist to AsyncStorage with TTL, but the current `AuthContext` only keeps them in memory and clears a legacy storage key that is never written. I’m checking a few remaining modules to separate current behavior from target behavior cleanly in the handoff.

## Assistant (commentary)

`2026-03-12T03:18:00.827Z`

To preserve session persistence during the refactor, I need the exact Supabase client auth configuration. I’m reading that next, because the store/provider split must not interfere with how the client currently restores and refreshes sessions.

## Assistant (final_answer)

`2026-03-12T03:24:23.409Z`

1. **Reasoning Plan**
1. Audited the live auth/session path, not just the blueprint: `AuthContext`, Supabase client config, offline queue, offline sync hook, and every route that consumes auth-gated mutations.
2. Verified the real persistence source of truth is Supabase Auth with `AsyncStorage` and `persistSession: true`; preserving that is the primary constraint.
3. Traced the current `MutationOutcome` flow through favorites and reports, then compared it to queue replay behavior.
4. Identified the critical gaps that must be fixed in the refactor:
- auth logic is duplicated between `AuthContext` and `src/api/auth.ts`
- `returnIntent` is only in memory even though a storage key exists
- the queue is globally stored but destructively filtered/cleared, so cross-user integrity is broken
- re-authentication does not itself trigger a queue flush
5. Mapped the Phase 4 route graph from the actual repo and cross-checked it against the blueprint, including planned-but-missing Phase 4 screens.

2. **Terminal Commands for new dependencies**
```bash
# No new dependencies required.
# Existing packages already cover this refactor:
# zustand
# @tanstack/react-query
# zod
# @supabase/supabase-js
# @react-native-async-storage/async-storage
```

3. **Structural Blueprint (Pseudo-code & Logic)**

**Current constraints**
- Keep Supabase client auth persistence exactly as-is. Do not replace or duplicate token persistence.
- Do not persist raw `Session`, access token, or refresh token in Zustand.
- Keep guest `returnIntent` separate from authenticated offline queue forever.
- Fix these two destructive behaviors:
- current sign-out path deletes the entire offline queue
- current queue initialization rewrites storage with only the current user’s mutations

**Target module split**

| Module | Owns | Must not own |
|---|---|---|
| `AuthService` | Supabase auth calls, profile fetch/cache, return-intent persistence, auth error classification | React state, navigation, toasts |
| `useAuthStore` | session state machine, auth selectors, action status, current return intent, derived flags | direct client creation, toast side effects |
| `AuthProvider` | bootstrap, auth event subscription, stale-request guarding, toast dedupe, queue activation trigger | persistent business data structures |

**Refactor strategy**
1. Introduce `AuthService` first and move all auth/profile/cache logic there without changing callers.
2. Add `useAuthStore` with selectors matching current consumer needs: `sessionState`, `user`, `profile`, `authIssue`, `loading`, `isGuest`, `isAuthenticated`, `canAccessProtectedRoute`.
3. Keep `AuthProvider` as a compatibility shell for one transition phase so existing consumers do not break.
4. Move login/register/signOut/refresh actions to store actions that delegate to `AuthService`.
5. After all callers are on selectors/actions, delete the monolithic `AuthContext` internals.
6. Collapse `src/api/auth.ts` into `AuthService` or make it a thin facade only. There must be one auth boundary.

**Do not break session persistence**
- `getSupabaseClient()` stays unchanged and remains the only token persistence mechanism.
- `signIn` and `signUp` should not force-authenticate store state directly on success.
- They should wait for Supabase auth state reconciliation (`getSession`/auth event) so store state matches persisted session state exactly.
- `signOut` should clear live auth state and auth-only artifacts, but must not wipe persisted user-scoped queued mutations.

**Auth state machine**
- Canonical statuses remain:
- `BOOTSTRAPPING`
- `GUEST`
- `SESSION_RECOVERY`
- `AUTHENTICATED_USER`
- `AUTHENTICATED_BUSINESS`
- `AUTHENTICATED_ADMIN`
- `SESSION_INVALID`

**Boot/auth pseudo-flow**
```text
AuthProvider.mount():
  store.beginBootstrap(epoch++)
  intent = AuthService.restoreReturnIntentIfFresh()
  store.setReturnIntent(intent)

  session = AuthService.getPersistedSession()
  if no session:
    store.setGuest()
    sync.deactivateActiveUser()
    return

  recoverAuthenticatedSession(session, trigger='bootstrap')

recoverAuthenticatedSession(session, trigger):
  store.setSessionRecovery(session)
  profileResult = AuthService.loadProfile(session.user.id)

  if profileResult.profile exists:
    store.setAuthenticated(session, profileResult.profile, profileResult.issue?)
    sync.activateUser(session.user.id)
    sync.flushIfEligible(trigger)
    return

  if profileResult.issue.kind == 'offline':
    store.setAuthenticatedWithoutProfile(session, profileResult.issue)
    sync.activateUser(session.user.id)
    return

  if profileResult.issue.shouldClearSession:
    AuthService.clearPersistedSession()
    store.setGuest(profileResult.issue)
    sync.deactivateActiveUser()
    return

  store.setSessionInvalid(profileResult.issue)
  AuthService.clearPersistedSession()
  sync.deactivateActiveUser()
```

**Return intent contract**
- Persist it with TTL. Current code does not.
- Recommended schema fields:
- `intent_id`
- `type`
- `route`
- `params`
- `replay_strategy`
- `created_at`
- `expires_at`
- On auth success, navigate to `intent.route` if still fresh.
- The target mutation hook clears the intent only after outcome is `completed` or `queued_retry`.
- If outcome is `auth_required`, keep the intent.

**Queue integrity redesign**
- Replace the flat array queue with a user-scoped envelope.
- Storage must be keyed by user bucket, not by “current active user.”
- Signing in as user B must never delete or replay user A’s mutations.
- Signing out must deactivate the active bucket in memory, not delete persisted buckets.
- Same-user re-auth must reactivate that user’s bucket and flush it if online.

**Required queue storage shape**
```ts
sessionStatusSchema = z.enum([
  'BOOTSTRAPPING',
  'GUEST',
  'AUTHENTICATED_USER',
  'AUTHENTICATED_BUSINESS',
  'AUTHENTICATED_ADMIN',
  'SESSION_RECOVERY',
  'SESSION_INVALID',
])

authIssueSchema = z.object({
  kind: z.enum(['offline', 'token-expired', 'rls-violation', 'not-found', 'unknown']),
  title: z.string().min(1),
  message: z.string().min(1),
  shouldClearSession: z.boolean(),
})

returnIntentSchema = z.object({
  version: z.literal(1),
  intent_id: z.string().min(1),
  type: z.enum(['favorite_toggle', 'submit_code', 'vote_code', 'report_bathroom', 'add_bathroom', 'claim_business', 'rate_cleanliness']),
  route: z.string().min(1),
  params: z.record(z.string(), z.unknown()),
  replay_strategy: z.enum(['immediate_after_auth', 'user_confirm', 'draft_resume']),
  created_at: z.string().datetime(),
  expires_at: z.string().datetime(),
})

favoriteQueueMutationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['favorite_add', 'favorite_remove']),
  user_id: z.string().min(1),
  payload: z.object({ bathroom_id: z.string().trim().min(1) }),
  created_at: z.string().datetime(),
  retry_count: z.number().int().min(0),
  last_attempt_at: z.string().datetime().nullable(),
})

reportQueueMutationSchema = z.object({
  id: z.string().min(1),
  type: z.literal('report_create'),
  user_id: z.string().min(1),
  payload: z.object({
    bathroom_id: z.string().trim().min(1),
    report_type: z.enum(['wrong_code', 'closed', 'unsafe', 'duplicate', 'incorrect_hours', 'no_restroom', 'other']),
    notes: z.string().trim().max(500).nullable().optional(),
  }),
  created_at: z.string().datetime(),
  retry_count: z.number().int().min(0),
  last_attempt_at: z.string().datetime().nullable(),
})

phase34QueuedMutationSchema = z.discriminatedUnion('type', [
  favoriteQueueMutationSchema,
  reportQueueMutationSchema,
])

userQueueBucketSchema = z.object({
  user_id: z.string().min(1),
  mutations: z.array(phase34QueuedMutationSchema),
  updated_at: z.string().datetime(),
  last_flush_at: z.string().datetime().nullable(),
})

offlineQueueEnvelopeSchema = z.object({
  version: z.literal(2),
  queues: z.record(z.string().min(1), userQueueBucketSchema),
})
```

**Legacy queue migration**
- On first launch after refactor:
- read old flat queue array
- validate with legacy schema
- regroup by `user_id`
- write `version: 2` envelope
- never again persist a filtered single-user array back to storage

**Exact re-auth queue flush logic**
```text
flushActiveUserQueue(trigger):
  if no activeUserId: return
  if isFlushing: return
  if authStore.user.id != activeUserId: return auth_required
  if not online: return queued_retry

  bucket = queueEnvelope.queues[activeUserId]
  if bucket empty: return

  process oldest -> newest
  for each mutation:
    validate against phase34QueuedMutationSchema
    if invalid:
      drop mutation
      continue

    outcome = executeMutationWithCurrentSession(mutation)

    if outcome == 'completed':
      remove mutation
      collect affected query keys
      continue

    if outcome == 'queued_retry':
      increment retry_count
      set last_attempt_at = now
      if retry_count > MAX_QUEUE_RETRY_COUNT: drop mutation
      halt flush immediately
      persist bucket
      invalidate completed query keys
      return

    if outcome == 'auth_required':
      halt flush immediately
      persist bucket unchanged
      return

  if bucket.mutations is empty:
    remove bucket from envelope

  set bucket.last_flush_at = now
  persist envelope
  invalidate deduped query keys
```

**Flush trigger matrix**
- On app bootstrap auth recovery for an authenticated user: `flushIfEligible('auth_restore')`
- On explicit re-auth after guest/session-expired: `flushIfEligible('re_auth')`
- On network reconnect: `flushIfEligible('network_reconnect')`
- On app foreground: `flushIfEligible('app_foreground')`

**Invalidation matrix**
- `favorite_add` / `favorite_remove`:
- invalidate `['favorites', userId]`
- invalidate `['bathrooms']`
- `report_create`:
- invalidate `['bathrooms']`
- invalidate future `['bathroom', bathroomId]` query once bathroom detail is migrated to TanStack Query

**Phase 4 dependency graph**
- Directly affected now:
- `app/_layout.tsx` because auth bootstrap and sync activation move behind provider/store
- `app/(auth)/_layout.tsx` because post-auth redirect depends on persisted `returnIntent`
- `app/(auth)/login.tsx` because sign-in must dispatch store action, not standalone API behavior
- `app/(auth)/register.tsx` because sign-up must follow the same auth reconciliation path
- `app/(tabs)/index.tsx` because favorites use `requireAuth` and offline queue replay
- `app/bathroom/[id].tsx` because it launches the Phase 4 report action path
- `app/modal/report.tsx` because report submission must keep `MutationOutcome` semantics under the new auth/queue system
- Blueprint Phase 4 screens that are not yet in repo but must use the new contract on first implementation:
- `modal/submit-code.tsx`
- `modal/add-bathroom.tsx`

**Non-route modules Claude must update before screens**
- `useFavorites`
- `useBathroomReports`
- `useOfflineSync`
- offline queue storage/processor
- auth service boundary

**Required verification cases**
- User A queues mutations offline, signs out, signs back in as user A, and only user A’s queue flushes.
- User A queues mutations offline, user B signs in, and user A’s queue remains dormant and intact.
- `queued_retry` during flush halts the flush without consuming the rest of the queue.
- `auth_required` during flush halts without incrementing retry count.
- Expired `returnIntent` is dropped on boot and never replays.
- Session recovery still works after cold start with the existing Supabase persisted session.

Spec Complete. Ready for Engineering Execution.
