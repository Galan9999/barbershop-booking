---
paths:
  - "supabase/**"
  - "src/modules/**/infrastructure/*.repository.ts"
  - "src/shared/infrastructure/supabase/**"
---
# Base de datos y migraciones

## Orden obligatorio: migrar ANTES de desplegar

Vercel despliega solo al hacer push a `main`. Si el código nuevo espera columnas
que todavía no existen en Supabase, producción se rompe en cuanto termina el build.

El orden es siempre:

1. Aplicar la migración en Supabase (`npm run db:push`, o pegar `npm run db:sql`).
2. Comprobar con `npm run check:connection`.
3. Entonces, y solo entonces, `git push`.

Para que esto no obligue a coordinar al segundo, las migraciones deben ser
compatibles hacia atrás siempre que se pueda: añadir columnas opcionales primero,
desplegar, y eliminar las viejas en una migración posterior. Cuando no sea posible
(como al partir una columna en dos), migra primero y acepta que el despliegue
anterior deje de funcionar unos segundos.

## Reglas generales (R7, S10, G6)

- SQL solo vía migraciones versionadas en `supabase/migrations/<timestamp>_<desc>.sql`. Nunca editar una migración ya aplicada.
- Migraciones aditivas y seguras en caliente (expand/contract para renombrados). Cada una documenta propósito y reversión en comentario.
- Nomenclatura: tablas `snake_case` plural inglés; columnas `snake_case`; constraints e índices con nombre explícito (`appointments_active_slot_uq`).
- El índice único parcial `(barber_name, date_time) WHERE status='confirmed'` es la única defensa contra dobles reservas: no sustituirlo nunca por check-then-insert en aplicación.
- Si cambia el esquema: actualizar `shared/types/database.types.ts` en el mismo cambio (son `type` aliases, no interfaces: supabase-js exige `Record<string, unknown>`).
- `SUPABASE_SERVICE_ROLE_KEY` solo se importa desde módulos `server-only`. RLS activado sin políticas públicas.
- Operación multi-fila con transacción → función SQL llamada por `rpc`, no varias llamadas supabase-js encadenadas.
- Queries: columnas explícitas (nada de `select('*')`), apoyadas en índice existente, paginación keyset.
