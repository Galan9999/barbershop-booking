---
description: Genera una plantilla de email transaccional (HTML + texto plano)
argument-hint: <nombre-de-la-plantilla>
---
Crea `modules/booking/infrastructure/templates/$ARGUMENTS.ts` exportando `{ subject, html, text }` como funciones
puras de sus datos. Cumple S4 (docs/SKILLS.md): asunto <60 caracteres, enlaces absolutos con
`APP_URL`, HTML simple compatible con clientes de correo (tablas, estilos inline, sin JS),
versión texto completa. Renderiza un ejemplo con datos de prueba en tu respuesta.
