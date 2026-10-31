# SKILLS — Catálogo de habilidades del proyecto

Habilidades que Claude aplica de forma proactiva en mantenimiento y evolución de la app.
Cada skill define cuándo se activa y qué implica. Los identificadores van en inglés.

## S1 · `postgres-query-optimization`
**Se activa**: al escribir o modificar cualquier query, o si una página/endpoint se percibe lento.
- Toda query sobre `appointments` debe apoyarse en un índice existente; verificar con `EXPLAIN ANALYZE` antes de aceptar un seq scan.
- Preferir índices parciales (`WHERE status = 'confirmed'`): la tabla acumulará citas canceladas e históricas que no deben pesar en las lecturas calientes.
- Paginación keyset (`WHERE date_time > $cursor ORDER BY date_time LIMIT n`), nunca `OFFSET` sobre tablas crecientes.
- Seleccionar columnas explícitas; prohibido `select('*')` en código de producción.
- Vigilar el free tier: 500 MB. Proponer purga/archivado de citas antiguas cuando la tabla supere ~1M filas.

## S2 · `concurrency-and-race-safety`
**Se activa**: en cualquier cambio que toque creación, cancelación o lectura de slots.
- La unicidad del slot la garantiza **solo** el índice único parcial en la BBDD. Nunca sustituirlo por un check-then-insert en aplicación.
- Todo INSERT de reserva maneja el error `23505` y lo traduce a `409 SLOT_TAKEN` (o respuesta idempotente si es el mismo cliente reintentando).
- Las cancelaciones usan UPDATE condicional (`WHERE status = 'confirmed'`) para ser idempotentes y no resucitar citas.
- Si en el futuro hay operaciones multi-fila, usar funciones SQL (`rpc`) con transacción, no varias llamadas supabase-js encadenadas.
- Las garantías de concurrencia se documentan en la interfaz del puerto (`domain/interfaces/appointment-repository.interface.ts`), para que cualquier implementación futura sepa qué debe cumplir.

## S3 · `nextjs-app-router-architecture`
**Se activa**: al crear páginas, componentes o endpoints.
- Server Components por defecto; `'use client'` solo en hojas interactivas (formularios, botones con estado).
- Route Handlers con `runtime = 'nodejs'` y `dynamic = 'force-dynamic'`: nada de este dominio es cacheable.
- Estado del formulario: estado local de React (`useState`) + `fetch` al handler; no introducir librerías de estado global para este tamaño de app.
- Datos de disponibilidad se leen en el servidor (Server Component) y se pasan como props serializables.

## S4 · `transactional-email-deliverability`
**Se activa**: en cualquier cambio de envío o plantillas de email.
- Dominio de envío propio con SPF, DKIM y DMARC configurados en Resend; nunca enviar desde el dominio compartido en producción.
- Toda plantilla tiene versión HTML **y** texto plano; asunto < 60 caracteres, sin palabras típicas de spam.
- Los enlaces apuntan siempre a `APP_URL` (dominio propio), nunca a IPs ni acortadores.
- El fallo de envío no rompe la reserva: se registra, se responde `email_sent: false` y la UI ofrece reintento.
- Límites free: Resend 100/día. Al acercarse, alertar y preparar fallback a Brevo (300/día) tras la misma interfaz `sendEmail()`.

## S5 · `timezone-correctness`
**Se activa**: en todo código que cree, compare o muestre fechas.
- La BBDD guarda `timestamptz` (UTC). El negocio opera en `BUSINESS_TIMEZONE` (Europe/Madrid).
- Formateo solo con `Intl.DateTimeFormat` + helpers de `shared/utils/datetime/`; prohibido sumar/restar horas a mano para "convertir" zonas.
- Validaciones de horario de apertura se evalúan en la zona del negocio, no en UTC ni en la del servidor.
- Revisar los cambios de hora (DST): un slot de las 09:00 debe seguir siendo las 09:00 locales tras el cambio.

## S6 · `secure-token-flows`
**Se activa**: en todo lo que toque `cancel_token` o futuros tokens.
- Tokens UUID v4 generados por Postgres, columna `UNIQUE`, 122 bits de entropía. Nunca derivar tokens de datos predecibles.
- El token solo viaja en el email y en la URL de cancelación. Nunca en la respuesta de `/api/reserve`, en logs ni en analytics.
- Toda acción con efectos vía token es `POST`; los `GET` con token solo muestran información (los escáneres de email siguen los enlaces).
- La verificación del token la hace la query (`WHERE cancel_token = $1`), nunca comparación en aplicación tras un fetch amplio.

## S7 · `input-validation-zod`
**Se activa**: en cada entrada externa (body, params, query, env).
- "Parse, don't validate": el handler trabaja con el tipo inferido del esquema, nunca con el body crudo.
- Los esquemas viven en `application/dto/`, no en el dominio: zod es una librería externa y el dominio se mantiene puro.
- Esquemas en `application/dto/`, compartidos entre cliente y servidor cuando aplique.
- `process.env` se valida una vez en `shared/config/env.ts`; el resto del código importa el objeto tipado.

## S8 · `error-handling-and-observability`
**Se activa**: al escribir handlers, helpers con I/O, o al depurar.
- Respuestas de error uniformes: `{ error: { code, message } }` vía `shared/http/api-error.ts`; el cliente nunca ve stack traces ni mensajes de Postgres.
- Log server-side estructurado (`console.error` con objeto: ruta, código, causa) — visible en Vercel logs (free).
- Distinguir siempre error esperado (validación, conflicto) de inesperado (500): solo el segundo se loguea como error.

## S9 · `free-tier-cost-control`
**Se activa**: al añadir dependencias, servicios o features con consumo.
- Presupuesto: $0. Toda propuesta de servicio nuevo incluye su límite free y qué pasa al superarlo.
- Vigilar: Supabase (500 MB, pausa a los 7 días sin tráfico), Vercel Hobby (invocaciones/GB-h), Resend (100/día).
- Mitigación de pausa de Supabase: ping semanal vía Vercel Cron (free) si el tráfico real no lo cubre.

## S10 · `db-migrations-discipline`
**Se activa**: ante cualquier cambio de esquema.
- Todo cambio de esquema es una migración nueva en `supabase/migrations/`, con timestamp y nombre descriptivo. Nunca editar una migración ya aplicada.
- Migraciones aditivas y seguras en caliente (expand/contract para renombrados); constraints con nombre explícito.
- Cada migración documenta en comentario su propósito y su reversión.
