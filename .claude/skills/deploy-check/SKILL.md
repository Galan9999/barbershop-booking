---
description: Checklist completo pre-deploy
disable-model-invocation: true
---
Pasa y reporta, uno a uno, los gates G1-G7 de docs/HOOKS.md sobre el estado actual del repo.
Además: compara `.env.example` con las variables realmente usadas en `lib/env.ts` y el código;
verifica que ninguna variable secreta tenga prefijo NEXT_PUBLIC_; lista los límites free tier
relevantes y el consumo esperado. Termina con GO / NO-GO y los pasos de verificación
post-deploy (reservar, recibir email, cancelar, comprobar slot liberado).
