---
name: review-changes
description: Perform an adversarial StallPass review focused on correctness, offline behavior, release blockers, auth safety, and Supabase or RLS risk.
---

# Review Changes

## Use this skill when

- the user asks for a review
- the task needs a risk audit before merge or release
- you need a focused pass on offline bugs, security, launch blockers, or mobile regressions

## Default behavior

Because Codex is already the reviewer, prefer direct in-repo review first. Use the orchestrated review only when the user explicitly wants a saved dual-agent report or you need the repo's verification bundle attached to the review artifact.

## Workflow

1. Read `CODEX.md` and `AGENTS.md`.
2. Inspect the current diff, the touched files, and any failing tests or build logs.
3. If the user wants the orchestrated review, run one of:
   - `npm run ai:review`
   - `powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/run.ps1 -Mode review`
4. Review with these priorities:
   - logic correctness
   - async and race behavior
   - offline sync defects
   - auth and session safety
   - Supabase and RLS impact
   - Expo compatibility
   - mobile UX regressions
   - launch and Play Store risk
5. Present findings first, ordered by severity, with exact file references.
6. After findings, note residual testing gaps and the overall decision.

## Output contract

For each finding include:

- severity
- file
- issue
- why it matters
- exact fix recommendation
- regression test suggestion
