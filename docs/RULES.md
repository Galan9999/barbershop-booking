# RULES & STYLE GUIDE

Las reglas de desarrollo viven en `.claude/rules/` (convención oficial de Claude Code:
cada fichero se carga automáticamente cuando se trabaja con los paths que declara):

| Fichero | Ámbito (`paths`) | Cubre |
|---|---|---|
| `.claude/rules/api-routes.md` | `app/api/**/*.ts` | Route Handlers: flujo, try/catch, errores tipados, G2 |
| `.claude/rules/database.md` | `supabase/**`, `lib/supabase/**` | Migraciones, nomenclatura SQL, concurrencia, RLS |
| `.claude/rules/email.md` | `lib/email/**` | Plantillas, entregabilidad, fallos de envío |
| `.claude/rules/components.md` | `app/**/*.tsx`, `components/**` | Server vs Client Components, props, fechas |
| `.claude/rules/typescript.md` | `**/*.{ts,tsx}` | strict, zod, nomenclatura TS, manejo de errores |

No dupliques reglas aquí: este fichero es solo el índice humano.
