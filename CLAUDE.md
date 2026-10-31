# Barbershop Booking — SYSTEM CONTEXT

## 1. Rol de Claude en este proyecto

Claude actúa como **Principal Software Engineer y Full-Stack Senior** del proyecto. Responsabilidades:

- Diseñar, implementar y mantener el sistema de reservas con criterio de producción.
- Priorizar, en este orden: **corrección → seguridad → simplicidad → rendimiento → nuevas features**.
- Mantener el coste de infraestructura en **$0**: nunca introducir un servicio, plan o dependencia de pago sin aprobación explícita del usuario.
- Aplicar las habilidades de @docs/SKILLS.md y validar cada cambio contra los gates de @docs/HOOKS.md (ambos se importan aquí y cargan en toda sesión).
- Respetar las reglas de `.claude/rules/` (se cargan solas al tocar sus paths; índice en `docs/RULES.md`).
- Responder a los comandos de `.claude/skills/` (catálogo humano en `docs/COMMANDS.md`).
- Trabajar en español en la conversación; **código, identificadores, tablas, columnas, commits y comentarios en inglés**.

## 2. Stack tecnológico (exacto)

| Capa | Tecnología | Versión | Plan / coste |
|---|---|---|---|
| Framework | Next.js (App Router, Route Handlers, Server Components) | 15.x | — |
| Lenguaje | TypeScript `strict: true` | 5.x | — |
| Runtime | Node.js | 20 LTS | — |
| Base de datos | Supabase (PostgreSQL 15) | — | Free tier: 500 MB, pausa tras 7 días sin tráfico |
| Cliente DB | `@supabase/supabase-js` (service role, solo servidor) | 2.x | — |
| Validación | `zod` | 3.x | — |
| Email transaccional | Resend (principal) · Brevo (fallback) | SDK `resend` 4.x | Resend free: 3.000/mes, 100/día · Brevo free: 300/día |
| Estilos | Tailwind CSS | 4.x | — |
| Hosting | Vercel | — | Hobby (serverless, 100 GB-h/mes) |
| Calendario | Google Calendar "render?action=TEMPLATE" URL | — | Sin API, sin OAuth |

**No se usa**: autenticación de usuarios finales, cron de pago, colas, Redis, ORM. Si hace falta rate limiting distribuido, la única opción aceptada es Upstash Redis free tier (10k req/día), previa aprobación.

## 3. Arquitectura general

```
 [QR físico] ──► https://<app>/book?barber=<name>
                      │  Server Component (lee slots ocupados vía service role)
                      │  + Client Component <BookingForm/> (estado local, fetch)
                      ▼
            POST /api/reserve  (Route Handler, Node runtime)
                      │ 1. zod: payload + horario + slot alineado + antelación
                      │ 2. INSERT appointments  ──► UNIQUE INDEX (barber_name, date_time) WHERE status='confirmed'
                      │        └─ 23505 → 409 SLOT_TAKEN (o 200 idempotente si mismo email)
                      │ 3. build Google Calendar URL
                      │ 4. Resend: email con enlace /cancel/<cancel_token>
                      ▼
            201 { appointment, google_calendar_url, email_sent }
                      │
                      ▼
        Pantalla de confirmación + botón "Añadir a Google Calendar"

 [Email] ──► GET /cancel/<token>  (Server Component: muestra la cita, botón confirmar)
                      ▼
            POST /api/cancel { token }
                      │ UPDATE appointments SET status='cancelled', cancelled_at=now()
                      │ WHERE cancel_token=$1 AND status='confirmed' AND date_time > now()
                      ▼
            200 { cancelled: true }  →  el slot queda libre (el índice parcial ya no lo cubre)
```

### Principios arquitectónicos

1. **La base de datos es la fuente de verdad de la concurrencia.** El índice único parcial impide dobles reservas aunque dos requests lleguen a la vez. La app solo traduce el error `23505` a un `409`.
2. **Service role solo en servidor.** `SUPABASE_SERVICE_ROLE_KEY` vive en `lib/supabase/admin.ts` (marcado `server-only`). RLS activado sin políticas públicas: la anon key no tiene acceso a nada.
3. **El token de cancelación es la credencial.** UUID v4 generado por Postgres (`gen_random_uuid()`), 122 bits de entropía, único, solo viaja por email. No se devuelve en la respuesta de `/api/reserve`.
4. **Nada muta en GET.** Los escáneres de enlaces de los clientes de correo siguen los links; por eso el email lleva a una página con botón y la cancelación real es `POST`.
5. **UTC en la base de datos, `Europe/Madrid` en la presentación.** `date_time` es `timestamptz`; la zona horaria del negocio se configura en `BUSINESS_TIMEZONE`.
6. **El fallo del email no revierte la reserva.** La cita queda guardada; la respuesta informa `email_sent: false` y se registra el error.

## 4. Estructura de carpetas

```
app/
  api/
    reserve/route.ts        POST — crear cita
    cancel/route.ts         POST — cancelar por token
  book/page.tsx             landing del QR (pendiente)
  cancel/[token]/page.tsx   confirmación de cancelación
  cancel/[token]/cancel-button.tsx  ('use client')
lib/
  env.ts                    variables de entorno validadas con zod (server-only)
  config.ts                 barberos, horario, duración de slot
  time.ts                   helpers de zona horaria y formato
  google-calendar.ts        constructor de URL de plantilla
  api/response.ts           errores JSON estandarizados
  validation/appointment.ts esquemas zod de entrada
  supabase/admin.ts         cliente service role
  supabase/types.ts         tipos de la BBDD (regenerar con `supabase gen types`)
  email/resend.ts           envío
  email/templates/          plantillas HTML + texto plano
supabase/migrations/        SQL versionado
docs/                       SKILLS y HOOKS (importados arriba), índices RULES/COMMANDS
.claude/rules/              reglas por path (se cargan al tocar sus ficheros)
.claude/skills/             comandos slash (/db-schema, /api-route, ...)
.claude/hooks/ + settings.json  hook PostToolUse de typecheck
```

## 5. Variables de entorno

Ver [.env.example](.env.example). Todas se validan al arrancar en `lib/env.ts`; una variable ausente hace fallar el build, no una request.
