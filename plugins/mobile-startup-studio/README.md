# Mobile Startup Studio

Mobile Startup Studio is a repo-local Codex plugin that treats your app startup like a real company. It packages product, engineering, design, QA, analytics, research, ASO, growth, and social roles as separate skills so one coordinating agent can run a structured multi-agent session against the same brief.

## What it is

- A coordinator skill, `startup-hq`, that routes work, defines a shared brief, and synchronizes parallel role outputs.
- An external swarm workflow, `startup-swarm`, for persistent all-to-all relay coordination through durable session state.
- A roster of role skills that behave like employees with clear ownership boundaries.
- A small workboard generator script so a task starts with the same coordination format every time.

## Included roles

- `startup-hq`
- `startup-swarm`
- `cto-lead`
- `product-strategist`
- `brainstorm-facilitator`
- `expo-platform-engineer`
- `ios-engineer`
- `android-engineer`
- `supabase-architect`
- `design-lead`
- `qa-release-manager`
- `growth-marketer`
- `social-media-manager`
- `aso-manager`
- `data-analyst`
- `customer-research-lead`

## Synchronization model

This plugin now supports two coordination modes:

1. `startup-hq` for in-thread hub-and-spoke coordination.
2. `startup-swarm` for durable external orchestration with relay messaging and persisted state.

### `startup-hq`

1. Build one source-of-truth brief.
2. Spawn one agent per role when the user explicitly asks for parallel or full-team work.
3. Collect the first-wave outputs in parallel.
4. Re-broadcast conflicts or dependencies for a second alignment pass when needed.
5. Merge the final answer in the coordinator.

Subagents do not directly talk to each other. `startup-hq` handles the hub-and-spoke synchronization so the company stays aligned without pretending the runtime has a full peer-to-peer agent mesh.

### `startup-swarm`

Use the external orchestrator when you want durable session artifacts and agent-to-agent relay traffic:

```powershell
node plugins/mobile-startup-studio/scripts/startup-swarm-orchestrator.cjs run `
  --task "Improve restroom report accuracy without slowing the map" `
  --metric-user "Increase verified accuracy" `
  --metric-guardrail "Hold map p95 interaction latency flat" `
  --metric-safety "Reduce stale or false reports"
```

Artifacts are stored under `.mobile-startup-studio/sessions/<session-id>/` with `state.json`, `events.ndjson`, generated prompts, and raw transcripts.

## Helper script

Use the workboard generator to start a task with a repeatable structure:

```powershell
python plugins/mobile-startup-studio/scripts/new-team-workboard.py `
  --task "Reduce bad location reports" `
  --metric "Increase verified restroom accuracy" `
  --output ".codex/mobile-startup-workboard.md"
```

## When to use it

- when you want a full-company planning session before coding
- when a feature touches product, code, launch, and growth at the same time
- when you want a single coordinator to keep multiple specialists from drifting out of sync

## When not to use it

- when the task is small and only needs one specialist
- when you need a fully autonomous agent swarm with direct peer messaging between workers

That last case is now covered by `startup-swarm`, which relays messages between role inboxes through persistent shared state instead of pretending those capabilities already exist inside one in-thread coordinator.
