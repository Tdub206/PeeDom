---
name: startup-swarm
description: External persistent-state swarm orchestration for Mobile Startup Studio. Use when the user explicitly wants a literal autonomous all-to-all employee swarm with durable session state, relay messaging, inboxes, and repeated multi-round coordination outside the in-thread startup-hq hub.
---

# Startup Swarm

Use this workflow when the user wants long-lived swarm behavior instead of a one-shot in-thread coordination pass.

## Required reads

- `./references/swarm-session-schema.md`

## Runtime

The orchestrator lives at:

- `../../scripts/startup-swarm-orchestrator.cjs`
- `../../scripts/swarm.ps1`

It stores persistent state under `.mobile-startup-studio/sessions/<session-id>/`.

## Commands

Create a new session:

```powershell
node plugins/mobile-startup-studio/scripts/startup-swarm-orchestrator.cjs init `
  --task "Improve restroom report accuracy without slowing the map"
```

Run until convergence or the round limit:

```powershell
node plugins/mobile-startup-studio/scripts/startup-swarm-orchestrator.cjs run `
  --task "Improve restroom report accuracy without slowing the map" `
  --max-rounds 3
```

Inject a human relay:

```powershell
node plugins/mobile-startup-studio/scripts/startup-swarm-orchestrator.cjs message `
  --session "<session-id>" `
  --from human `
  --to cto-lead `
  --subject "Keep scope narrow" `
  --body "Do not expand into a full map redesign."
```

## Operating rules

1. Use `startup-hq` when a one-shot hub-and-spoke answer is enough.
2. Use this swarm mode only when the user explicitly wants durable autonomous coordination.
3. Keep the metric trio set before the first live round:
   user outcome
   system guardrail
   safety or quality
4. Let the orchestrator relay all inter-role messages. Do not invent direct peer messaging that bypasses persisted state.

## Output expectations

When you summarize a swarm run, report:

- session id
- current status
- round count
- active roles
- key decisions
- open conflicts
- next actions
