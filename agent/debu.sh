#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

require_cmd git
require_cmd claude
require_cmd codex

ISSUE="${*:-}"
if [ -z "$ISSUE" ]; then
  echo "Usage: ./agent/debug.sh \"describe the bug or paste the error\""
  exit 1
fi

write_debug_doc "$ISSUE"

SNAPSHOT="$(mktemp)"
repo_snapshot > "$SNAPSHOT"

DEBUG_PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CLAUDE.md")

Debug this Pee-Dom issue.

ISSUE:
$ISSUE

CURRENT DIFF:
$(changed_diff)

REPOSITORY SNAPSHOT:
$(cat "$SNAPSHOT")

Provide:
- likely root cause
- impacted files
- smallest safe fix
- validation steps
EOF
)

banner "CLAUDE DEBUG ANALYSIS"
run_claude_to_file "$DEBUG_PROMPT" "$DOCS_DIR/AGENT_DEBUG_REPORT.md"
cat "$DOCS_DIR/AGENT_DEBUG_REPORT.md"

CRITIQUE_PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CODEX.md")

Critique this debug analysis and proposed fix.

DEBUG REPORT:
$(cat "$DOCS_DIR/AGENT_DEBUG_REPORT.md")

REPOSITORY SNAPSHOT:
$(cat "$SNAPSHOT")

Focus on:
- missed root causes
- bad assumptions
- incomplete fix scope
- launch risk
EOF
)

banner "CODEX DEBUG CRITIQUE"
run_codex_to_file "$CRITIQUE_PROMPT" "$DOCS_DIR/AGENT_REVIEW.md"
cat "$DOCS_DIR/AGENT_REVIEW.md"

rm -f "$SNAPSHOT"