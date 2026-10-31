#!/usr/bin/env bash
# End-to-end checks against the local stack (scripts/dev-db.sh + npm run dev).
# Resets the database first, so never point it at a real project.
set -uo pipefail

BASE="${BASE_URL:-http://localhost:3000}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# This script DROPS the database. Refuse to run unless the app is pointed at the
# local stack, so a stray .env.local can never cost real bookings.
if [ -f "$PROJECT_DIR/.env.local" ]; then
  configured_url="$(grep -E '^[[:space:]]*SUPABASE_URL=' "$PROJECT_DIR/.env.local" | tail -1 | cut -d= -f2- | tr -d '"'"'"' ' )"
  case "$configured_url" in
    http://localhost:*|http://127.0.0.1:*) ;;
    *)
      echo "ABORTADO: SUPABASE_URL apunta a '$configured_url', no al stack local." >&2
      echo "Este script borra la base de datos. Solo se ejecuta contra localhost." >&2
      exit 1
      ;;
  esac
fi

"$PROJECT_DIR/scripts/dev-db.sh" reset >/dev/null 2>&1
S1=$(node -e 'console.log(new Date("2026-11-02T10:00:00+01:00").toISOString())')
S2=$(node -e 'console.log(new Date("2026-11-03T11:00:00+01:00").toISOString())')
pass=0; fail=0

check() {
  if [ "$2" = "$3" ]; then echo "  PASS  $1"; pass=$((pass+1));
  else echo "  FAIL  $1 (expected $3, got $2)"; fail=$((fail+1)); fi
}
post() { curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$1" -H 'Content-Type: application/json' -d "$2"; }
booking() { echo "{\"client_name\":\"$1\",\"client_email\":\"$2\",\"date_time\":\"$3\",\"barber_name\":\"$4\"}"; }

echo "Booking API"
check "valid booking -> 201" "$(post /api/reserve "$(booking 'Ana Pérez' ana@example.com "$S1" Carlos)")" 201
check "same client retry -> 200 idempotent" "$(post /api/reserve "$(booking 'Ana Pérez' ana@example.com "$S1" Carlos)")" 200
check "other client, slot taken -> 409" "$(post /api/reserve "$(booking 'Otra Persona' otra@example.com "$S1" Carlos)")" 409
check "closed on Sunday -> 422" "$(post /api/reserve "$(booking 'Test User' t@example.com 2026-11-08T10:00:00.000Z Carlos)")" 422
check "invalid email -> 422" "$(post /api/reserve "$(booking 'Test User' mal "$S2" Carlos)")" 422
check "unaligned slot -> 422" "$(post /api/reserve "$(booking 'Test User' t@example.com 2026-11-04T09:15:00.000Z Carlos)")" 422
check "unknown token -> 404" "$(post /api/cancel '{"token":"00000000-0000-4000-8000-000000000000"}')" 404
check "GET on cancel -> 405" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/cancel")" 405

echo "Concurrency"
for i in $(seq 1 10); do
  curl -s -o /dev/null -X POST "$BASE/api/reserve" -H 'Content-Type: application/json' \
    -d "$(booking "Cliente $i" "c$i@example.com" "$S2" Miguel)" &
done; wait
check "exactly one confirmed row survives" \
  "$(psql -d barbershop_dev -tAc "select count(*) from appointments where status='confirmed' and barber_name='Miguel';")" 1

echo "Cancellation"
TOKEN=$(psql -d barbershop_dev -tAc "select cancel_token from appointments where client_email='ana@example.com' and status='confirmed';")
check "cancel -> 200" "$(post /api/cancel "{\"token\":\"$TOKEN\"}")" 200
check "double click idempotent -> 200" "$(post /api/cancel "{\"token\":\"$TOKEN\"}")" 200
check "slot freed, bookable again -> 201" "$(post /api/reserve "$(booking 'Luis Gómez' luis@example.com "$S1" Carlos)")" 201

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
