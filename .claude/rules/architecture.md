# Arquitectura por capas (estricta)

El código vive en `src/`, organizado por módulo de negocio y, dentro de cada módulo,
por capa. Las dependencias van en una sola dirección: **ui → application → domain**,
con infrastructure debajo. Nada apunta hacia arriba.

```
src/
  app/                        Next.js App Router: solo rutas y páginas
  modules/<módulo>/
    domain/                   reglas puras, tipos de negocio, errores, esquemas zod
    application/              casos de uso (servicios)
    infrastructure/           repositorios, plantillas, adaptadores concretos
    ui/components/<Nombre>/   componente + su .module.css
    ui/hooks/                 estado y lógica de interacción extraídos
  shared/
    config/                   constantes de negocio y entorno validado
    types/                    tipos transversales (esquema de la base)
    utils/<tema>/             helpers puros agrupados por tema
    http/                     envoltura de Route Handlers y mapeo de errores
    infrastructure/           clientes externos (supabase, email)
    ui/components/<Nombre>/   componentes genéricos reutilizables
```

## Qué puede importar cada capa

| Capa | Puede importar | Nunca contiene |
|---|---|---|
| `domain/` | `shared/config`, `shared/utils` | I/O, HTTP, SQL, `env` |
| `application/` | domain, infrastructure del módulo, shared | `Request`, `Response`, códigos HTTP |
| `infrastructure/` | domain, shared | reglas de negocio |
| `shared/utils/` | nada del proyecto | estado, I/O, `env` |
| `ui/components/` | application (solo tipos), otros componentes, hooks | fetch directo, reglas de negocio |
| `ui/hooks/` | el cliente de API del módulo, tipos | JSX |
| `app/` | application, componentes | SQL, reglas de negocio, email |

## Reglas que se siguen de lo anterior

- **Un fichero, una responsabilidad, y su nombre lo dice.** Nada de cajones de sastre:
  los helpers de fechas viven en `shared/utils/datetime/` separados en `timezone.ts`
  (razonamiento horario), `format.ts` (presentación) y `arithmetic.ts` (cálculo).
- **Toda consulta a `appointments` vive en el repositorio del módulo.** Ningún otro
  fichero importa `supabaseAdmin`. El repositorio además traduce filas de base de datos
  a objetos de dominio, así que `snake_case` y las fechas en texto no salen de ahí.
- **Los errores de negocio son `BookingError`**, sin códigos HTTP. La traducción a
  estado HTTP ocurre en un único sitio: `shared/http/api-error.ts`.
- **Un Route Handler solo traduce.** La envoltura común (zod, try/catch, mapeo de
  errores) está en `shared/http/route-handler.ts`.
- **El dominio recibe el reloj y la zona horaria como argumentos.** Nunca los lee del
  entorno: así es testeable y lo comparten la API y la rejilla de disponibilidad.
- **Las constantes van a `shared/config/`, los tipos a donde pertenecen**: los de
  negocio al `domain/` de su módulo, los del esquema de base a `shared/types/`.
