# Swarm Session Schema

The orchestrator keeps each session under `.mobile-startup-studio/sessions/<session-id>/`.

## Files

- `state.json`: current durable session snapshot
- `events.ndjson`: append-only event log
- `prompts/`: exact prompts sent to each role by round
- `transcripts/`: raw outputs returned by each role

## State shape

Top-level fields:

- `sessionId`
- `task`
- `status`
- `statusReason`
- `roundsCompleted`
- `maxRounds`
- `activeRoles`
- `brief`
- `runtime`
- `decisions`
- `conflicts`
- `deliverables`
- `messages`
- `rounds`
- `roles`

Each `roles.<role-name>` entry tracks:

- `status`
- `inbox`
- `summary`
- `dependencies`
- `deliverables`
- `decisions`
- `conflicts`
- `metrics`
- `nextActions`
- `lastRound`
- `lastError`

## Relay model

Messages are round-based:

1. A role receives its inbox for the current round.
2. It returns new messages addressed to a specific role or `broadcast`.
3. The orchestrator writes those messages into durable state.
4. Recipients see them in the next round.

This keeps shared state deterministic while still allowing all roles to coordinate through persisted relay traffic.
