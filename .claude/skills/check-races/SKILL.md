---
description: Auditoría de race conditions del flujo de reservas y cancelación
---
Ejecuta el checklist completo del gate G2 (docs/HOOKS.md) contra el código actual:
lee la última migración, `/api/reserve`, `/api/cancel` y `lib/supabase/`. Para cada punto,
cita el fichero y línea que lo satisface o lo incumple. Simula por escrito: dos reservas
idénticas simultáneas, reserva+cancelación simultáneas, y doble clic en cancelar.
Termina con veredicto PASS/FAIL y, si FAIL, el fix propuesto sin aplicarlo.
