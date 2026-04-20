# Pee-Dom Task

# Pee-Dom Task

## Beta Error Boundary with Bug Report Submission

During live beta testing, whenever the app throws an unhandled error, present an error boundary screen that:

1. **Bug Report Comment Box** — Show a text input where the user can describe what they were doing right before the error occurred (their previous action).

2. **"Submit a Bug" Button** — Let the user submit their description along with the error details (stack trace, screen name, device info, timestamp) to our backend for triage.

3. **Beta Contributor Recognition** — Reassure the user that their name will be tied (figuratively, not legally) to the creation of StallPass. Frame it as: "You're helping build StallPass — your name will be part of its story." Make beta testers feel like valued contributors, not just users hitting bugs.

4. **Graceful Recovery** — After submission (or dismiss), allow the user to return to the app without a full restart where possible.

The feature should work across the entire app (global error boundary) and capture enough context to make bug reports actionable for the dev team.

---

## Constraints From Codex Critique (Must Address)

### HIGH — Auth unreachable from boundary
`ErrorBoundary` is a class component above `AuthProvider` in `_layout.tsx`. It cannot use hooks or context to get the user's JWT. The plan MUST read the auth token directly from persistent storage (e.g., Supabase's AsyncStorage session) rather than relying on AuthContext or Zustand. `user_id` resolution should happen server-side in the edge function from whatever token is available, and must gracefully handle `null` (guest/unauthenticated).

### HIGH — Public write surface abuse protection
The edge function uses service-role insert with only the anon key protecting it. The plan MUST include:
- Rate limiting (e.g., max 5 reports per device per hour, enforced server-side)
- Input sanitization / PII scrubbing on `user_comment` and `error_stack` before storage
- Request body size cap

### HIGH — Sentry is disabled in non-production builds
`Sentry.init()` uses `enabled: isProductionEnv`. In beta/dev builds, `Sentry.lastEventId()` will return nothing. The plan MUST NOT depend on Sentry event IDs for beta builds. Treat `sentry_event_id` as optional/nullable. Consider whether Sentry should be enabled in beta builds, or just drop the linkage.

### MEDIUM — Must use existing offline queue architecture
PeeDom already has `src/lib/offline-queue.ts` with retry/drop semantics and `src/hooks/useOfflineSync.ts` for reconnect processing. The plan MUST integrate with this existing queue rather than creating a parallel `@stallpass/beta_bug_queue`. This means:
- Using the existing queue's per-user scoping
- Respecting sign-out cleanup in `AuthContext.tsx`
- Getting poison-item / max-retry handling for free

### MEDIUM — Zod validation for queued payloads
Existing queue payloads are Zod-validated in `src/utils/validate.ts`. The bug report queue payload MUST have a Zod schema, versioning, and idempotency key.

### MEDIUM — Missing files from original plan
- `src/types/database.ts` must be updated with the new table types
- `src/utils/validate.ts` must get a bug report payload schema
- Database security tests should be added (see `supabase/tests/business_security.sql` pattern)

### MEDIUM — Test dependencies don't exist
Jest is configured for `node` environment. `@testing-library/react-native` and `react-test-renderer` are NOT installed. Tests must focus on pure logic (queue, utils, helpers) unless adding test deps is in scope.

### LOW — Screen capture blind spots
`setActiveScreen(pathname)` only runs after the router mounts. Provider/bootstrap crashes before `RootNavigator` will report `screen_name = 'unknown'`. This is acceptable if documented, not treated as guaranteed.
