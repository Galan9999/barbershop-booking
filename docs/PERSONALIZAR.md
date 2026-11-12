# Instalar esta app en otra peluquería

Todo lo que distingue a una peluquería de otra son variables de entorno: nombre,
dirección, peluqueros, horarios, duración de las citas, colores y correos. **No hay
que tocar código para poner esto en marcha en un sitio nuevo.**

Si una variable está mal, el despliegue falla con un mensaje que dice exactamente qué
corregir, en vez de desplegar algo roto.

---

## 1. Las variables

### Identidad del negocio

| Variable | Ejemplo | Por defecto |
|---|---|---|
| `BUSINESS_NAME` | `Peluquería Lola` | Barbería Central |
| `BUSINESS_ADDRESS` | `Avinguda Diagonal 200, Barcelona` | Calle Mayor 1, Madrid |
| `BUSINESS_BARBERS` | `Lola, Marta, Noa` | Carlos, Miguel |
| `BUSINESS_TIMEZONE` | `Europe/Madrid` | Europe/Madrid |

Los peluqueros van separados por comas. El orden es el que verá el cliente.

### Horarios

`BUSINESS_OPENING_HOURS` es un JSON con una clave por día de la semana, donde `0` es
domingo. `null` significa cerrado.

```json
{"0":null,"1":{"open":"10:00","close":"19:00"},"2":{"open":"10:00","close":"19:00"},"3":{"open":"10:00","close":"19:00"},"4":{"open":"10:00","close":"21:00"},"5":{"open":"10:00","close":"21:00"},"6":{"open":"09:00","close":"15:00"}}
```

Tiene que ir en una sola línea. Las horas en formato `HH:mm` de 24 horas.

> Todavía no hay soporte para cerrar a mediodía. Si la peluquería hace jornada
> partida, de momento el horario tiene que ser continuo.

### Duraciones

| Variable | Qué es | Por defecto |
|---|---|---|
| `BUSINESS_SLOT_MINUTES` | Cada cuánto empieza una cita | 30 |
| `BUSINESS_MIN_ADVANCE_MINUTES` | Antelación mínima para reservar | 60 |
| `BUSINESS_MAX_ADVANCE_DAYS` | Hasta cuántos días vista se abre | 30 |

### Servicios y precios

`BUSINESS_SERVICES` es la lista de lo que se puede reservar, con su duración en
minutos y su precio en euros. JSON en una sola línea. Por defecto:

```json
[{"id":"haircut","label":"Corte de pelo","minutes":30,"price":15},{"id":"retired","label":"Jubilado","minutes":30,"price":12},{"id":"child","label":"Niño","minutes":30,"price":10},{"id":"beard","label":"Barba","minutes":30,"price":15},{"id":"haircut_beard","label":"Corte y barba","minutes":60,"price":30}]
```

Cada duración debe ser múltiplo de `BUSINESS_SLOT_MINUTES`, o la rejilla dejaría
espacios imposibles de reservar; el sistema se niega a arrancar si no cuadra. Una
cita larga ocupa varios huecos seguidos y tiene que acabar antes del cierre.

El precio sale en el formulario y en los dos correos (cliente y peluquería) y se
guarda con la cita, así que cambiarlo no altera lo que ya se dijo a nadie. El
`id` no se debe cambiar una vez en uso; la `label` sí.

| Variable | Qué es | Por defecto |
|---|---|---|
| `BUSINESS_PAYMENT_NOTE` | Cómo se paga, junto al precio | `Se paga en efectivo en la barbería.` |
| `BUSINESS_PHONE` | Teléfono de la peluquería, en el correo y en la confirmación | (no se muestra) |

Con un único peluquero en `BUSINESS_BARBERS`, el paso de elegir barbero no aparece.

### Colores y tipografía

| Variable | Qué cambia | Por defecto |
|---|---|---|
| `BUSINESS_COLOR_ACCENT` | Botones, día elegido, acentos | `#7c2d12` |
| `BUSINESS_COLOR_ACCENT_HOVER` | El acento al pasar el ratón | `#9a3412` |
| `BUSINESS_COLOR_ACCENT_SOFT` | Fondos suaves del acento | `#fdf3ec` |
| `BUSINESS_COLOR_BACKGROUND` | Fondo de la página | `#faf8f5` |
| `BUSINESS_FONT_DISPLAY` | Tipografía del nombre | `Georgia, serif` |

Solo se pueden cambiar estos. El espaciado, los redondeos y el resto de la escala son
fijos, para que nadie pueda romper la maquetación desde una variable. Un color mal
escrito no tumba la página: se avisa y se usa el valor por defecto.

### Base de datos y correo

| Variable | De dónde sale |
|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Misma pantalla, la clave **secret** (`sb_secret_…`) |
| `RESEND_API_KEY` | Resend → API Keys |
| `EMAIL_FROM` | Remitente verificado, p. ej. `Peluquería Lola <citas@lola.com>` |
| `BUSINESS_EMAIL` | Dónde recibe la peluquería sus citas y las invitaciones |
| `EMAIL_TRANSPORT` | `resend` en producción, `console` para probar sin enviar |
| `NEXT_PUBLIC_APP_URL` | La URL pública real. Va dentro de los enlaces de cancelación |

---

## 2. Montar una peluquería nueva, paso a paso

### Supabase

1. Crear proyecto en <https://supabase.com/dashboard>. No hace falta repositorio.
   Guardar la contraseña de base de datos: no se puede volver a ver.
2. En **Security**, al crear el proyecto: **Enable Data API** sí,
   **Automatically expose new tables** no, **Enable automatic RLS** sí.
   Las migraciones conceden permisos solo al rol de servicio.
3. Aplicar el esquema. Con terminal:

   ```bash
   DATABASE_URL='<connection string con la contraseña>' npm run db:push
   ```

   Sin terminal: `npm run db:sql` imprime todas las migraciones en orden; se pegan en
   el **SQL Editor** de Supabase y se pulsa Run.
4. Copiar el **Project URL** y la clave **secret**.

### Resend

1. Crear la clave en <https://resend.com> → API Keys. Permiso de solo envío basta.
2. **Verificar el dominio de la peluquería** en Domains, añadiendo los registros DNS
   que indique. Hasta que el dominio aparezca como `verified`, los correos solo llegan
   a la dirección con la que se registró la cuenta: los clientes **no recibirán nada**.
3. Poner `EMAIL_FROM` con una dirección de ese dominio.

### Vercel

1. Importar el repositorio en <https://vercel.com/new>. No añadir las integraciones de
   Supabase ni Resend que ofrece: crearían recursos nuevos distintos de los de arriba.
2. **Antes de desplegar**, añadir las variables en **Environment Variables**. La caja
   acepta un `.env` entero pegado. Se puede generar con:

   ```bash
   npm run vercel:env -- https://la-url-de-la-peluqueria.vercel.app
   ```

   Eso escribe `vercel-env.txt`, que contiene claves y conviene borrar después.
3. Desplegar. Si falta alguna variable el build falla y el registro dice cuál.
4. Comprobar la URL real que ha quedado y, si no coincide con la que pusiste en
   `NEXT_PUBLIC_APP_URL`, corregirla y volver a desplegar. Esa variable es la que va
   dentro de los enlaces de cancelación de cada correo.

### Códigos QR

```bash
npm run qr -- https://la-url-de-la-peluqueria.vercel.app --barbers
```

Lee el nombre, los peluqueros y el color de acento de la configuración, así que los
carteles salen ya con la identidad de esa peluquería. Detalles de impresión en
`docs/QR.md`.

---

## 3. Comprobar antes de dar por buena una instalación

```bash
npm run check:connection
```

Valida las variables, lee de Supabase y comprueba la clave de Resend. Después, a mano:

1. Reservar desde la URL real y confirmar que llega el correo.
2. Abrir el enlace de cancelación del correo y cancelar.
3. Volver a la página y comprobar que el hueco quedó libre.
4. Escanear el QR impreso con un móvil.

---

## 4. Cambiar de dueño o de correo

Para pasarle la aplicación a otra persona:

- **Correo de la peluquería**: cambiar `BUSINESS_EMAIL` y redesplegar. Las citas y las
  invitaciones de calendario pasan a esa dirección.
- **Cuenta de Vercel**: Settings → Transfer Project, o que la otra persona importe el
  repositorio en su cuenta y configure las mismas variables.
- **Proyecto de Supabase**: se puede transferir a otra organización desde Settings, o
  crear uno nuevo y aplicar las migraciones.

Nada queda atado a una cuenta concreta: todo son variables.

---

## 5. Lo que hay que decidir si esto crece

Ahora mismo cada peluquería necesita **su propio despliegue y su propia base de
datos**. Funciona y es simple, pero tiene dos límites que conviene conocer antes de
vender la segunda instalación:

- **El plan gratuito de Vercel es solo para uso personal.** Cobrar por este servicio
  requiere plan de pago, unos 20 € al mes por cuenta.
- **El plan gratuito de Supabase permite dos proyectos activos** por organización, y
  pausa los que pasan siete días sin tráfico.

Si va a haber más de dos o tres peluquerías, sale más a cuenta una sola instalación
que atienda a todas, con una tabla de negocios y una ruta por peluquería. Es un cambio
de arquitectura con su trabajo, pero convierte un coste por cliente en un coste fijo.
