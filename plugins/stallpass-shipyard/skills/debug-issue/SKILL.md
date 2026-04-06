---
name: debug-issue
description: Diagnose and fix StallPass crashes, flaky behavior, build failures, and production bugs with direct local inspection and optional dual-agent repair loops.
---

# Debug Issue

## Use this skill when

- the user reports a bug, crash, regression, or stack trace
- the app fails to build or launch
- a production blocker needs a root-cause analysis

## Workflow

1. Reproduce or localize the failure first.
2. Read the repo contract:
   - `AGENTS.md`
   - `CLAUDE.md`
   - `CODEX.md`
3. Gather the smallest concrete failure context that explains the bug:
   - stack trace or error text
   - touched files or recent diff
   - platform and environment details
4. Prefer direct Codex debugging when the next step is blocked on local investigation.
5. Use the dual-agent loop only when the user explicitly wants it or when the issue would benefit from iterative builder plus reviewer repair:
   - `npm run ai:loop -- --task "<bug description>"`
   - `powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/run.ps1 -Mode loop -Task "<bug description>"`
6. Run the narrowest meaningful validation after the fix:
   - `npm run lint`
   - `npm test`
   - `npm run type-check`
   - `npm run android:assembleDebug:emulator` for Android-native or build issues
7. End with:
   - root cause
   - changed files
   - validation performed
   - residual risks or follow-up checks

## StallPass-specific bug traps

- stale location or denied permission states
- offline queue replay and idempotency
- Supabase auth recovery and deactivated sessions
- deep-link and Expo Router back-stack regressions
- map rendering and clustering under degraded network conditions
