#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

require_cmd git
require_cmd claude
require_cmd codex

SNAPSHOT="$(mktemp)"
repo_snapshot > "$SNAPSHOT"

LAUNCH_PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CLAUDE.md")

$(cat "$ROOT_DIR/AGENTS.md")

Perform a launch-readiness check for Pee-Dom.

REPOSITORY SNAPSHOT:
$(cat "$SNAPSHOT")

CURRENT DIFF:
$(changed_diff)

Return:
- blockers
- high-risk items
- medium-risk items
- suggested fixes
- release confidence summary
EOF
)

banner "CLAUDE LAUNCH CHECK"
run_claude_to_file "$LAUNCH_PROMPT" "$DOCS_DIR/AGENT_PLAN.md"
cat "$DOCS_DIR/AGENT_PLAN.md"

REVIEW_PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CODEX.md")

Audit launch readiness for this mobile app.

CLAUDE REPORT:
$(cat "$DOCS_DIR/AGENT_PLAN.md")

REPOSITORY SNAPSHOT:
$(cat "$SNAPSHOT")

Focus on:
- build failures
- env/config errors
- permissions
- offline sync corruption
- crash-prone flows
- auth edge cases
- telemetry/debugging blind spots
- app store review risk
EOF
)

banner "CODEX LAUNCH AUDIT"
run_codex_to_file "$REVIEW_PROMPT" "$DOCS_DIR/AGENT_REVIEW.md"
cat "$DOCS_DIR/AGENT_REVIEW.md"

rm -f "$SNAPSHOT"