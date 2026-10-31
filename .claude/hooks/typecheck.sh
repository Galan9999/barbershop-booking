#!/usr/bin/env bash
# PostToolUse hook: typecheck after editing TypeScript files.
# Stdin carries the tool payload JSON; we only react to .ts/.tsx edits.
# Exit 2 + stderr is the documented way to surface a problem to Claude.
set -u
payload="$(cat)"
file="$(printf '%s' "$payload" \
  | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"//; s/"$//')"
case "$file" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
[ -d node_modules ] || exit 0
if ! out="$(npx tsc --noEmit 2>&1)"; then
  { echo "tsc --noEmit failed after editing $file:"; echo "$out" | head -40; } >&2
  exit 2
fi
exit 0
