#!/usr/bin/env bash
# Deploys to Vercel and configures the environment from .env.local.
#
#   npx vercel login      (once, interactive)
#   ./scripts/deploy-vercel.sh
#
# Secrets are piped to `vercel env add` on stdin, so they never appear in the
# command line or the shell history.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
ENV_FILE=".env.local"

[ -f "$ENV_FILE" ] || { echo "Falta $ENV_FILE" >&2; exit 1; }

if ! npx vercel whoami >/dev/null 2>&1; then
  echo "No hay sesión en Vercel. Ejecuta primero:  npx vercel login" >&2
  exit 1
fi
echo "Cuenta de Vercel: $(npx vercel whoami 2>/dev/null)"

read_var() {
  grep -E "^[[:space:]]*$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- \
    | sed 's/^[[:space:]]*//; s/[[:space:]]*$//; s/^"//; s/"$//'
}

echo
echo "1/4 Enlazando el proyecto…"
npx vercel link --yes >/dev/null
echo "    enlazado"

echo
echo "2/4 Subiendo variables de entorno…"
for name in BUSINESS_TIMEZONE SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY \
            EMAIL_TRANSPORT RESEND_API_KEY EMAIL_FROM; do
  value="$(read_var "$name")"
  if [ -z "$value" ]; then
    echo "    AVISO: $name vacía en $ENV_FILE, se omite"
    continue
  fi
  npx vercel env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$value" | npx vercel env add "$name" production >/dev/null 2>&1
  echo "    $name"
done

echo
echo "3/4 Primer despliegue (para conocer la URL)…"
DEPLOY_URL="$(npx vercel deploy --prod --yes 2>/dev/null | tail -1)"
echo "    $DEPLOY_URL"

# The public URL is what ends up inside the cancellation links in every email,
# so it has to be the real one, which only exists after the first deploy.
echo
echo "4/4 Fijando NEXT_PUBLIC_APP_URL y redesplegando…"
npx vercel env rm NEXT_PUBLIC_APP_URL production --yes >/dev/null 2>&1 || true
printf '%s' "$DEPLOY_URL" | npx vercel env add NEXT_PUBLIC_APP_URL production >/dev/null 2>&1
FINAL_URL="$(npx vercel deploy --prod --yes 2>/dev/null | tail -1)"

echo
echo "Desplegado: $FINAL_URL"
echo
echo "Siguientes pasos:"
echo "  1. Abre $FINAL_URL/book y haz una reserva de prueba"
echo "  2. Genera los códigos:  npm run qr -- $FINAL_URL --barbers"
