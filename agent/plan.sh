#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

require_cmd git
require_cmd claude
require_cmd codex

TASK="${*:-}"
if [ -z "$TASK" ]; then
  if [ -f "$DOCS_DIR/AGENT_TASK.md" ]; then
    TASK="$(cat "$DOCS_DIR/AGENT_TASK.md")"
  else
    echo "Usage: ./agent/plan.sh \"your task here\""
    exit 1
  fi
fi

write_task_doc "$TASK"

SNAPSHOT="$(mktemp)"
repo_snapshot > "$SNAPSHOT"

PLAN_PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CLAUDE.md")

$(cat "$ROOT_DIR/AGENTS.md")

Create a repo-specific implementation plan for the following StallPass task.

TASK:
$TASK

REPOSITORY SNAPSHOT:
$(cat "$SNAPSHOT")
EOF
)

banner "CLAUDE PLAN"
run_claude_to_file "$PLAN_PROMPT" "$DOCS_DIR/AGENT_PLAN.md"
cat "$DOCS_DIR/AGENT_PLAN.md"

CRITIQUE_PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CODEX.md")

Critique this implementation plan for a mobile Expo/React Native app named StallPass.

PLAN:
$(cat "$DOCS_DIR/AGENT_PLAN.md")

REPOSITORY SNAPSHOT:
$(cat "$SNAPSHOT")

Focus on:
- missing files
- hidden dependencies
- route/auth/offline/RLS risks
- launch blockers
- missing validation steps
EOF
)

banner "CODEX CRITIQUE OF PLAN"
run_codex_to_file "$CRITIQUE_PROMPT" "$DOCS_DIR/AGENT_CRITIQUE.md"
cat "$DOCS_DIR/AGENT_CRITIQUE.md"

rm -f "$SNAPSHOT"