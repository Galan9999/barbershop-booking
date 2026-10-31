---
paths:
  - "src/app/**/*.tsx"
  - "src/modules/**/ui/**"
  - "src/shared/ui/**"
---
# Componentes e interfaz

## Server y Client Components
- Server Component por defecto. `'use client'` solo en hojas interactivas, lo más abajo
  posible del árbol.
- Un Client Component nunca importa módulos `server-only`, `shared/config/env.ts` ni
  repositorios. Las props cruzan como valores serializables: las fechas, como ISO string.

## Estilos
- **Prohibido el estilo en línea** (`style={{ ... }}`) y las clases con valores mágicos.
  Cada componente tiene su `Nombre.module.css` al lado.
- Todos los valores salen de los tokens de `src/app/globals.css`: colores
  (`--color-*`), espaciado (`--space-*`, escala de 4px), radios, tipografía y sombras.
  Ningún hex suelto, ningún píxel fuera de la escala.
- La única excepción es la plantilla de email, donde los clientes de correo obligan a
  estilos en línea y maquetación con tablas.

## Estructura
- Un componente por carpeta: `Nombre/Nombre.tsx` + `Nombre/Nombre.module.css`.
- La lógica de estado y las llamadas a la API se extraen a `ui/hooks/`; el componente
  queda como maquetación. Si un componente pasa de ~150 líneas, se parte.
- Las llamadas `fetch` viven en el cliente de API del módulo, no en el componente.

## Accesibilidad (WCAG 2.1 AA)
- Todo control interactivo es un `button` o un `input` real, alcanzable con teclado.
- Todo campo tiene `label` visible asociado; el `placeholder` nunca sustituye a la
  etiqueta. Los errores se asocian con `aria-describedby` y `aria-invalid`.
- El estado nunca se indica solo con color: se acompaña de texto, icono o tachado.
- Contraste mínimo 4.5:1 en texto normal.
- Hay estado vacío, de carga y de error para todo lo que pueda estar vacío, cargando
  o fallar.

## Móvil primero
- El QR trae a la gente desde el móvil: se diseña a 375px y se amplía desde ahí.
- Los contenedores que pueden desbordar llevan `min-width: 0`.
- Los inputs usan 16px de tamaño de fuente, para que iOS Safari no haga zoom al enfocar.
