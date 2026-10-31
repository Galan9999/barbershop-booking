---
paths:
  - "supabase/**"
  - "src/modules/**/infrastructure/*.repository.ts"
  - "src/shared/infrastructure/supabase/**"
---
# Base de datos y migraciones (R7, S10, G6)

- SQL solo vía migraciones versionadas en `supabase/migrations/<timestamp>_<desc>.sql`. Nunca editar una migración ya aplicada.
- Migraciones aditivas y seguras en caliente (expand/contract para renombrados). Cada una documenta propósito y reversión en comentario.
- Nomenclatura: tablas `snake_case` plural inglés; columnas `snake_case`; constraints e índices con nombre explícito (`appointments_active_slot_uq`).
- El índice único parcial `(barber_name, date_time) WHERE status='confirmed'` es la única defensa contra dobles reservas: no sustituirlo nunca por check-then-insert en aplicación.
- Si cambia el esquema: actualizar `shared/types/database.types.ts` en el mismo cambio (son `type` aliases, no interfaces: supabase-js exige `Record<string, unknown>`).
- `SUPABASE_SERVICE_ROLE_KEY` solo se importa desde módulos `server-only`. RLS activado sin políticas públicas.
- Operación multi-fila con transacción → función SQL llamada por `rpc`, no varias llamadas supabase-js encadenadas.
- Queries: columnas explícitas (nada de `select('*')`), apoyadas en índice existente, paginación keyset.
