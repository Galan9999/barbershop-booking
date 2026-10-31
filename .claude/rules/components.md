---
paths:
  - "app/**/*.tsx"
  - "components/**"
---
# Componentes (R1, R3)

- Server Component por defecto. `'use client'` solo en hojas interactivas (formularios, botones con estado), lo más abajo posible del árbol.
- Un Client Component nunca importa módulos `server-only`, `lib/env.ts` ni `lib/supabase/admin.ts`.
- Props de server a client: solo valores serializables; las fechas cruzan como ISO string, no como `Date`.
- Componentes de una sola ruta viven junto a su `page.tsx`; a `components/` solo con ≥2 consumidores.
- Fechas de cara al usuario: formatear con `lib/time.ts` en `BUSINESS_TIMEZONE`, nunca aritmética manual de zonas.
