# Desarrollo local

Stack local equivalente a Supabase, sin Docker y sin coste: Postgres 17 y PostgREST
instalados con Homebrew, más un proxy mínimo que replica la forma de URL de Supabase
(`/rest/v1/...`), de modo que el código de la aplicación es idéntico en local y en
producción.

## Requisitos (una vez)

```bash
brew install postgresql@17 postgrest
```

## Uso

```bash
npm run db:start     # Postgres + PostgREST + proxy, aplica migraciones
npm run dev          # la app en http://localhost:3000
npm run test:smoke   # batería end-to-end (resetea la base)
npm run db:psql      # consola SQL sobre barbershop_dev
npm run db:stop      # parar todo
npm run db:reset     # base limpia desde las migraciones
```

`.env.local` ya apunta al stack local y usa `EMAIL_TRANSPORT=console`: los correos no
salen de la máquina, se escriben en `.dev-emails/` para poder abrir el enlace de
cancelación.

## Qué cubre la batería

Reserva válida, reintento idempotente del mismo cliente, hueco ocupado por otro,
día cerrado, email inválido, hueco desalineado, token inexistente, `GET` que no muta,
diez reservas simultáneas al mismo hueco (debe sobrevivir exactamente una),
cancelación, doble clic y liberación del hueco.
