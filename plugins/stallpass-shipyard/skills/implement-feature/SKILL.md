---
name: implement-feature
description: Implement a StallPass feature or bug fix with repo-aware validation, dual-agent loop support, and launch-safe mobile engineering constraints.
---

# Implement Feature

## Use this skill when

- the user wants code written, refactored, or repaired
- the request affects app behavior, data flow, navigation, location, or release readiness

## Default behavior

Work directly in the repo unless the user explicitly wants the Claude plus Codex loop or a saved orchestrator artifact would materially help. Direct local implementation keeps the critical path short and lets Codex inspect the live tree before editing.

## Workflow

1. Inspect the current working tree and relevant files first.
2. Read the repo contract:
   - `AGENTS.md`
   - `CLAUDE.md`
   - `CODEX.md`
3. Decide execution mode:
   - Direct Codex implementation is the default.
   - Use the orchestrator for scoped dual-agent execution:
     - `npm run ai:loop -- --task "<task>"`
     - `powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/run.ps1 -Mode loop -Task "<task>"`
4. If the orchestrator runs, inspect the latest `.stallpass-ai/runs/<timestamp>/reports/` outputs before accepting the result.
5. After code changes, run the repo validation gates:
   - `npm run lint`
   - `npm test`
   - `npm run type-check`
6. Add `npm run android:assembleDebug:emulator` when native Android behavior, Gradle, or release packaging is part of the change.
7. End with:
   - changed files
   - what changed
   - remaining risks
   - exact verification status

## Non-negotiable concerns

- do not revert unrelated user changes
- no placeholder logic or fake data
- guard async behavior, mobile UX edge cases, and offline state transitions
- consider RLS, permissions, and app-store release risk for every user-facing change
