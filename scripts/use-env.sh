#!/usr/bin/env bash
# Switches .env.local between the local stack and the remote services.
#
#   ./scripts/use-env.sh local    Postgres + PostgREST on this machine
#   ./scripts/use-env.sh remote   Supabase + Resend
#
# Both files live in env/, which is gitignored: secrets never reach a commit.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-}"

case "$TARGET" in
  local|remote) ;;
  *) echo "uso: $0 {local|remote}" >&2; exit 1 ;;
esac

SOURCE="$PROJECT_DIR/env/$TARGET.env"
[ -f "$SOURCE" ] || { echo "No existe $SOURCE" >&2; exit 1; }

if grep -q 'PEGA_AQUI' "$SOURCE"; then
  echo "Aviso: $SOURCE aún tiene valores sin rellenar (PEGA_AQUI...)." >&2
fi

cp "$SOURCE" "$PROJECT_DIR/.env.local"
echo "Entorno activo: $TARGET"
grep -E '^(SUPABASE_URL|EMAIL_TRANSPORT|EMAIL_FROM)=' "$PROJECT_DIR/.env.local" | sed 's/^/  /'
echo
echo "Reinicia el servidor de desarrollo para que lo recoja."
