#!/usr/bin/env bash
# Runs a command against the LOCAL stack (scripts/dev-db.sh), whatever
# .env.local says.
#
#   ./scripts/with-local-db.sh npm run dev
#   ./scripts/with-local-db.sh ./scripts/smoke-test.sh
#
# Environment variables set here win over .env.local in Next.js, so the local
# stack needs no env file of its own. These values are not secrets: the JWT is
# signed with the fixed development secret in dev-db.sh and only ever reaches
# a database on this machine.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JWT_SECRET="super-secret-local-jwt-token-with-at-least-32-characters"

# Mint a service_role token for the local PostgREST, valid for a day.
LOCAL_KEY="$(node -e '
const crypto = require("crypto");
const secret = process.argv[1];
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const issuedAt = Math.floor(Date.now() / 1000);
const header = encode({ alg: "HS256", typ: "JWT" });
const payload = encode({ role: "service_role", iss: "supabase-local", iat: issuedAt, exp: issuedAt + 86400 });
const signature = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
process.stdout.write(`${header}.${payload}.${signature}`);
' "$JWT_SECRET")"

export NEXT_PUBLIC_APP_URL="http://localhost:3000"
export BUSINESS_TIMEZONE="Europe/Madrid"
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_SERVICE_ROLE_KEY="$LOCAL_KEY"
export EMAIL_TRANSPORT="console"
export RESEND_API_KEY="re_local_placeholder"
export EMAIL_FROM="Barbería Central <citas@example.com>"
export USING_LOCAL_STACK="1"

cd "$PROJECT_DIR"
exec "$@"
