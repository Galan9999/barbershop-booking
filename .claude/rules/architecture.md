# Arquitectura por capas (estricta)

El código se organiza en capas con dependencias en una sola dirección. Cada pieza va
en su sitio: una regla de negocio nunca vive en una ruta, una consulta nunca vive en
un servicio.

| Capa | Carpeta | Puede importar | Nunca contiene |
|---|---|---|---|
| Dominio | `lib/domain/` | nada del proyecto salvo `lib/config.ts` y helpers puros | I/O, HTTP, SQL, `env` |
| Repositorios | `lib/repositories/` | dominio, `lib/supabase/` | reglas de negocio, HTTP |
| Servicios | `lib/services/` | dominio, repositorios, helpers, email | `Request`, `Response`, códigos HTTP |
| Helpers | `lib/*.ts` (`time`, `google-calendar`) | nada del proyecto | estado, I/O |
| Rutas | `app/api/**/route.ts` | servicios, validación, `lib/api/` | reglas de negocio, SQL, email |
| Páginas | `app/**/page.tsx` | servicios | SQL, reglas de negocio |

Reglas que se siguen de lo anterior:

- **Toda consulta a `appointments` vive en `lib/repositories/`.** Ningún otro fichero
  importa `supabaseAdmin`.
- **Los errores de negocio son `BookingError`** (`lib/domain/errors.ts`), sin códigos
  HTTP. La traducción a estado HTTP ocurre en un único sitio: `lib/api/response.ts`.
- **Un Route Handler solo traduce**: parsea, llama a un servicio y devuelve. La
  envoltura común (zod, try/catch, mapeo de errores) está en `lib/api/handle-route.ts`,
  así que un handler nuevo no repite nada de eso.
- **El dominio recibe el reloj y la zona horaria como argumentos**, nunca los lee del
  entorno: así es testeable y lo comparten la API y la rejilla de disponibilidad.
- **Las funciones puras no leen `env`.** Si una función necesita configuración, se le
  pasa.
