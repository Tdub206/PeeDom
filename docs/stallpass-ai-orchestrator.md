# StallPass AI Orchestrator

This repo now includes a local CLI orchestrator for a StallPass-specific Claude/Codex workflow without API keys.

What it does:

- snapshots the current repo state
- feeds StallPass-specific context to the AI CLIs
- uses Claude as the builder
- uses Codex as the adversarial reviewer when the local `codex` CLI is callable
- runs local verification gates after changes
- stores prompts, reports, and logs under `.stallpass-ai/runs/<timestamp>/`

What it does not do:

- guarantee a 100% flawless app with zero human sign-off
- replace real device QA, store submission review, legal review, secrets setup, or production credentials
- bypass a broken local CLI install

## Commands

```bash
npm run ai:loop -- --task "Harden map rendering and offline fallbacks"
npm run ai:plan -- "Refactor profile editing flow"
npm run ai:review -- --skip-verify
npm run ai:launch -- --android-verify
```

Windows PowerShell wrapper:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/stallpass-ai.ps1 loop --task "Fix auth session recovery"
```

## Flags

- `--task <text>`
- `--task-file <path>`
- `--max-rounds <n>`
- `--skip-codex`
- `--skip-verify`
- `--android-verify`
- `--dry-run`
- `--verbose`

## Environment overrides

- `STALLPASS_CLAUDE_COMMAND`
- `STALLPASS_CLAUDE_PROBE`
- `STALLPASS_CODEX_COMMAND`
- `STALLPASS_CODEX_PROBE`
- `STALLPASS_SKIP_CODEX=1`
- `STALLPASS_VERIFY_COMMANDS`

`STALLPASS_VERIFY_COMMANDS` uses semicolon-separated commands. Example:

```powershell
$env:STALLPASS_VERIFY_COMMANDS = "npm run lint; npm test; npm run type-check"
```

## Practical recommendation

1. Start from a dedicated branch or a clean worktree.
2. Use `loop` for scoped tasks, not for "build the entire app from scratch".
3. Treat the final result as "ready for human sign-off", not "mathematically guaranteed perfect".
