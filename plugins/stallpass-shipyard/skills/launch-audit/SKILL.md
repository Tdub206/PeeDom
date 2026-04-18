---
name: launch-audit
description: Audit StallPass launch readiness for Android and Google Play with verification gates, release-risk analysis, and optional dual-agent reporting.
---

# Launch Audit

## Use this skill when

- the user asks whether StallPass is ready to ship
- release blockers, Android build health, or production hardening need review
- Google Play readiness must be checked against the repo state

## Required references

- `LAUNCH_CHECKLIST.md`
- `LAUNCH_MANIFEST.md`
- `AGENTS.md`
- `CODEX.md`
- `docs/stallpass-ai-orchestrator.md`

## Workflow

1. Inspect the current working tree and any release-related diffs first.
2. Run the baseline verification gates unless the user explicitly wants a no-verify pass:
   - `npm run lint`
   - `npm test`
   - `npm run type-check`
3. Add `npm run android:assembleDebug:emulator` when Android packaging, native dependencies, or Play release health is in scope.
4. Use the orchestrated launch audit when the user wants the dual-agent artifact:
   - `npm run ai:launch -- --android-verify`
   - `powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/run.ps1 -Mode launch -AndroidVerify`
5. Focus on:
   - build and environment failures
   - auth or session corruption risk
   - offline data integrity
   - crash-prone flows
   - telemetry and observability gaps
   - Play Store review and policy risks
   - missing launch checklist items
6. Return:
   - blockers
   - high-risk items
   - medium-risk items
   - concrete fixes
   - release confidence summary

## Do not do this

- do not claim the app is launch-ready without verification evidence
- do not invent privacy policy, support, or Play Console completion states
