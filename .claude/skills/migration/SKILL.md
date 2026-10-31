---
description: Genera una migración SQL nueva y actualiza los tipos
argument-hint: <descripción corta en inglés>
---
Crea `supabase/migrations/<YYYYMMDDHHMMSS>_$ARGUMENTS.sql` (timestamp UTC actual, descripción
en snake_case) cumpliendo S10/G6: aditiva, constraints con nombre, comentario de propósito y
reversión. Nunca edites migraciones existentes. Actualiza `lib/supabase/types.ts` en el mismo
cambio y pasa `npx tsc --noEmit`.
