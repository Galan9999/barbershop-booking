#!/usr/bin/env bash
# Applies supabase/migrations/ to a remote Supabase database.
#
#   DATABASE_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' \
#     ./scripts/db-push.sh
#
# Get that string in Supabase: Project Settings > Database > Connection string >
# URI. It contains your database password, so pass it on the command line or
# export it; never commit it.
set -euo pipefail

export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL no está definida. Ejemplo:" >&2
  echo "  DATABASE_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres' $0" >&2
  exit 1
fi

echo "Comprobando conexión…"
psql "$DATABASE_URL" -tAc 'select current_database();' >/dev/null
echo "Conectado."

for file in "$PROJECT_DIR"/supabase/migrations/*.sql; do
  [ -e "$file" ] || continue
  name="$(basename "$file")"
  echo "Aplicando $name…"
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$file"; then
    echo "  aplicada"
  else
    echo "  falló o ya estaba aplicada (revisa el mensaje de arriba)"
  fi
done

echo
echo "Estado de la tabla:"
psql "$DATABASE_URL" -c "\d public.appointments" 2>/dev/null | head -20
