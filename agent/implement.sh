#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

require_cmd git
require_cmd claude
require_cmd codex

TASK="${*:-}"
if [ -n "$TASK" ]; then
  write_task_doc "$TASK"
fi

[ -f "$DOCS_DIR/AGENT_TASK.md" ] || { echo "Missing docs/AGENT_TASK.md"; exit 1; }
[ -f "$DOCS_DIR/AGENT_PLAN.md" ] || { echo "Missing docs/AGENT_PLAN.md"; exit 1; }
[ -f "$DOCS_DIR/AGENT_CRITIQUE.md" ] || { echo "Missing docs/AGENT_CRITIQUE.md"; exit 1; }

SNAPSHOT="$(mktemp)"
repo_snapshot > "$SNAPSHOT"

IMPLEMENT_PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CLAUDE.md")

$(cat "$ROOT_DIR/AGENTS.md")

Implement this Pee-Dom task in the current repository.

TASK:
$(cat "$DOCS_DIR/AGENT_TASK.md")

PLAN:
$(cat "$DOCS_DIR/AGENT_PLAN.md")

CRITIQUE TO ADDRESS:
$(cat "$DOCS_DIR/AGENT_CRITIQUE.md")

REPOSITORY SNAPSHOT:
$(cat "$SNAPSHOT")

Requirements:
- apply the critique
- preserve mobile architecture
- keep changes practical and minimal
- summarize changed files and validation steps
EOF
)

banner "CLAUDE IMPLEMENTATION"
claude "$IMPLEMENT_PROMPT"

REVIEW_PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CODEX.md")

Review the current git diff for Pee-Dom after implementation.

DIFF:
$(changed_diff)

Focus on:
- logic errors
- type hazards
- React Native / Expo regressions
- auth/session issues
- offline queue/cache problems
- Supabase / RLS issues
- missing tests or validation
EOF
)

banner "CODEX REVIEW OF IMPLEMENTATION"
run_codex_to_file "$REVIEW_PROMPT" "$DOCS_DIR/AGENT_REVIEW.md"
cat "$DOCS_DIR/AGENT_REVIEW.md"

rm -f "$SNAPSHOT"