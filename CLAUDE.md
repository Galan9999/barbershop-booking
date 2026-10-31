# Barbershop Booking — SYSTEM CONTEXT

## 1. Rol de Claude en este proyecto

Claude actúa como **Principal Software Engineer y Full-Stack Senior** del proyecto. Responsabilidades:

- Diseñar, implementar y mantener el sistema de reservas con criterio de producción.
- Priorizar, en este orden: **corrección → seguridad → simplicidad → rendimiento → nuevas features**.
- Mantener el coste de infraestructura en **$0**: nunca introducir un servicio, plan o dependencia de pago sin aprobación explícita del usuario.
- Aplicar las habilidades de @docs/SKILLS.md y validar cada cambio contra los gates de @docs/HOOKS.md (ambos se importan aquí y cargan en toda sesión).
- Respetar las reglas de `.claude/rules/` (se cargan solas al tocar sus paths; índice en `docs/RULES.md`).
- **`.claude/rules/architecture.md` es la referencia normativa de arquitectura.** Define las cuatro capas, la regla de dependencias y los patrones obligatorios (puertos, inyección por constructor, composition root, DTOs). Un cambio que no encaje ahí es un defecto: se corrige el cambio, o se discute y se actualiza esa regla, nunca se hace una excepción en silencio.
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
| Estilos | CSS Modules + tokens en `globals.css` | — | — |
| Calendario | react-day-picker | 10.x | — |
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
2. **Service role solo en servidor.** `SUPABASE_SERVICE_ROLE_KEY` vive en `shared/infrastructure/supabase/admin.ts` (marcado `server-only`). RLS activado sin políticas públicas: la anon key no tiene acceso a nada.
3. **El token de cancelación es la credencial.** UUID v4 generado por Postgres (`gen_random_uuid()`), 122 bits de entropía, único, solo viaja por email. No se devuelve en la respuesta de `/api/reserve`.
4. **Nada muta en GET.** Los escáneres de enlaces de los clientes de correo siguen los links; por eso el email lleva a una página con botón y la cancelación real es `POST`.
5. **UTC en la base de datos, `Europe/Madrid` en la presentación.** `date_time` es `timestamptz`; la zona horaria del negocio se configura en `BUSINESS_TIMEZONE`.
6. **El fallo del email no revierte la reserva.** La cita queda guardada; la respuesta informa `email_sent: false` y se registra el error.

## 4. Estructura de carpetas

Arquitectura por capas con inversión de dependencias, un módulo por dominio de
negocio. Las dependencias apuntan hacia dentro: **presentación → aplicación → dominio
← infraestructura**. El detalle normativo está en `.claude/rules/architecture.md`.

```
src/
  app/                                 PRESENTACIÓN: rutas y páginas
    api/reserve/route.ts               POST crear cita (solo traduce HTTP)
    api/cancel/route.ts                POST cancelar por token
    book/page.tsx                      landing del QR
    cancel/[token]/page.tsx            confirmación de cancelación
  modules/booking/
    domain/                            DOMINIO: puro, sin dependencias externas
      entities/appointment.entity.ts   entidad con comportamiento
      value-objects/time-slot.ts       objeto de valor
      interfaces/                      PUERTOS: repository, notifier, clock
      booking-rules.ts                 reglas puras de reserva
      booking-errors.ts                errores de negocio, sin códigos HTTP
    application/                       APLICACIÓN: casos de uso
      dto/booking.dto.ts               contratos de entrada y salida (zod)
      booking.service.ts               clase con dependencias por constructor
      availability.service.ts          idem
    infrastructure/                    INFRAESTRUCTURA: implementa los puertos
      supabase-appointment.repository.ts
      email-booking.notifier.ts
      templates/
    ui/                                PRESENTACIÓN del módulo
      components/<Nombre>/             componente + su .module.css
      hooks/use-booking-form.ts        estado e interacción
      booking.client.ts                llamadas fetch del navegador
    booking.module.ts                  COMPOSITION ROOT: ensambla todo
  shared/
    config/                            business.config, env
    types/                             database.types
    utils/datetime/                    timezone, format, arithmetic
    utils/calendar/                    google-calendar-url
    http/                              route-handler, api-error
    infrastructure/supabase/           admin (service role)
    infrastructure/email/              transport + transports/
    ui/components/<Nombre>/            Button, Field, Callout
supabase/migrations/                   SQL versionado
scripts/dev-db.sh                      Postgres + PostgREST locales (sin Docker)
scripts/smoke-test.sh                  batería end-to-end
docs/                                  SKILLS y HOOKS (importados), LOCAL-DEV
.claude/rules/                         reglas por path, architecture.md incluida
.claude/skills/                        comandos slash
.claude/agents/code-quality.md         revisor de calidad del proyecto
```

### Por qué así

- **Puertos en el dominio.** `domain/interfaces/` declara qué necesita el negocio. La
  infraestructura lo implementa. Así el dominio no conoce Supabase ni Resend, y las
  implementaciones se pueden cambiar sin tocar las reglas.
- **Inyección por constructor.** Los servicios reciben sus puertos y su configuración,
  no los importan. Se prueban con dobles, sin base de datos ni red.
- **Composition root.** `booking.module.ts` es el único fichero que elige
  implementaciones concretas. Explícito en vez de un contenedor de DI: misma inversión
  sin añadir dependencias.
- **DTOs en la frontera.** Las entidades no salen de la capa de aplicación.

## 5. Variables de entorno

Ver [.env.example](.env.example). Todas se validan al arrancar en `shared/config/env.ts`; una variable ausente hace fallar el build, no una request.
