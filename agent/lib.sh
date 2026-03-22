#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT_DIR/docs"
PROMPTS_DIR="$ROOT_DIR/agent/prompts"

mkdir -p "$DOCS_DIR"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

repo_snapshot() {
  {
    echo "===== GIT STATUS ====="
    git -C "$ROOT_DIR" status --short || true
    echo
    echo "===== TOP-LEVEL TREE ====="
    find "$ROOT_DIR" -maxdepth 2 \
      -not -path '*/.git/*' \
      -not -path '*/node_modules/*' \
      -not -path '*/.expo/*' \
      -not -path '*/dist/*' \
      -not -path '*/build/*' \
      -not -path '*/ios/Pods/*' \
      -not -path '*/android/.gradle/*' \
      | sed "s|$ROOT_DIR/||" \
      | sort
    echo
    echo "===== PACKAGE.JSON ====="
    [ -f "$ROOT_DIR/package.json" ] && cat "$ROOT_DIR/package.json"
    echo
    echo "===== APP CONFIG ====="
    [ -f "$ROOT_DIR/app.json" ] && cat "$ROOT_DIR/app.json"
    [ -f "$ROOT_DIR/app.config.ts" ] && cat "$ROOT_DIR/app.config.ts"
  }
}

changed_diff() {
  git -C "$ROOT_DIR" diff -- . ':(exclude)package-lock.json' ':(exclude)yarn.lock' || true
}

write_task_doc() {
  local task="$1"
  cat > "$DOCS_DIR/AGENT_TASK.md" <<EOF
# Pee-Dom Task

$task
EOF
}

write_debug_doc() {
  local issue="$1"
  cat > "$DOCS_DIR/AGENT_DEBUG_REPORT.md" <<EOF
# Debug Target

$issue
EOF
}

run_claude_to_file() {
  local prompt="$1"
  local outfile="$2"
  printf '%s' "$prompt" | claude -p > "$outfile"
}

run_codex_to_file() {
  local prompt="$1"
  local outfile="$2"
  printf '%s' "$prompt" | codex exec - > "$outfile"
}

read_file_if_exists() {
  local f="$1"
  [ -f "$f" ] && cat "$f"
}

banner() {
  echo
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}
