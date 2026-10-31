---
paths:
  - "app/api/**/*.ts"
---
# Route Handlers (R2)

- Ubicación: `app/api/<recurso>/route.ts`. Un recurso, un fichero. Lógica de negocio en `lib/`, aquí solo orquestación.
- Siempre: `export const runtime = 'nodejs'` y `export const dynamic = 'force-dynamic'`.
- Cuerpo completo envuelto en `try/catch`. El `catch` final loguea con contexto y responde `500 INTERNAL` genérico.
- Flujo fijo: (1) parse JSON seguro → (2) zod (`lib/validation/`) → (3) reglas de negocio → (4) BBDD → (5) efectos (email) → (6) respuesta tipada.
- Errores: siempre `jsonError(code, message, status)` de `lib/api/response.ts`. Códigos estables en inglés: son contrato de API.
- Métodos no soportados responden `405` con header `Allow`.
- Ningún `GET` muta estado (los escáneres de email siguen los enlaces).
- `cancel_token` nunca aparece en respuestas de reserva, logs ni analytics.
- Si el cambio toca reservas/cancelación: aplicar el checklist G2 de docs/HOOKS.md (el índice único parcial es la única defensa contra dobles reservas; `23505` → `409` o replay idempotente).
