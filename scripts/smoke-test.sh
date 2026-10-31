#!/usr/bin/env bash
# End-to-end checks against the local stack (scripts/dev-db.sh + npm run dev).
# Resets the database first, so never point it at a real project.
set -uo pipefail

# Own port and own server: the test must never hit whatever happens to be
# running on :3000, which could be pointed at production.
PORT="${SMOKE_PORT:-3100}"
BASE="http://localhost:$PORT"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"

# This script DROPS the database, so it only runs against the local stack.
# scripts/with-local-db.sh sets USING_LOCAL_STACK and points every variable at
# localhost, which is the only way to get here.
if [ "${USING_LOCAL_STACK:-}" != "1" ]; then
  echo "ABORTADO: este script borra la base de datos." >&2
  echo "Ejecútalo con:  npm run test:smoke" >&2
  echo "(que lo envuelve en scripts/with-local-db.sh y lo fuerza a localhost)" >&2
  exit 1
fi

"$PROJECT_DIR/scripts/dev-db.sh" reset >/dev/null 2>&1

# Start a server with the local-stack variables this script already carries,
# and make sure it dies with us whatever happens.
SERVER_LOG="/tmp/barbershop-smoke-server.log"
npx next dev --port "$PORT" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
cleanup() { kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

for _ in $(seq 1 60); do
  if curl -s -o /dev/null "$BASE/book" 2>/dev/null; then break; fi
  sleep 1
done
if ! curl -s -o /dev/null "$BASE/book"; then
  echo "El servidor de pruebas no arrancó. Log: $SERVER_LOG" >&2
  tail -5 "$SERVER_LOG" >&2
  exit 1
fi
S1=$(node -e 'console.log(new Date("2026-11-02T10:00:00+01:00").toISOString())')
S2=$(node -e 'console.log(new Date("2026-11-03T11:00:00+01:00").toISOString())')
pass=0; fail=0

check() {
  if [ "$2" = "$3" ]; then echo "  PASS  $1"; pass=$((pass+1));
  else echo "  FAIL  $1 (expected $3, got $2)"; fail=$((fail+1)); fi
}
post() { curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$1" -H 'Content-Type: application/json' -d "$2"; }
booking() {
  # $1 first name, $2 surname, $3 email, $4 slot ISO, $5 barber
  echo "{\"client_first_name\":\"$1\",\"client_last_name\":\"$2\",\"client_email\":\"$3\",\"client_phone\":\"600123456\",\"date_time\":\"$4\",\"barber_name\":\"$5\"}"
}

echo "Booking API"
check "valid booking -> 201" "$(post /api/reserve "$(booking Ana Pérez ana@example.com "$S1" Carlos)")" 201
check "same client retry -> 200 idempotent" "$(post /api/reserve "$(booking Ana Pérez ana@example.com "$S1" Carlos)")" 200
check "other client, slot taken -> 409" "$(post /api/reserve "$(booking Otra Persona otra@example.com "$S1" Carlos)")" 409
check "closed on Sunday -> 422" "$(post /api/reserve "$(booking Test User t@example.com 2026-11-08T10:00:00.000Z Carlos)")" 422
check "invalid email -> 422" "$(post /api/reserve "$(booking Test User mal "$S2" Carlos)")" 422
check "missing phone -> 422" "$(post /api/reserve '{"client_first_name":"Test","client_last_name":"User","client_email":"t@example.com","date_time":"'"$S2"'","barber_name":"Carlos"}')" 422
check "phone too short -> 422" "$(post /api/reserve '{"client_first_name":"Test","client_last_name":"User","client_email":"t@example.com","client_phone":"123","date_time":"'"$S2"'","barber_name":"Carlos"}')" 422
check "no surname -> 422" "$(post /api/reserve '{"client_first_name":"Test","client_last_name":"","client_email":"t@example.com","client_phone":"600123456","date_time":"'"$S2"'","barber_name":"Carlos"}')" 422
check "unaligned slot -> 422" "$(post /api/reserve "$(booking Test User t@example.com 2026-11-04T09:15:00.000Z Carlos)")" 422
check "unknown token -> 404" "$(post /api/cancel '{"token":"00000000-0000-4000-8000-000000000000"}')" 404
check "GET on cancel -> 405" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/cancel")" 405

echo "Concurrency"
# Collect the PIDs explicitly: a bare `wait` would also wait on the test
# server started above, which never exits, and the script would hang.
race_pids=()
for i in $(seq 1 10); do
  curl -s -o /dev/null -X POST "$BASE/api/reserve" -H 'Content-Type: application/json' \
    -d "$(booking "Cliente$i" Apellido "c$i@example.com" "$S2" Miguel)" &
  race_pids+=("$!")
done
wait "${race_pids[@]}"
check "exactly one confirmed row survives" \
  "$(psql -d barbershop_dev -tAc "select count(*) from appointments where status='confirmed' and barber_name='Miguel';")" 1

echo "Cancellation"
TOKEN=$(psql -d barbershop_dev -tAc "select cancel_token from appointments where client_email='ana@example.com' and status='confirmed';")
check "cancel -> 200" "$(post /api/cancel "{\"token\":\"$TOKEN\"}")" 200
check "double click idempotent -> 200" "$(post /api/cancel "{\"token\":\"$TOKEN\"}")" 200
check "slot freed, bookable again -> 201" "$(post /api/reserve "$(booking Luis Gómez luis@example.com "$S1" Carlos)")" 201

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
