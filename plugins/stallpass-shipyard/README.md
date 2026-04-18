# StallPass Shipyard

StallPass Shipyard is a repo-local Codex plugin for the StallPass mobile app. It wraps the repo's existing Claude and Codex CLI orchestration scripts in Codex-native skills so the desktop app or CLI can route planning, implementation, review, debugging, launch audit, and Google Play release prep through one shared workflow.

## What it does

- routes StallPass work to the right skill instead of treating every request as generic coding
- uses the repo's `npm run ai:plan`, `npm run ai:loop`, `npm run ai:review`, and `npm run ai:launch` workflows when dual-agent execution is useful
- keeps Codex grounded in `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, and `LAUNCH_CHECKLIST.md`
- adds repo-local wrapper scripts so Windows PowerShell can call the orchestrator consistently

## What it does not do

- guarantee that Claude or Codex are installed, authenticated, or healthy
- replace human release sign-off, device QA, or Play Console form submission
- use `ai_bridge.py`; that file is a legacy API-key sketch and is not part of the supported workflow

## Included skills

- `shipyard`: entrypoint and router for StallPass work
- `plan-feature`: produce a scoped plan and critique path
- `implement-feature`: execute feature or bug-fix work with validation
- `review-changes`: adversarial review for correctness, offline behavior, security, and release risk
- `debug-issue`: reproduce, isolate, and fix bugs or build failures
- `launch-audit`: inspect release blockers and run launch-readiness checks
- `store-prep`: prepare Google Play listing, policy, and submission requirements

## Wrapper scripts

- `scripts/doctor.ps1`: checks that the repo and required CLIs are available
- `scripts/run.ps1`: runs the StallPass AI orchestrator from the plugin directory

Example commands:

```powershell
powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/doctor.ps1
powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/run.ps1 -Mode plan -Task "Harden auth recovery"
powershell -ExecutionPolicy Bypass -File plugins/stallpass-shipyard/scripts/run.ps1 -Mode launch -AndroidVerify
```

## Environment overrides

The orchestrator expects shell-callable `claude` and `codex` commands. If either CLI is installed outside your PowerShell `PATH`, point the workflow at the right executable with the existing repo overrides:

```powershell
$env:STALLPASS_CLAUDE_COMMAND = "<full command used to invoke Claude>"
$env:STALLPASS_CLAUDE_PROBE = "<command used to verify Claude>"
$env:STALLPASS_CODEX_COMMAND = "<full command used to invoke Codex>"
$env:STALLPASS_CODEX_PROBE = "<command used to verify Codex>"
```

The doctor script will warn if `codex` is not callable from this shell. The Codex desktop app can still work directly in the repo, but the external dual-agent CLI loop requires a shell-visible Codex command or these overrides.

## Installation model

This plugin is registered in `.agents/plugins/marketplace.json` as a repo-local plugin. Keep it inside this repository so the skills and scripts stay aligned with StallPass source files and release docs.
