#!/usr/bin/env bash

set -euo pipefail
source "$(cd "$(dirname "$0")" && pwd)/lib.sh"

require_cmd git
require_cmd claude
require_cmd codex

TASK="${*:-}"
if [ -z "$TASK" ]; then
  echo "Usage: ./agent/task.sh \"your task here\""
  exit 1
fi

write_task_doc "$TASK"

banner "TASK RECORDED"
cat "$DOCS_DIR/AGENT_TASK.md"