#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

require_cmd git
require_cmd codex

MODE="${1:-general}"

DIFF_CONTENT="$(changed_diff)"
if [ -z "$DIFF_CONTENT" ]; then
  echo "No git diff found."
  exit 0
fi

case "$MODE" in
  mobile)
    EXTRA="$(cat "$ROOT_DIR/.codex/prompts/review-mobile.md")"
    ;;
  security)
    EXTRA="$(cat "$ROOT_DIR/.codex/prompts/review-security.md")"
    ;;
  offline)
    EXTRA="$(cat "$ROOT_DIR/.codex/prompts/review-offline-sync.md")"
    ;;
  rls)
    EXTRA="$(cat "$ROOT_DIR/.codex/prompts/review-supabase-rls.md")"
    ;;
  *)
    EXTRA="Perform a general adversarial review."
    ;;
esac

PROMPT=$(cat <<EOF
$(cat "$ROOT_DIR/CODEX.md")

$EXTRA

DIFF:
$DIFF_CONTENT
EOF
)

run_codex_to_file "$PROMPT" "$DOCS_DIR/AGENT_REVIEW.md"
cat "$DOCS_DIR/AGENT_REVIEW.md"