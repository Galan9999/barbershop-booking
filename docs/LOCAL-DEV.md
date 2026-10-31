# Desarrollo local

## Un solo fichero de entorno

`.env.local` es el único fichero de configuración, y contiene las credenciales
**reales** (Supabase y Resend). Está en `.gitignore`. La plantilla documentada es
`.env.example`, que sí va en git.

El stack local **no usa fichero**: `scripts/with-local-db.sh` pone sus variables en el
entorno del proceso, y en Next.js esas ganan sobre `.env.local`. Por eso no hay que
alternar ficheros ni copiar nada: basta con elegir el comando.

| Comando | Contra qué corre |
|---|---|
| `npm run dev` | Supabase y Resend reales, según `.env.local` |
| `npm run dev:local` | Postgres local; los correos se escriben en `.dev-emails/` |
| `npm run test:smoke` | Siempre local, en su propio servidor y puerto |

## Stack local (sin Docker)

Postgres 17 y PostgREST instalados con Homebrew, más un proxy mínimo que replica la
forma de URL de Supabase (`/rest/v1/...`). El código de la aplicación es idéntico en
local y en producción.

Requisitos, una vez:

```bash
brew install postgresql@17 postgrest
```

Uso:

```bash
npm run db:start     # Postgres + PostgREST + proxy, aplica migraciones
npm run dev:local    # la app contra ese stack
npm run db:psql      # consola SQL sobre barbershop_dev
npm run db:reset     # base limpia desde las migraciones
npm run db:stop      # parar todo
```

## Comprobar credenciales

```bash
npm run check:connection
```

Lee `.env.local`, valida que están todas las variables, hace una lectura contra
Supabase y comprueba la clave de Resend. No imprime secretos y no modifica nada.
Detecta además los dos errores fáciles: poner la clave *publishable* de Supabase donde
va la *secret*, y confundir el Project URL con la cadena de conexión de Postgres.

Para dar de alta los servicios, ver `docs/SETUP-PRODUCCION.md`.

## Batería end-to-end

```bash
npm run test:smoke
```

Cubre: reserva válida, reintento idempotente del mismo cliente, hueco ocupado por otro,
día cerrado, email inválido, hueco desalineado, token inexistente, `GET` que no muta,
diez reservas simultáneas al mismo hueco (debe sobrevivir exactamente una),
cancelación, doble clic y liberación del hueco.

**Este script borra la base de datos.** Por eso es autocontenido: resetea la base
local, levanta su propio servidor en el puerto 3100 con las variables locales, y lo
para al terminar. No usa el servidor que tengas en el 3000, que podría estar apuntando
a Supabase. Si se ejecuta sin ese envoltorio, aborta.
