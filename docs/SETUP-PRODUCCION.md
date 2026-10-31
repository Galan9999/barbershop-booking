# Conectar Supabase y Resend

Todo en capa gratuita. Son cuentas tuyas, así que los pasos de alta los haces tú;
las claves no hace falta que pasen por el chat, basta con que acaben en `.env.local`.

Al terminar cada bloque, comprueba con:

```bash
npm run check:connection
```

---

## 1. Supabase (base de datos)

**Plan gratuito**: 500 MB, 2 proyectos activos. Pausa el proyecto tras 7 días sin
tráfico; vuelve solo con una visita.

1. Entra en <https://supabase.com/dashboard> y crea un proyecto. No hace falta ningún
   repositorio: un proyecto Supabase es solo una base de datos alojada.
   - **Region**: `West EU (Ireland)` o `Central EU (Frankfurt)`, lo más cerca de tus
     clientes.
   - **Database password**: genera una y guárdala. La necesitas en el paso 3 y no se
     puede volver a ver.
   - **Security**, las tres casillas:

     | Opción | Marcar | Por qué |
     |---|---|---|
     | Enable Data API | **Sí** | `supabase-js` habla con la API REST. Sin esto no funciona nada |
     | Automatically expose new tables | **No** | Concedería acceso a los roles `anon` y `authenticated` en cada tabla nueva. Nuestras migraciones conceden permisos solo a `service_role` |
     | Enable automatic RLS | **Sí** | Activa seguridad a nivel de fila en toda tabla nueva. Nuestra migración ya lo hace explícitamente; esto cubre cualquier tabla futura que se cree sin acordarse |

     La migración `20261031180000_grant_service_role_access.sql` existe precisamente
     para que el esquema no dependa de esas casillas: concede a `service_role` lo que
     necesita, y nada a `anon` ni a `authenticated`.
2. Copia dos valores de **Project Settings → API Keys**:
   - **Project URL** → `SUPABASE_URL` (`https://xxxx.supabase.co`)
   - **secret key** → `SUPABASE_SERVICE_ROLE_KEY` (empieza por `sb_secret_`)

   > Supabase ofrece dos claves. La **publishable** (`sb_publishable_…`) es la pública
   > y no sirve aquí: con RLS activado y sin políticas no puede leer nada. Hace falta
   > la **secret**. En proyectos antiguos esas dos claves se llamaban `anon` y
   > `service_role`, y eran JWT que empezaban por `eyJ`.
   >
   > La clave secreta **nunca** lleva el prefijo `NEXT_PUBLIC_`.

3. Aplica el esquema. En **Project Settings → Database → Connection string → URI**
   copia la cadena y sustituye `[YOUR-PASSWORD]` por la del paso 1:

   ```bash
   DATABASE_URL='postgresql://postgres.xxxx:TU_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' npm run db:push
   ```

   Alternativa sin terminal: `npm run db:sql` imprime todas las migraciones
   concatenadas y en orden. Copia la salida entera, pégala en el **SQL Editor** de
   Supabase y pulsa Run. Se puede ejecutar todo de una vez; lo que no se puede es
   alterar el orden, porque la segunda migración concede permisos sobre la tabla que
   crea la primera.

4. Comprueba en **Table Editor** que existe `appointments` y que el índice
   `appointments_active_slot_uq` aparece en **Database → Indexes**. Ese índice es lo
   único que impide dobles reservas: sin él la app acepta dos citas en el mismo hueco.

---

## 2. Resend (emails)

**Plan gratuito**: 3.000 correos al mes, 100 al día.

1. Crea la cuenta en <https://resend.com> y ve a **API Keys → Create API Key**.
   - Permiso **Sending access** basta. Con ese permiso la clave no puede listar
     dominios, y `npm run check:connection` lo refleja como válida igualmente.
   - Cópiala al momento: solo se muestra una vez. → `RESEND_API_KEY`
2. Elige remitente:
   - **Para probar ya, sin dominio**: usa `EMAIL_FROM="Barbería Central <onboarding@resend.dev>"`.
     Resend solo te deja enviar a la dirección con la que te registraste, suficiente
     para una prueba de punta a punta.
   - **Para producción**: en **Domains → Add Domain** añade tu dominio y copia los
     registros DNS que te da (DKIM, SPF y, recomendado, DMARC). Cuando el dominio
     aparezca como `verified`, usa `EMAIL_FROM="Barbería Central <citas@tudominio.com>"`.
     Sin dominio propio los correos acaban en spam.
3. Pon `EMAIL_TRANSPORT=resend` para que envíe de verdad. Con `console` los correos se
   escriben en `.dev-emails/` y no sale nada de la máquina.

---

## 3. Rellenar las claves

Hay **un solo fichero**: `.env.local`, con tus credenciales reales. Cópialo de
`.env.example` si no existe, rellénalo y comprueba:

```bash
npm run check:connection
```

Está en `.gitignore`, así que las claves no llegan nunca a un commit.

Para trabajar contra la base local no hace falta tocar nada: `npm run dev:local` pone
sus propias variables por encima, sin modificar `.env.local`.

---

## 4. Probar de punta a punta

```bash
npm run check:connection
npm run dev
```

Abre <http://localhost:3000/book>, reserva con tu propio email, y comprueba que:

1. La pantalla de confirmación muestra el botón de Google Calendar y el enlace abre un
   evento con la fecha y el barbero correctos.
2. Te llega el correo. Si no aparece, mira **Logs** en Resend: ahí se ve si salió y qué
   respondió el servidor del destinatario.
3. El enlace de cancelación del correo abre la página de cancelación y, al confirmar,
   el hueco vuelve a estar libre en `/book`.

> `npm run test:smoke` **borra la base** al empezar, así que es autocontenido: usa la
> base local y levanta su propio servidor en otro puerto. No puede tocar Supabase.

---

## 5. Desplegar en Vercel

**Plan Hobby**: gratuito para proyectos personales.

1. Sube el repositorio a GitHub e impórtalo en <https://vercel.com/new>.
2. En **Settings → Environment Variables** añade las mismas cinco variables, con
   `NEXT_PUBLIC_APP_URL` apuntando a la URL real del despliegue. Ese valor es el que
   acaba en los enlaces de cancelación del correo: si está mal, los enlaces no
   funcionan.
3. Tras el primer despliegue, genera el QR apuntando a `https://tu-app.vercel.app/book`
   (o `.../book?barber=Carlos` para un código por barbero).
4. Repite la prueba del punto 4 contra la URL de producción antes de imprimir nada.

### Mantener Supabase despierto

El plan gratuito pausa el proyecto tras 7 días sin tráfico. Si la barbería tiene
visitas a diario no es un problema. Si no, añade un cron de Vercel (también gratuito)
que llame a la app una vez por semana.
