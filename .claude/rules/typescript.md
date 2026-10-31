---
paths:
  - "**/*.{ts,tsx}"
---
# TypeScript y errores (R4, R5, R6)

- `strict: true` innegociable. Sin `any`, sin `!` ni `@ts-ignore` salvo comentario justificando.
- Tipos de dominio derivados de zod (`z.infer`) o de `lib/supabase/types.ts`; no duplicar shapes a mano.
- Todo input externo (body, params, env) pasa por zod antes de usarse: "parse, don't validate".
- Nomenclatura (inglés): `camelCase` variables/funciones, `PascalCase` tipos/componentes, `UPPER_SNAKE_CASE` constantes, ficheros `kebab-case`.
- Prohibido swallow (`catch {}` vacío) y `console.log` de depuración en código entregado.
- Error esperado → 4xx tipado sin log de error; inesperado → `console.error('[scope] msg', { context })` sin tokens ni emails completos.
- Helpers con I/O devuelven resultados explícitos (`{ sent: boolean }`) o lanzan errores tipados; nunca ambos a medias.
