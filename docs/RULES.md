# RULES & STYLE GUIDE

Las reglas viven en `.claude/rules/` (convención oficial de Claude Code: cada fichero
se carga automáticamente al trabajar con los paths que declara).

| Fichero | Ámbito (`paths`) | Cubre |
|---|---|---|
| `architecture.md` | siempre | **Referencia normativa**: capas, regla de dependencias, puertos, inyección, composition root, DTOs y anti-patrones |
| `api-routes.md` | `src/app/api/**` | Route Handlers: traducción HTTP, errores tipados, gate G2 |
| `database.md` | `supabase/**`, repositorios | Migraciones, nomenclatura SQL, concurrencia, RLS |
| `email.md` | infraestructura de email | Plantillas, entregabilidad, fallos de envío |
| `components.md` | `src/app/**`, `ui/**` | Server vs Client, CSS Modules, accesibilidad, móvil |
| `typescript.md` | `src/**/*.{ts,tsx}` | strict, zod, nomenclatura, manejo de errores |

`architecture.md` no lleva `paths`: se carga en toda sesión, porque aplica a cualquier
cambio estructural. No dupliques reglas aquí: este fichero es solo el índice humano.
