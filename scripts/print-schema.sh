#!/usr/bin/env bash
# Prints every migration concatenated, in order, ready to paste into the
# Supabase SQL Editor. Generated on demand so it can never drift from
# supabase/migrations/, which stays the single source of truth.
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "-- Esquema completo de barbershop-booking."
echo "-- Pegar entero en el SQL Editor de Supabase y pulsar Run."
echo
for file in "$PROJECT_DIR"/supabase/migrations/*.sql; do
  [ -e "$file" ] || continue
  echo "-- ==========================================================="
  echo "-- $(basename "$file")"
  echo "-- ==========================================================="
  cat "$file"
  echo
done
