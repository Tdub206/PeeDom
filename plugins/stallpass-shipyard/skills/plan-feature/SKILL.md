---
name: plan-feature
description: Create a StallPass implementation plan with clear file targets, mobile risk analysis, and optional Claude plus Codex critique through the local orchestrator.
---

# Plan Feature

## Use this skill when

- the user wants a design or implementation plan
- the task spans multiple files or systems
- release impact, offline behavior, auth safety, or navigation risk needs to be mapped before code changes

## Workflow

1. Read the repo contract first:
   - `AGENTS.md`
   - `CLAUDE.md`
   - `CODEX.md`
   - any feature-specific files the request points to
2. Inspect the relevant code and current dirty tree before making assumptions.
3. Choose the planning mode:
   - Direct Codex plan for straightforward or urgent local work.
   - Orchestrated plan when the user explicitly wants the dual-agent loop or when a builder plan plus reviewer critique would help.
4. For orchestrated planning, run one of:
   - `npm run ai:plan -- "<task>"`
   - `powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/run.ps1 -Mode plan -Task "<task>"`
5. If the orchestrator runs, inspect the latest `.stallpass-ai/runs/<timestamp>/reports/plan.md` and `plan-critique.md` before replying.
6. Return a plan with:
   - goal
   - assumptions
   - files to inspect
   - files to change
   - step-by-step implementation
   - risks
   - validation checklist

## StallPass-specific review points

- Expo and React Native compatibility
- auth and session safety
- offline queue, retries, and optimistic updates
- Supabase and RLS implications
- map, location, and permission edge cases
- Google Play release impact if the task touches launch-critical flows
