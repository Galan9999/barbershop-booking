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
# Slots on upcoming weekdays at a given Madrid wall-clock time, so the suite
# never ages into "too soon". Usage: slot <days ahead, at least> <HH:mm>
slot() {
  node -e '
const [minDays, clock] = process.argv.slice(1);
const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const day = new Date(Date.now() + Number(minDays) * 86400000);
for (;;) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(day);
  for (const offset of ["+01:00", "+02:00"]) {
    const candidate = new Date(`${ymd}T${clock}:00${offset}`);
    const parts = Object.fromEntries(fmt.formatToParts(candidate).map((p) => [p.type, p.value]));
    if (`${parts.hour}:${parts.minute}` === clock && !["Sat", "Sun"].includes(parts.weekday)) {
      console.log(candidate.toISOString());
      process.exit(0);
    }
  }
  day.setTime(day.getTime() + 86400000);
}' "$1" "$2"
}
S1=$(slot 2 10:00)        # Carlos
S1_PREV=$(slot 2 09:30)
S1_NEXT=$(slot 2 10:30)
S1_LATE=$(slot 2 19:30)   # local stack closes at 20:00 on weekdays
S1_LAST=$(slot 2 19:00)
S2=$(slot 4 11:00)        # Miguel, concurrency
S2_NEXT=$(slot 4 11:30)
pass=0; fail=0

check() {
  if [ "$2" = "$3" ]; then echo "  PASS  $1"; pass=$((pass+1));
  else echo "  FAIL  $1 (expected $3, got $2)"; fail=$((fail+1)); fi
}
post() { curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$1" -H 'Content-Type: application/json' -d "$2"; }
booking() {
  # $1 first name, $2 surname, $3 email, $4 slot ISO, $5 barber, $6 service (default haircut)
  echo "{\"client_first_name\":\"$1\",\"client_last_name\":\"$2\",\"client_email\":\"$3\",\"client_phone\":\"600123456\",\"date_time\":\"$4\",\"barber_name\":\"$5\",\"service_id\":\"${6:-haircut}\"}"
}

echo "Booking API"
check "valid booking -> 201" "$(post /api/reserve "$(booking Ana Pérez ana@example.com "$S1" Carlos)")" 201
check "same client retry -> 200 idempotent" "$(post /api/reserve "$(booking Ana Pérez ana@example.com "$S1" Carlos)")" 200
check "other client, slot taken -> 409" "$(post /api/reserve "$(booking Otra Persona otra@example.com "$S1" Carlos)")" 409
check "closed on Sunday -> 422" "$(post /api/reserve "$(booking Test User t@example.com "$(node -e 'const d=new Date();d.setUTCDate(d.getUTCDate()+((7-d.getUTCDay())%7||7));d.setUTCHours(10,0,0,0);console.log(d.toISOString())')" Carlos)")" 422
check "invalid email -> 422" "$(post /api/reserve "$(booking Test User mal "$S2" Carlos)")" 422
check "missing phone -> 422" "$(post /api/reserve '{"client_first_name":"Test","client_last_name":"User","client_email":"t@example.com","date_time":"'"$S2"'","barber_name":"Carlos"}')" 422
check "phone too short -> 422" "$(post /api/reserve '{"client_first_name":"Test","client_last_name":"User","client_email":"t@example.com","client_phone":"123","date_time":"'"$S2"'","barber_name":"Carlos"}')" 422
check "no surname -> 422" "$(post /api/reserve '{"client_first_name":"Test","client_last_name":"","client_email":"t@example.com","client_phone":"600123456","date_time":"'"$S2"'","barber_name":"Carlos"}')" 422
check "unaligned slot -> 422" "$(post /api/reserve "$(booking Test User t@example.com "$(slot 2 09:15)" Carlos)")" 422
check "missing service -> 422" "$(post /api/reserve '{"client_first_name":"Test","client_last_name":"User","client_email":"t@example.com","client_phone":"600123456","date_time":"'"$S1_NEXT"'","barber_name":"Carlos"}')" 422
check "unknown service -> 422" "$(post /api/reserve "$(booking Test User t@example.com "$S1_NEXT" Carlos massage)")" 422

echo "Durations and overlaps"
check "1h service overlapping a booked 30 min -> 409" "$(post /api/reserve "$(booking Otra Persona otra@example.com "$S1_PREV" Carlos haircut_beard)")" 409
check "30 min right after a booking -> 201" "$(post /api/reserve "$(booking Pau Vidal pau@example.com "$S1_NEXT" Carlos beard)")" 201
check "1h service past closing time -> 422" "$(post /api/reserve "$(booking Test User t@example.com "$S1_LATE" Carlos haircut_beard)")" 422
check "1h service ending at closing -> 201" "$(post /api/reserve "$(booking Eva Roca eva@example.com "$S1_LAST" Carlos haircut_beard)")" 201
check "1h booking stores its end time" \
  "$(psql -d barbershop_dev -tAc "select (ends_at - date_time) = interval '1 hour' from appointments where client_email='eva@example.com';")" t
check "30 min inside a booked hour -> 409" "$(post /api/reserve "$(booking Otra Persona otra@example.com "$S1_LATE" Carlos beard)")" 409
check "unknown token -> 404" "$(post /api/cancel '{"token":"00000000-0000-4000-8000-000000000000"}')" 404
check "GET on cancel -> 405" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/cancel")" 405

echo "Concurrency"
# Collect the PIDs explicitly: a bare `wait` would also wait on the test
# server started above, which never exits, and the script would hang.
# Half ask for an hour from S2, half for half an hour from S2 + 30 min: every
# pair overlaps, so whatever the interleaving exactly one may survive.
race_pids=()
for i in $(seq 1 10); do
  if [ $((i % 2)) -eq 0 ]; then start="$S2"; service=haircut_beard; else start="$S2_NEXT"; service=haircut; fi
  curl -s -o /dev/null -X POST "$BASE/api/reserve" -H 'Content-Type: application/json' \
    -d "$(booking "Cliente$i" Apellido "c$i@example.com" "$start" Miguel "$service")" &
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
