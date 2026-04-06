---
name: shipyard
description: Entry point for StallPass dual-agent development and release work. Use when the user wants repo-specific planning, implementation, review, debugging, launch audit, or Google Play preparation.
---

# StallPass Shipyard

## Overview

Use this skill as the router for StallPass work inside this repository. It keeps the task grounded in the app's mobile, offline, Supabase, and launch-readiness constraints before deciding whether to work directly in Codex or call the repo's dual-agent orchestrator.

The supported workflow is the repo-local orchestrator:

- `npm run ai:plan`
- `npm run ai:loop`
- `npm run ai:review`
- `npm run ai:launch`

On Windows, prefer the plugin wrapper:

- `powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/doctor.ps1`
- `powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/run.ps1 -Mode <plan|loop|review|launch>`

If the doctor warns that `claude` or `codex` is missing, configure `STALLPASS_CLAUDE_COMMAND`, `STALLPASS_CLAUDE_PROBE`, `STALLPASS_CODEX_COMMAND`, or `STALLPASS_CODEX_PROBE` before relying on the CLI loop.

Ignore `ai_bridge.py`. It is not part of the supported workflow and should not be used for production work.

## Required context

Before choosing a path, inspect the StallPass operating files that define the repo contract:

- `AGENTS.md`
- `CLAUDE.md`
- `CODEX.md`
- `LAUNCH_CHECKLIST.md`
- `docs/stallpass-ai-orchestrator.md`

## Routing rules

1. Classify the request first:
   - planning or architecture: `../plan-feature/SKILL.md`
   - implementation or refactor: `../implement-feature/SKILL.md`
   - review or risk audit: `../review-changes/SKILL.md`
   - bug, crash, or build failure: `../debug-issue/SKILL.md`
   - launch readiness or release blockers: `../launch-audit/SKILL.md`
   - Play Store submission materials or policy prep: `../store-prep/SKILL.md`
2. Decide execution mode:
   - Prefer direct Codex work when the task is on the critical path and the answer depends on immediate local code inspection.
   - Use the orchestrator when the user explicitly wants the dual-agent Claude and Codex loop, or when a scoped plan, implementation loop, or launch audit artifact would help.
   - If `claude` or `codex` CLI is unavailable, continue locally instead of blocking.
3. Always keep the repo contract in scope:
   - do not revert unrelated user changes
   - treat mobile UX, offline behavior, auth safety, and RLS correctness as first-class concerns
   - end with exact file targets, risks, and verification status

## Output expectations

- State which specialist path you are taking.
- Be explicit about whether you are working directly in Codex or invoking the local orchestrator.
- If you use the orchestrator, inspect the generated output under `.stallpass-ai/runs/...` before summarizing the result.
