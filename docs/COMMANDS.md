# COMMANDS — Comandos rápidos del usuario

Comandos slash disponibles en el chat (definidos como skills en `.claude/skills/<nombre>/SKILL.md` (formato recomendado por la docu oficial; sustituye al antiguo `.claude/commands/`)).

| Comando | Qué hace |
|---|---|
| `/db-schema` | Muestra el esquema actual: lee todas las migraciones y presenta tablas, columnas, índices y constraints vigentes, con notas de capacidad del free tier. |
| `/api-route <nombre>` | Genera un Route Handler nuevo en `app/api/<nombre>/route.ts` siguiendo R2 (zod, try/catch, errores tipados) y lo valida contra los gates G1-G4. |
| `/fix-error` | Debugging sistemático: pego un error (o lo describe) y Claude reproduce → aísla → corrige la causa raíz → verifica con `tsc` y explica el porqué. |
| `/check-races` | Auditoría completa del gate G2 sobre el flujo de reservas/cancelación tal y como está el código ahora. |
| `/email-template <nombre>` | Genera una plantilla transaccional nueva (HTML + texto plano) cumpliendo S4, con preview renderizable. |
| `/migration <descripción>` | Genera una migración SQL nueva, nombrada y fechada, cumpliendo S10/G6, y actualiza los tipos TS. |
| `/deploy-check` | Checklist pre-deploy: gates G1-G7, env vars presentes en `.env.example` vs código, límites free tier y pasos de verificación post-deploy. |

Convención: los comandos nunca aplican cambios destructivos sin mostrarlos antes.
