---
description: Genera un Route Handler nuevo siguiendo las reglas del proyecto
argument-hint: <nombre-del-recurso>
---
Crea `app/api/$ARGUMENTS/route.ts` siguiendo la regla .claude/rules/api-routes.md: runtime nodejs, force-dynamic,
flujo parse → zod → negocio → BBDD → efectos → respuesta, try/catch envolvente y errores vía
`lib/api/response.ts`. El esquema zod va en `lib/validation/`. Antes de darlo por bueno, pasa
los gates G1-G4 de docs/HOOKS.md y ejecuta `npx tsc --noEmit`. Si el recurso implica escritura
sobre slots, aplica el checklist G2 explícitamente en tu respuesta.
