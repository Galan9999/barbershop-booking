# 1. Un despliegue por peluquería, no multi-peluquería

**Fecha**: 31 de octubre de 2026
**Estado**: aceptada

## Contexto

La aplicación nació para una barbería concreta. Al plantearse instalarla en otras
peluquerías aparecieron dos caminos:

1. **Un despliegue por peluquería**: cada una con su proyecto de Vercel, su base de
   datos de Supabase y sus variables de entorno.
2. **Una sola instalación para todas**: una tabla de negocios, una ruta por
   peluquería (`/[peluqueria]/book`), y aislamiento de datos por identificador.

## Decisión

Un despliegue por peluquería, por ahora.

Toda la configuración específica de cada sitio está en variables de entorno (nombre,
peluqueros, horarios, duraciones, colores, correos), así que una instalación nueva no
toca código. Eso hace el camino 1 barato de ejecutar hoy.

## Por qué

- Con una o dos peluquerías, la multi-peluquería añade complejidad que nadie está
  pagando todavía: aislamiento de datos, rutas por negocio, administración.
- El aislamiento es total por construcción: una base de datos por cliente significa
  que un error no puede filtrar citas de una peluquería a otra.
- Si un cliente se va, se apaga su despliegue y ya está.

## Consecuencias

Lo que aceptamos a cambio:

- Cada peluquería nueva requiere crear su proyecto de Supabase y su proyecto de
  Vercel, unos veinte minutos siguiendo `docs/PERSONALIZAR.md`.
- Un cambio de código hay que desplegarlo en cada instalación.
- El coste crece por cliente en lugar de repartirse.

## Cuándo revisarla

Dos señales, cualquiera de las dos:

- **Más de dos o tres peluquerías.** El plan gratuito de Supabase permite dos
  proyectos activos por organización, y el de Vercel no admite uso comercial, así que
  cobrar ya obliga a un plan de pago por cuenta. A partir de ahí el coste fijo de una
  instalación compartida sale mejor.
- **Desplegar lo mismo en varios sitios empieza a doler**, o se olvida alguno y las
  instalaciones divergen.

## Qué implicaría el cambio

- Tabla `shops` y columna `shop_id` en `appointments`, con el índice único de huecos
  pasando a `(shop_id, barber_name, date_time)`.
- Rutas por peluquería y resolución del negocio desde la URL o el dominio.
- Mover la configuración de variables de entorno a filas de la base.
- Row level security por negocio, o la garantía equivalente en la capa de repositorio.

La arquitectura por capas actual ayuda: el cambio se concentra en el repositorio y en
la configuración, no en el dominio ni en la interfaz.
