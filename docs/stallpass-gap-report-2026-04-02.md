# StallPass Gap Report: Conversations vs Codebase

> Generated 2026-04-02. Cross-references 26 development conversations against the
> current `feature/full-build` codebase at commit `116b608`.

---

## Category A: Discussed AND Planned, Missing from Codebase

These items were specifically discussed as things to implement (not moonshots) but
are not present or only partially present in the current code.

### A1. AuthService Decomposition
- **Discussed in**: Draft-auth-decomposition-spec, Draft-auth-refactor-spec, Define-PeeDom-core-architect-skill
- **What was planned**: Split monolithic `AuthContext.tsx` into `AuthService` singleton + `useAuthStore` (Zustand) + thin `AuthProvider`
- **Current state**: AuthContext remains monolithic (~24KB). `useAuthStore` exists but auth logic is still in context.
- **Impact**: Medium. Works as-is but harder to test and maintain.
- **Decision needed**: Ship as-is or refactor before launch?

### A2. Mutation Registry
- **Discussed in**: Define-PeeDom-core-architect-skill, Draft-auth-decomposition-spec
- **What was planned**: `src/lib/mutation-registry.ts` -- centralized registry of queueable mutations with Zod validators, executor functions, and query invalidation metadata
- **Current state**: Only exists in `_preflight/` (old refactor bundle), not in active `src/`
- **Impact**: Low. Individual hooks handle their own mutation logic. Registry would be a cleanup.
- **Decision needed**: Nice-to-have or skip?

### A3. Edge Function: delete-account
- **Discussed in**: Review-Android-production-readiness
- **What was planned**: `supabase/functions/delete-account/index.ts` for hard account deletion (auth user deletion + community record anonymization)
- **Current state**: RPC exists in `020_account_deletion.sql` but NO Edge Function directory. The Codex review branch (`codex/review-android-production-readiness`) created this file but it was never merged.
- **Impact**: HIGH. Google Play requires in-app account deletion. The RPC handles DB-level deletion but may not delete the Supabase Auth user entry.
- **Decision needed**: Merge from codex branch or reimplement?

### A4. Account Deletion Screen
- **Discussed in**: Review-Android-production-readiness
- **What was planned**: `app/legal/account-deletion.tsx` -- dedicated screen for account deletion flow
- **Current state**: MISSING. No `app/legal/` directory exists. The codex review branch created this.
- **Impact**: HIGH. Needed for Google Play compliance.
- **Decision needed**: Merge from codex branch or build new?

### A5. Secure Auth Storage Migration
- **Discussed in**: Review-Android-production-readiness, Review-codebase-for-Android-Studio
- **What was planned**: `src/lib/supabase-auth-storage.ts` -- migrate session persistence from AsyncStorage to expo-secure-store, with fail-closed behavior and legacy data migration
- **Current state**: MISSING from main codebase. The codex review branch (`codex/review-android-production-readiness`) implemented this.
- **Impact**: Medium. AsyncStorage works but tokens are not encrypted at rest.
- **Decision needed**: Merge from codex branch?

### A6. Source Map Upload in CI
- **Discussed in**: Review-Android-production-readiness
- **What was planned**: Sentry source map upload step in `eas-release.yml` for Hermes/minified crash debugging
- **Current state**: MISSING. Sentry is configured in app.config.ts but no source map upload in workflows.
- **Impact**: Medium. Production crashes will show minified stack traces without this.
- **Decision needed**: Add to CI before or after initial launch?

### A7. Photo Moderation (Real Service)
- **Discussed in**: Multiple conversations
- **What was planned**: Integration with AWS Rekognition or Google Cloud Vision Safety for NSFW detection
- **Current state**: Placeholder auto-approve function in `021_photo_moderation.sql`. All photos auto-approved.
- **Impact**: Medium-High. UGC photos with no moderation is a store review risk.
- **Decision needed**: Ship with auto-approve or integrate moderation service? (User said they're working on this)

### A8. Google Hours Integration (Full)
- **Discussed in**: Add-stallPass-business-controls, Assess-launch-readiness-and-business
- **What was planned**: Server-side Google Place Details API via Edge Function, with `google_place_id`, `hours_source`, `hours_offset_minutes`, `last_google_sync_at` on business settings. Presets: Use Google Hours, Close 30m Early, Close 60m Early, Custom Manual Override.
- **Current state**: PARTIAL. Migration `039_business_hours_google_sync.sql` and edge functions exist (`google-place-hours/`, `google-place-autocomplete/`, `google-place-address/`). UI presets partially implemented in `HoursPresetPicker.tsx`. But end-to-end flow not wired up in the business tab.
- **Impact**: Low for launch (manual hours work fine), high for business value.
- **Decision needed**: Ship without Google sync or finish wiring?

### A9. Premium Receipt Verification
- **Discussed in**: Define-PeeDom-core-architect-skill
- **What was planned**: `supabase/functions/verify-premium-receipt/` Edge Function to validate Apple/Google receipts
- **Current state**: MISSING. No Edge Function for receipt verification.
- **Impact**: HIGH if premium tier launches with real payments. Low if premium is free/invite-only at launch.
- **Decision needed**: Do you need paid premium at launch?

### A10. Privacy Screen (Standalone)
- **Discussed in**: Review-Android-production-readiness
- **What was planned**: `app/legal/privacy.tsx` -- standalone privacy policy screen
- **Current state**: Privacy content exists inline in `app/modal/legal.tsx` (combined legal modal). No standalone route. Codex branch created this.
- **Impact**: Low. The combined legal modal works.
- **Decision needed**: Keep combined or split?

---

## Category B: Security & Compliance Gaps

### B1. Security Hardening Migration
- **Discussed in**: Sync-GitHub-with-local-files (PR review)
- **What was planned**: `035_security_hardening.sql` to fix visit-stats auth bypass, coupon redemption concurrency, invite race conditions, free-map RPC visibility enforcement
- **Current state**: MISSING. Individual fixes exist in migrations 036-038 but no unified hardening migration.
- **Impact**: Medium. Some race conditions may exist in coupon/invite flows.
- **Decision needed**: Audit coupon/invite RPCs for races before launch?

### B2. Data Safety / App Privacy Declarations
- **Discussed in**: Review-Android-production-readiness
- **Current state**: Manual console work required. Not automated. Uses account email, location, optional photo upload.
- **Impact**: BLOCKING for store submission.
- **Decision needed**: Manual task, not code.

### B3. Staged Rollout Playbook
- **Discussed in**: Review-Android-production-readiness
- **Current state**: MISSING. CI exists but no rollout strategy documented.
- **Impact**: Low for initial launch. Important for updates.
- **Decision needed**: Skip for v1?

---

## Category C: Discussed as Future / Moonshot (NOT Missing)

These were explicitly discussed as future features, not launch requirements. Listed
for completeness -- no action needed.

| Feature | Status |
|---|---|
| AI Code Recognition (camera/ML) | Not built (moonshot) |
| Indoor Positioning (HERE/IndoorAtlas) | Not built (moonshot) |
| Apple Watch Companion | Not built (moonshot) |
| iOS Widgets | Not built (moonshot) |
| CarPlay / Android Auto | Not built (moonshot) |
| Arrival-Confidence Engine | Not built (future) |
| Temporal Intelligence | Not built (future) |
| Contributor Reputation System | Not built (future) |
| Multi-Location Enterprise Tier | Not built (future) |
| Points-to-Premium Conversion | Not built (future) |
| Level System (1-50 tiers) | Not built (future) |

---

## Summary: Action Items by Priority

### Must-Fix Before Launch (P0)
1. **A3 + A4**: Account deletion Edge Function + screen (Google Play requirement)
2. **B2**: Data Safety form completion (manual, not code)

### Should-Fix Before Launch (P1)
3. **A7**: Photo moderation -- at minimum change auto-approve to pending_review
4. **A6**: Sentry source map upload in CI
5. **A9**: Premium receipt verification (if paid premium at launch)
6. **B1**: Audit coupon/invite RPCs for concurrency races

### Nice-to-Have (P2)
7. **A5**: Secure auth storage (expo-secure-store migration)
8. **A1**: AuthService decomposition
9. **A8**: Google Hours end-to-end wiring
10. **A2**: Mutation registry
11. **A10**: Standalone privacy screen
12. **B3**: Staged rollout playbook
