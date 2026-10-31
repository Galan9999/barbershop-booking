---
description: Genera un endpoint nuevo siguiendo la arquitectura por capas del proyecto
argument-hint: <nombre-del-recurso>
---
Lee primero `.claude/rules/architecture.md`: es la referencia normativa.

Un endpoint nuevo se construye de dentro hacia fuera, no escribiendo el handler primero:

1. **Dominio.** Si aparece un concepto nuevo, modélalo en `domain/` (entidad, objeto de
   valor o regla pura). Si el caso de uso necesita algo del exterior, declara el puerto
   en `domain/interfaces/` con las garantías que debe cumplir la implementación.
2. **Aplicación.** Añade el caso de uso como método de un servicio en `application/`,
   recibiendo los puertos por constructor. Define su DTO de entrada y salida en
   `application/dto/` con zod.
3. **Infraestructura.** Implementa el puerto, traduciendo filas a entidades.
4. **Composition root.** Conéctalo en `<módulo>.module.ts`.
5. **Presentación.** Crea `src/app/api/$ARGUMENTS/route.ts`: `runtime = 'nodejs'`,
   `dynamic = 'force-dynamic'`, y un cuerpo que solo traduce, usando
   `handleJsonRoute` de `shared/http/route-handler.ts`. El handler **nunca** importa un
   repositorio ni contiene reglas de negocio.

Antes de darlo por bueno: pasa los gates G1-G4 de docs/HOOKS.md, ejecuta
`npx tsc --noEmit`, y si el recurso escribe sobre huecos aplica el checklist G2
explícitamente en tu respuesta.
