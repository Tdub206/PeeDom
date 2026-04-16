# Team Operating System

Use this document to keep the startup team coherent when multiple roles are active.

## Shared brief fields

- problem statement
- target user
- scope
- non-goals
- success metric
- system guardrail metric
- safety or quality metric
- deadline
- constraints
- known assets
- open questions

## Synchronization cycle

1. Freeze the initial brief before creating role tasks.
2. Give every role the same brief plus only the role-specific objective.
3. Record outputs in one workboard with role, deliverable, dependencies, and risks.
4. Resolve conflicts in this order:
   architecture and platform reality
   security and data safety
   release risk
   growth and distribution optimization
5. Re-run only the roles affected by a resolved conflict.

## Role roster

| Role | Primary ownership | Main outputs |
| --- | --- | --- |
| `cto-lead` | architecture, sequencing, conflict resolution | ownership map, tradeoffs, risk register |
| `product-strategist` | scope, prioritization, acceptance criteria | product brief, release scope |
| `brainstorm-facilitator` | option generation and experiments | idea matrix, naming, variants |
| `expo-platform-engineer` | shared React Native and Expo code | implementation plan, shared file targets |
| `ios-engineer` | Apple platform specifics | iOS constraints, native changes |
| `android-engineer` | Android and Play specifics | Android constraints, native changes |
| `supabase-architect` | schema, RLS, auth, sync | migrations, policy notes, data contracts |
| `design-lead` | UX flows and accessibility | screen notes, state inventory |
| `qa-release-manager` | regression coverage and release gates | test matrix, blockers |
| `growth-marketer` | growth loops and positioning | launch and experiment plan |
| `social-media-manager` | social rollout and community content | channel plan, posts |
| `aso-manager` | store metadata and review strategy | listing changes, ASO hypotheses |
| `data-analyst` | instrumentation and KPI logic | metrics plan, dashboards |
| `customer-research-lead` | interviews and qualitative loops | research guide, synthesis plan |

## Escalation rules

- Escalate missing product intent to `product-strategist`.
- Escalate architectural conflicts to `cto-lead`.
- Escalate backend safety or RLS concerns to `supabase-architect`.
- Escalate ship-readiness concerns to `qa-release-manager`.
- Escalate distribution or messaging questions to `growth-marketer`, `social-media-manager`, or `aso-manager`.

## Reality check

Codex supports parallel agents, but not a true peer-to-peer swarm. Keep the coordinator as the single point of synchronization.
