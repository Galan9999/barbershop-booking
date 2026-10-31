#!/usr/bin/env bash
# Local Supabase-compatible stack without Docker: Postgres + PostgREST.
# The app talks to PostgREST exactly as it talks to hosted Supabase, so the
# partial unique index and every constraint are exercised for real.
#
#   ./scripts/dev-db.sh start   start Postgres + PostgREST and apply migrations
#   ./scripts/dev-db.sh stop    stop both
#   ./scripts/dev-db.sh reset   drop and recreate the database
#   ./scripts/dev-db.sh psql    open a psql shell on the dev database
set -euo pipefail

PG_BIN="/opt/homebrew/opt/postgresql@17/bin"
PG_DATA="/opt/homebrew/var/postgresql@17"
PG_LOG="/opt/homebrew/var/log/postgresql@17.log"
DB_NAME="barbershop_dev"
PGREST_PORT=54322
PROXY_PORT=54321
PROXY_LOG="/tmp/barbershop-proxy.log"
PGREST_LOG="/tmp/barbershop-postgrest.log"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Must match SUPABASE_JWT_SECRET in .env.local (>= 32 chars).
JWT_SECRET="super-secret-local-jwt-token-with-at-least-32-characters"

export PATH="$PG_BIN:$PATH"
export LC_ALL="en_US.UTF-8" LANG="en_US.UTF-8"   # macOS: Postgres refuses to start without it

start_postgres() {
  if pg_ctl -D "$PG_DATA" status >/dev/null 2>&1; then
    echo "postgres: already running"
  else
    pg_ctl -D "$PG_DATA" -l "$PG_LOG" start >/dev/null
    echo "postgres: started"
  fi
}

create_database() {
  if psql -d postgres -tAc "select 1 from pg_database where datname='$DB_NAME'" | grep -q 1; then
    echo "database: $DB_NAME exists"
    return
  fi
  createdb "$DB_NAME"
  echo "database: $DB_NAME created"
}

create_roles() {
  # Same role names hosted Supabase uses, so JWTs and grants behave the same.
  psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -q <<SQL
do \$\$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
  end if;
end
\$\$;
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
SQL
  echo "roles: ready"
}

apply_migrations() {
  for f in "$PROJECT_DIR"/supabase/migrations/*.sql; do
    [ -e "$f" ] || continue
    psql -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -f "$f" 2>/dev/null \
      && echo "migration: applied $(basename "$f")" \
      || echo "migration: skipped $(basename "$f") (already applied)"
  done
  # Grants again: tables created by the migrations above need them.
  psql -d "$DB_NAME" -q -c "grant all on all tables in schema public to service_role;"
}

start_postgrest() {
  if lsof -ti:"$PGREST_PORT" >/dev/null 2>&1; then
    echo "postgrest: already running on $PGREST_PORT"
    return
  fi
  cat > /tmp/barbershop-postgrest.conf <<CONF
db-uri = "postgres://authenticator@localhost:5432/$DB_NAME"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-port = $PGREST_PORT
CONF
  postgrest /tmp/barbershop-postgrest.conf > "$PGREST_LOG" 2>&1 &
  sleep 2
  echo "postgrest: started on http://localhost:$PGREST_PORT"
}

start_proxy() {
  # supabase-js calls <url>/rest/v1/<table>; PostgREST serves /<table>.
  if lsof -ti:"$PROXY_PORT" >/dev/null 2>&1; then
    echo "proxy: already running on $PROXY_PORT"
    return
  fi
  PROXY_PORT="$PROXY_PORT" POSTGREST_PORT="$PGREST_PORT" \
    node "$PROJECT_DIR/scripts/supabase-proxy.mjs" > "$PROXY_LOG" 2>&1 &
  sleep 1
  echo "proxy: started on http://localhost:$PROXY_PORT"
}

case "${1:-start}" in
  start)
    start_postgres; create_database; create_roles; apply_migrations; start_postgrest; start_proxy
    echo "ready: SUPABASE_URL=http://localhost:$PROXY_PORT"
    ;;
  stop)
    lsof -ti:"$PROXY_PORT" | xargs kill 2>/dev/null && echo "proxy: stopped" || echo "proxy: not running"
    lsof -ti:"$PGREST_PORT" | xargs kill 2>/dev/null && echo "postgrest: stopped" || echo "postgrest: not running"
    pg_ctl -D "$PG_DATA" stop >/dev/null 2>&1 && echo "postgres: stopped" || echo "postgres: not running"
    ;;
  reset)
    lsof -ti:"$PROXY_PORT" | xargs kill 2>/dev/null || true
    lsof -ti:"$PGREST_PORT" | xargs kill 2>/dev/null || true
    start_postgres
    dropdb --if-exists "$DB_NAME"
    echo "database: dropped"
    create_database; create_roles; apply_migrations; start_postgrest; start_proxy
    ;;
  psql) psql -d "$DB_NAME" ;;
  *) echo "usage: $0 {start|stop|reset|psql}"; exit 1 ;;
esac
