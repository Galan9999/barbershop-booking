# Estado del proyecto

Última actualización: 3 de noviembre de 2026.

## En producción

<https://barbershop-booking-nine.vercel.app>

Funcionando y verificado: reservar, ver huecos ocupados en tiempo real, cancelar desde
el enlace del correo y que el hueco vuelva a quedar libre. Diez reservas simultáneas
al mismo hueco dejan exactamente una, garantizado por un índice único parcial en
Postgres, no por lógica de aplicación.

| Pieza | Dónde | Plan |
|---|---|---|
| App | Vercel | Hobby (uso personal) |
| Base de datos | Supabase | Free, 500 MB |
| Correo | Resend | Free, 100/día |

## Pendientes conocidos

### 1. Los clientes no reciben el correo de confirmación

**Bloqueante para uso real, en curso.** Dominio propio comprado el 3 de noviembre de
2026: `barbershoparmandobrites.com` (Namecheap). Producción ya está configurada con
`EMAIL_FROM=citas@barbershoparmandobrites.com` y `BUSINESS_EMAIL` apuntando al correo
de Armando.

Falta **verificar el dominio en Resend** (Domains → Add Domain, copiar los registros
DNS que da a Namecheap → Advanced DNS). Hasta que Resend lo marque `verified`, todo
envío falla, también el de la peluquería.

Mientras tanto la cita **sí se guarda**: el fallo del correo nunca revierte una
reserva, y la pantalla de confirmación lo advierte.

### 2. El evento no siempre entra solo en el calendario

Cada reserva envía a `BUSINESS_EMAIL` un correo con la cita adjunta en formato
iCalendar, y al cancelar llega la anulación del mismo evento. Se corrigió el fallo que
lo impedía (el organizador no coincidía con el remitente), pero **falta confirmar en
un buzón real** que Gmail lo añade sin intervención.

Si no lo hace, hay dos causas posibles: la opción de Gmail en Configuración → General
→ "Añadir invitaciones al calendario", y la falta de dominio verificado, que hace que
Gmail trate al remitente como desconocido.

La alternativa que no falla es conectar con la interfaz de Google Calendar mediante
autorización OAuth, con lo que la aplicación escribiría el evento directamente. Es más
trabajo y requiere credenciales en Google Cloud.

### 3. Quitar la compatibilidad temporal de la migración de servicios

`20261103200000_add_service_and_end_time.sql` deja un valor por defecto en
`service_name` y `price` y un trigger que rellena `ends_at`, para que el código
anterior siguiera funcionando durante el despliegue. Ya no hacen falta: una migración
posterior debe quitarlos (los comandos están en el propio fichero).

### 4. No hay jornada partida

`BUSINESS_OPENING_HOURS` admite un único tramo por día. Una peluquería que cierre a
mediodía no se puede configurar todavía: haría falta aceptar una lista de tramos por
día en lugar de un solo `{open, close}`.

### 5. No hay panel de administración

Las citas se consultan en el SQL Editor de Supabase. Se descartó el panel
deliberadamente; el correo con la invitación de calendario cubre la necesidad diaria.

> El Table Editor de Supabase muestra la tabla vacía porque la seguridad a nivel de
> fila está activa sin políticas. Para ver los datos, SQL Editor:
> `select * from appointments order by created_at desc;`

## Decisiones registradas

- [Un despliegue por peluquería](decisiones/0001-un-despliegue-por-peluqueria.md)

## Guías

| Documento | Para qué |
|---|---|
| `PERSONALIZAR.md` | Instalar en una peluquería nueva, de principio a fin |
| `SETUP-PRODUCCION.md` | Dar de alta Supabase, Resend y Vercel |
| `LOCAL-DEV.md` | Desarrollo con base de datos local, sin Docker |
| `QR.md` | Generar e imprimir los códigos |
| `HOOKS.md` | Qué validar antes de dar por bueno un cambio |
| `SKILLS.md` | Prácticas que aplica Claude en este proyecto |
