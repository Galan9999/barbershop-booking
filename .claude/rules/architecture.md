# Arquitectura por capas — la referencia del proyecto

Esta es **la** forma correcta de estructurar código aquí. Cualquier cambio se mide
contra este documento; si algo no encaja, se discute y se actualiza este fichero, no
se hace una excepción en silencio.

## Las cuatro capas

| Capa | Dónde | Responsabilidad | Tecnologías |
|---|---|---|---|
| Presentación | `src/app/`, `src/modules/*/ui/` | Rutas, páginas, componentes, traducción HTTP | Next.js, React |
| Aplicación | `src/modules/*/application/` | Orquestar casos de uso, DTOs | Servicios (clases) |
| Dominio | `src/modules/*/domain/` | Reglas de negocio, entidades, puertos | TypeScript puro |
| Infraestructura | `src/modules/*/infrastructure/`, `src/shared/infrastructure/` | Persistencia, servicios externos | Supabase, Resend |

Cada capa **habla solo con la adyacente**. Presentación llama a aplicación; aplicación
usa el dominio; infraestructura implementa lo que el dominio declara.

## La regla de dependencias

**Las dependencias apuntan hacia dentro.** El dominio es el centro y no depende de
nadie. Infraestructura depende del dominio, nunca al revés.

```
Presentación ──► Aplicación ──► Dominio ◄── Infraestructura
```

Esto se consigue con **inversión de dependencias**: el dominio declara interfaces
(puertos) en `domain/interfaces/`, la infraestructura las implementa, y el composition
root las conecta. Un servicio nunca importa una clase concreta de infraestructura.

> Nota sobre la fuente: el artículo que inspiró esta estructura dibuja en su diagrama
> "Domain accesses Infrastructure", lo que contradice la regla que él mismo enuncia.
> En este proyecto seguimos la regla, no el diagrama: **el dominio no accede a nada**.
> El artículo también usa `any` en los repositorios; aquí está prohibido.

## Estructura

```
src/
  app/                                   Presentación: rutas y páginas
  modules/<módulo>/
    domain/
      entities/                          entidades con comportamiento
      value-objects/                     objetos de valor (TimeSlot)
      interfaces/                        PUERTOS que la infraestructura implementa
      booking-rules.ts                   reglas puras
      booking-errors.ts                  errores de negocio, sin códigos HTTP
    application/
      dto/                               contratos de entrada y salida (zod)
      *.service.ts                       casos de uso, clases con DI por constructor
    infrastructure/
      supabase-*.repository.ts           implementa el puerto de persistencia
      email-*.notifier.ts                implementa el puerto de notificación
      templates/                         plantillas concretas
    ui/
      components/<Nombre>/               componente + su .module.css
      hooks/                             estado e interacción
      *.client.ts                        llamadas fetch del navegador
    <módulo>.module.ts                   COMPOSITION ROOT: ensambla las dependencias
  shared/
    config/                              constantes de negocio y entorno validado
    types/                               tipos transversales
    utils/<tema>/                        helpers puros agrupados por tema
    http/                                envoltura de rutas y mapeo de errores
    infrastructure/                      clientes externos
    ui/components/<Nombre>/              componentes genéricos
```

## Patrones obligatorios

1. **Repositorio.** Todo acceso a datos detrás de una interfaz del dominio. La
   implementación traduce filas a entidades: `snake_case`, fechas en texto y códigos de
   error de Postgres no salen de la infraestructura.
2. **Puertos e interfaces.** `domain/interfaces/` declara qué necesita el negocio
   (`AppointmentRepository`, `BookingNotifier`, `Clock`). Las firmas documentan las
   garantías que la implementación debe cumplir, como la idempotencia del cancelado.
3. **Inyección de dependencias por constructor.** Los servicios reciben sus puertos y
   su configuración; no importan implementaciones ni leen `env`. Así se prueban con
   dobles, sin base de datos.
4. **Composition root.** `<módulo>.module.ts` es el único sitio que elige
   implementaciones concretas. Usamos un composition root explícito en vez de un
   contenedor de DI: misma inversión, sin dependencia extra.
5. **Entidades con comportamiento.** Lo que se puede responder sobre una cita vive en
   la entidad (`canBeCancelledAt`, `belongsTo`, `hasPassed`), no repetido en cada
   servicio.
6. **DTOs en la frontera.** Las entidades no salen de la capa de aplicación: la interfaz
   y las rutas consumen DTOs. Los esquemas zod viven en `application/dto/`, no en el
   dominio, porque zod es una librería externa.

## Anti-patrones (defecto bloqueante)

- **Saltarse una capa.** Una página o ruta que importa un repositorio.
- **Filtrar tipos de infraestructura hacia arriba.** Una fila de base de datos, un
  `PostgrestError` o una entidad en un componente.
- **Acoplar aplicación a implementaciones.** Un servicio que importa
  `supabase-*.repository` en vez de recibir el puerto.
- **Dominio impuro.** Cualquier import de librería externa, I/O o `env` en `domain/`.
- **Dependencias circulares** entre módulos o capas.
- **Mezclar responsabilidades** en un fichero: si su nombre no dice qué hace, se parte.
- **`any`**, que anula la abstracción que estas capas existen para dar.

## Cómo añadir una funcionalidad

1. Modela el concepto en `domain/` (entidad, objeto de valor, regla).
2. Si necesita el exterior, declara el puerto en `domain/interfaces/`.
3. Escribe el caso de uso en `application/`, recibiendo el puerto por constructor.
4. Implementa el puerto en `infrastructure/`.
5. Conéctalo en el composition root.
6. Expón un DTO y consúmelo desde `app/` o `ui/`.
