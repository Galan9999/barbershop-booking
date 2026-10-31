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

## Comprobar credenciales

```bash
npm run check:connection
```

Lee `.env.local`, valida que están todas las variables, hace una lectura contra
Supabase y pregunta a Resend por los dominios verificados. No imprime secretos y no
modifica nada. Para conectar con los servicios reales, ver `docs/SETUP-PRODUCCION.md`.

## Qué cubre la batería

Reserva válida, reintento idempotente del mismo cliente, hueco ocupado por otro,
día cerrado, email inválido, hueco desalineado, token inexistente, `GET` que no muta,
diez reservas simultáneas al mismo hueco (debe sobrevivir exactamente una),
cancelación, doble clic y liberación del hueco.

> `npm run test:smoke` **borra la base de datos** al empezar. Ejecútalo solo contra el
> stack local, nunca con `.env.local` apuntando a Supabase.

## Alternar entre local y remoto

```bash
npm run env:local      # Postgres + PostgREST en esta máquina
npm run env:remote     # Supabase + Resend reales
npm run check:connection
```

Los dos ficheros viven en `env/`, fuera de git. Reinicia el servidor de desarrollo
después de cambiar de entorno.
