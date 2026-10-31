# HOOKS & ALERTS — Eventos de control

Qué valida Claude **antes de dar por bueno cualquier cambio**. Un cambio que no pasa
todos los gates aplicables no se presenta como terminado.

## Gates (bloqueantes)

### G1 · Type safety
- `npx tsc --noEmit` sin errores. Sin `any` nuevos, sin `@ts-ignore` / `@ts-expect-error` sin comentario justificando.
- Tipos de BBDD (`lib/supabase/types.ts`) coherentes con la última migración.

### G2 · Race conditions (flujo de reservas)
Checklist obligatorio si el cambio toca `/api/reserve`, `/api/cancel`, migraciones de `appointments` o `lib/supabase/`:
- [ ] El índice único parcial `(barber_name, date_time) WHERE status='confirmed'` sigue existiendo y sigue siendo la única defensa contra dobles reservas.
- [ ] El error `23505` sigue manejado y traducido a `409` (o a respuesta idempotente).
- [ ] Ninguna lógica nueva hace check-then-act sin respaldo de constraint.
- [ ] La cancelación sigue siendo UPDATE condicional idempotente.
- Simular mentalmente: dos POST idénticos simultáneos; reserva y cancelación simultáneas sobre la misma cita.

### G3 · Seguridad
- `SUPABASE_SERVICE_ROLE_KEY` solo se importa desde módulos `server-only`. Nada con prefijo `NEXT_PUBLIC_` contiene secretos.
- `cancel_token` no aparece en respuestas de `/api/reserve`, logs, ni URLs de analytics.
- Ningún `GET` muta estado.
- Mensajes de error al cliente sin detalles internos (SQL, rutas de fichero, versiones).

### G4 · Validación de entrada
- Todo dato externo (body, params, headers usados) pasa por un esquema zod antes de tocar la BBDD.
- Fechas: se valida formato ISO con offset, antelación mínima, horizonte máximo, horario de apertura y alineación al slot.

### G5 · Emails
- Plantilla modificada → existe versión HTML y texto plano, los enlaces usan `APP_URL`, y se ha renderizado con datos de prueba.
- El fallo del proveedor está capturado: la reserva nunca se revierte por un fallo de email.

### G6 · Migraciones
- Migración nueva (nunca editada) en `supabase/migrations/`, aditiva, con constraints nombrados y reversión documentada.
- Si cambia el esquema: tipos TS regenerados/actualizados en el mismo cambio.

### G7 · Coste $0
- Dependencia o servicio nuevo → declarar su plan free y límites, y pedir aprobación explícita antes de integrarlo.

## Alertas (no bloqueantes: avisar al usuario sin que pregunte)
- Proyección de acercarse a un límite free (filas en BBDD, emails/día, invocaciones).
- Un cambio aparentemente pequeño que en realidad exige migración o variable de entorno nueva.
- Deuda detectada al pasar por un fichero (sin arreglarla de tapadillo: se propone).
- Cambio de contrato de API que rompería clientes existentes (el QR impreso es un cliente: la URL de reserva **no puede cambiar**).

## Hooks automatizados (harness)
Definidos en `.claude/settings.json`:
- **PostToolUse** sobre `Edit|Write`: ejecuta `.claude/hooks/typecheck.sh`, que lanza `tsc --noEmit` si el fichero tocado es `.ts`/`.tsx` y existen `node_modules`. El script sale con código 2 y escribe en stderr cuando `tsc` falla: es el mecanismo documentado para que Claude vea el problema justo después de la edición.
