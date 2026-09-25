# Checklist de setup — Notebooks.com.ar

Estado **verificado contra producción el 2026-08-06**. Hacé los pasos en orden.
Todo esto requiere la `service_role` o acceso a dashboards → lo hacés vos, no el asistente.

- Sitio: https://notebooks-tan.vercel.app · Supabase ref: `itisgcfxvryxyvolxjvs`
- Deploy: ✅ al día · Blog: ✅ 5 reseñas publicadas · Listings: 73

---

## 🚨 Estado al 2026-09-24: quince días caído, y el vigía está en una rama

Vuelto a medir el 24-sep: **sin cambios**. `notebooks-tan.vercel.app` sigue en 500 y
`itisgcfxvryxyvolxjvs.supabase.co` sigue en NXDOMAIN. Los cuatro workflows fallaron hoy otra
vez; van quince días desde el 9-sep. El sitio, además, lleva dos semanas y media sin scrapear:
los precios que muestre cuando la base vuelva son del 8 de septiembre.

**Por qué nadie se enteró, que es lo nuevo de esta ronda.** Los dos workflows que existen
justamente para avisar de esto no están en `main`:

```
main:                detectar-paridad, emails, scrape, verificar
paridad-2026-09-15:  … + vigilar, avisar-fallas      ← sin mergear
```

La ronda del 15-sep escribió el vigía y lo dejó donde no corre. **Mergear
`paridad-2026-09-15` aunque sea sólo por esos dos archivos** es lo que hay que hacer primero,
antes incluso de arreglar la base: mientras no estén en `main`, la caída siguiente —incluida la
que provoque un deploy— también va a pasar inadvertida.

Los pasos para la base, abajo, siguen valiendo tal cual.

---

## 🚨 Estado al 2026-09-15: el sitio está caído y la causa no es código

Medido el 15-sep: `notebooks-tan.vercel.app` contesta **500** en `/`, `/notebooks` y `/llms.txt`.
El host de la base, **`itisgcfxvryxyvolxjvs.supabase.co`, no resuelve DNS** (NXDOMAIN en
8.8.8.8, 1.1.1.1 y el resolver local). Ningún cambio de código lo arregla.

1. Supabase → el proyecto: ¿está **pausado** (los gratuitos se pausan por inactividad), borrado,
   o se recreó en la cuenta nueva con otra URL?
2. Si cambió la URL: actualizar `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
   `SUPABASE_SERVICE_ROLE_KEY` en **Vercel** (y redeploy) y en **GitHub → Secrets**. La CSP toma
   el origen de `SUPABASE_URL`, así que se ajusta sola con el redeploy.
3. Aparte, y desde el 9-sep: los cuatro workflows fallan porque el repo nuevo nació **sin
   secretos**. El script para cargarlos está en la rama `arreglo/cutover-secrets-y-paridad`
   (sin mergear). Sumarle `REVALIDATE_SECRET` antes de usarlo: ahora `scrape.yml` lo pasa.

---

## ⚠️ Antes de desplegar la ronda de paridad del 2026-09-24

Rama `paridad-2026-09-24`. Detalle en `paridad/2026-09-24.md`. Va **encima** de
`paridad-2026-09-15`, así que todo lo de la sección de abajo sigue valiendo y esto se le suma.

### 1. Una medición que bloquea el deploy

```bash
cd website && npm run chequear:destinos
```

Sólo lectura, con la base arriba. `/salir` ahora frena el destino que no es del dominio de su
tienda, y frenar significa mandar a la persona al catálogo en vez de a la tienda: **un click
que no se factura**. Si en `listings` hubiera publicaciones legítimas con otro dominio —una
tienda que migró, una con el perfil en `.com` y el catálogo en `.com.ar`— este cambio les corta
tráfico real el día que se despliegue.

El script sale con código 1 y lista las filas. Cada una es una decisión: o la tienda tiene otro
dominio legítimo, o la publicación estaba mal y el freno hizo su trabajo. **No desplegar sin
que salga limpio.** No se pudo correr en la ronda (la base no responde).

### 2. Una migración más, y va antes del deploy

El orden queda: **0012–0015 → 0017 → deploy → 0016**.

La `0017` agrega `utm_content`, `utm_term` y `click_plataforma` a `click_outs`, y el código
nuevo de `/salir` las nombra. Si la migración queda atrás, el `insert` se degrada solo al
subconjunto de la 0001 y deja el aviso en el log —o sea que se siguen registrando los clicks,
sin atribución, en vez de perderlos todos— pero eso es la red, no el plan.

Las tres columnas **no** se le abren a la tienda: el `grant` de la 0015 es columna por columna.
Verificado contra Postgres en `probar-migraciones.mjs` (48 pruebas).

### 3. El scrape se invoca distinto

`scrape.yml` pasa de `node scrapers/run.mjs` a `npm run scrape`, porque el scraper importa la
regla de dominios desde un `.ts` y necesita el stripping de tipos de Node. Si alguien lo corre
a mano, ahora es `npm run scrape -- fravega`.

### 4. Verificación después del deploy

```bash
cd website && npm run probar -- --url https://notebooks-tan.vercel.app
npm run chequear:destinos
```

Y mirar el log de `/salir` buscando `apunta fuera del dominio de su tienda`: si aparece, hay
una publicación que el scrape dejó pasar antes de este cambio.

---

## ⚠️ Antes de desplegar la ronda de paridad del 2026-09-15

Rama `paridad-2026-09-15`. Detalle en `paridad/2026-09-15.md`.

### 1. El orden importa: primero el código, después la `0016`

`0016_escrituras_publicas_por_la_api.sql` le saca a `anon` el insert directo en alertas,
avisos, solicitudes, pedidos corporativos y **clicks salientes**. El código nuevo escribe con
`service_role`. Con la migración aplicada y el código viejo:

- los formularios devuelven "No se pudo guardar";
- **los clicks salientes dejan de registrarse** (el redirect sigue andando).

Orden: `0012` → `0013` → `0014` → `0015` (las de la ronda anterior, si siguen sin correr) →
**deploy** → `0016`.

### 2. `SUPABASE_SERVICE_ROLE_KEY` en el runtime de Vercel pasa a ser crítica

Antes la usaba sólo el admin. Ahora la usan los cinco formularios, `/salir` y el rate limit. Si
falta: formularios con error genérico, clicks sin registrar, y el login del admin cerrado (el
rate limit del login falla cerrado). Verificar que esté en **Production** y en **Preview**.

### 3. Todos los que estén logueados en el admin tienen que volver a entrar

La cookie de sesión cambió de formato (ahora lleva vencimiento firmado). Las cookies viejas no
entran. Es a propósito.

### 4. Secretos y variables de GitHub Actions

| Qué | Dónde | Si falta |
|---|---|---|
| `REVALIDATE_SECRET` | Secrets (el mismo valor que en Vercel) | El scrape avisa con `::warning::` y los precios nuevos tardan ≤5 min. |
| `EMAIL_FROM` | Secrets | **El worker de emails falla** en el cron. Antes caía en `onboarding@resend.dev`, que sólo le entrega al dueño de la cuenta de Resend. |
| `RESEND_API_KEY` | Secrets | **El worker de emails falla** en el cron (antes: dry-run en verde). |
| `SITE_URL` | **Variables** (no Secrets) | Se usa `https://notebooks-tan.vercel.app`. Setearla el día que haya dominio. La usan el scrape, la verificación y el vigía. |
| `SUPABASE_LIMITE_MB` | Env del scrape, opcional | Se asume 500 MB (plan gratuito). El scrape falla al 70 %. |

### 5. Dos workflows nuevos, sin secretos

- **`vigilar.yml`** — cada hora mira `/` y `/notebooks` y abre un issue "El sitio está caído" si
  falla dos veces seguidas. Hoy lo abriría: es correcto.
- **`avisar-fallas.yml`** — un issue por workflow programado que falla; se cierra solo.

`workflow_run` sólo corre desde la rama por defecto: `avisar-fallas` empieza a andar cuando esto
esté en `main`.

### 6. Verificación después del deploy

```bash
cd website && npm run chequear -- https://notebooks-tan.vercel.app
```

Ahora también recorre el sitemap URL por URL: un tipo de página sin regla en `ESPERADO`
(`scripts/chequear-sitio.mjs`) es una falla.

---

## ⚠️ Antes de desplegar la ronda de paridad (2026-08-22)

La rama `paridad-cordoba-notebooks` trae **dos cambios que rompen si el entorno no está
preparado**. Leé esto antes de mergear; el detalle está en
`06-paridad-con-cordoba-notebooks.md`.

### 1. `ADMIN_SESSION_TOKEN` ahora es obligatoria

Antes, cuando faltaba, el código caía en un valor por defecto escrito en el repositorio. Eso
significa que **si hoy no está seteada en Vercel, el admin está protegido por un string
público** y anda igual — que es exactamente el problema. Ahora falta la variable y no entra
nadie.

**Qué hacer, en este orden:**

1. Vercel → Settings → Environment Variables → verificar que existan **las dos**:
   - `ADMIN_PASSWORD` (16 caracteres o más; el panel avisa si es corta o previsible)
   - `ADMIN_SESSION_TOKEN` (`openssl rand -hex 32`, distinta de la contraseña)
2. Recién después, desplegar.

Si desplegás primero, el admin contesta **503 "El admin no está configurado"** hasta que
las cargues. No se pierde nada, pero no vas a poder entrar.

### 2. Tres migraciones nuevas

| Migración | Qué habilita | Rompe si falta |
|---|---|---|
| `0013_rate_limits.sql` | Rate limiting de los formularios públicos | No: el limitador falla abierto y loguea. Pero el sitio queda sin techo. |
| `0014_clickout_atribucion.sql` | Atribución del click saliente | **Sí**: el `insert` en `click_outs` referencia columnas que no existen y **los clicks dejan de registrarse** (el redirect sigue andando, el registro no). |
| `0015_store_click_outs_vista.sql` | Que la tienda vea el conteo de sus clicks y no la fila cruda | **Sí, y al revés de lo que parece**: el portal ahora lee de la vista `store_click_outs`. Si la migración no está, la vista no existe y el panel de tráfico de la tienda queda vacío. |

Correr las tres en Supabase → SQL Editor antes de desplegar, **y en ese orden**: la `0015`
nombra columnas que agrega la `0014` y se apoya en la policy de la `0012`.

### 3. Variables nuevas, todas opcionales

| Variable | Si falta |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Se usa `https://www.notebooks.com.ar`. **Setearla en preview/staging**, o ese entorno se declara como producción. |
| `REVALIDATE_SECRET` | El endpoint de invalidación contesta 503 y los precios nuevos tardan hasta 5 min en verse. Nada se rompe. |
| `CSP_ENFORCE` | La CSP sale en report-only: informa y no bloquea. **Dejarla así unas semanas** y recién después poner `true`. |

Todas están documentadas en `website/.env.example`.

### 4. Verificación después del deploy

```bash
cd website && npm run chequear -- https://notebooks-tan.vercel.app
```

Chequea cabeceras, CSP, indexación, las 15 rutas públicas, el sitemap, `llms.txt`, los datos
estructurados y que el admin y el portal sigan cerrados. Sale con código 1 si algo falla.

---

## 0. 🔴 Rotar la `service_role` (seguridad, primero)

Se expuso en una captura de pantalla compartida en el chat. Da acceso total a la base.

1. Supabase → **Project Settings → API Keys** → regenerar `service_role`.
2. Actualizarla donde se use:
   - **GitHub** → repo → Settings → Secrets and variables → Actions → `SUPABASE_SERVICE_ROLE_KEY`
   - **Vercel** → Project → Settings → Environment Variables → `SUPABASE_SERVICE_ROLE_KEY` (→ **Redeploy**)
   - Tu `website/.env.local` si la tenés ahí.

> ⚠️ Ojo: la key que empieza con `sb_publishable_` es la **anon/pública** (no sirve para escribir).
> La `service_role` es la secreta (`sb_secret_...` o un JWT largo `eyJ...`).

---

## 1. Migraciones que faltan (Supabase → SQL Editor)

Estado verificado hoy:

| Migración | Qué habilita | Estado |
|---|---|---|
| `0004_blog.sql` | Blog | ✅ corrida |
| `0005_brands.sql` | Landings de marca | ✅ corrida |
| `0006_store_profile.sql` | Reputación de tiendas | ✅ corrida |
| **`0007_model_notify.sql`** | **Avisos "te aviso cuando esté disponible"** | ❌ **FALTA** |
| `0008_users.sql` | Login / favoritos | ✅ corrida |
| `0009_bulk.sql` | Venta corporativa | ✅ corrida |
| `0010_store_portal.sql` | Portal de tiendas | ✅ corrida |
| **`0011_store_tiers.sql`** | **Destacados + tiers + CPC** | ❌ **FALTA** |
| `0012_store_clicks_read.sql` | Panel de tráfico de la tienda | ⚠️ verificar |
| **`0013_rate_limits.sql`** | **Rate limiting de los formularios** | ❌ **nueva (22-ago)** |
| **`0014_clickout_atribucion.sql`** | **Atribución del click saliente** | ❌ **nueva (22-ago)** |
| **`0015_store_click_outs_vista.sql`** | **La tienda ve el conteo, no la fila cruda** | ❌ **nueva (24-ago)** |

**Qué hacer:** abrir cada archivo de `website/supabase/migrations/` y pegar su contenido en el
**SQL Editor** de Supabase → Run. Correr **`0007`** y **`0011`**.

Para `0012` (no se puede verificar desde afuera): si al correrlo dice
`policy "members read own clicks" ... already exists`, ya estaba — ignoralo.

⚠️ **`0012` dejó de ser opcional.** La `0015` le saca a `authenticated` el `select` sobre
`click_outs`, así que las filas del panel de tráfico pasan a depender enteramente de esa
policy. Si `0012` no está y `0015` sí, cada tienda ve **cero clicks** y no hay ningún error
que lo diga. Si el panel queda en cero después de desplegar, es esto.

⚠️ **Si la `0015` falla en la línea `with (security_invoker = on)`**, la base es anterior a
PostgreSQL 15. **No saques esa opción para que pase**: sin ella la vista corre con los
permisos del dueño, saltea la RLS y cada tienda ve los clicks de todas. Dejá la migración sin
aplicar y avisá.

> ⚠️ Las migraciones con `create policy` **no** se pueden correr dos veces. Si tira
> "already exists", ya estaba aplicada: seguí de largo.

---

## 2. Auth — prende login, favoritos y el portal de tiendas ❌ falta

Verificado: el sitio **no** muestra "Ingresar" ⇒ Auth todavía no está configurado.
Esto tiene 5 features construidas esperando: login, favoritos, `/cuenta`, portal de tiendas,
inteligencia de precios y panel de tráfico.

**a) Supabase → Authentication → Providers**
- **Email**: activado (ya viene). Para probar rápido podés apagar "Confirm email".
- **Google** (opcional): necesitás un OAuth Client ID en Google Cloud Console
  (tipo "Web application"), con este redirect URI:
  ```
  https://itisgcfxvryxyvolxjvs.supabase.co/auth/v1/callback
  ```
  Después pegá Client ID + Secret en el provider Google de Supabase.

**b) Supabase → Authentication → URL Configuration**
- **Site URL**: `https://notebooks-tan.vercel.app`
- **Redirect URLs** (agregar las dos):
  - `https://notebooks-tan.vercel.app/ingresar`
  - `http://localhost:3000/ingresar`

**c) Vercel → Settings → Environment Variables** (y tu `.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://itisgcfxvryxyvolxjvs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<la anon/publishable key>
```
**d) Redeploy** en Vercel (las `NEXT_PUBLIC_*` se hornean en el build; sin redeploy no toman).

✅ **Cómo saber que salió bien:** aparece el botón **"Ingresar"** en el header.

---

## 3. Resend — para que salgan los emails

Hoy el worker corre en **dry-run**: calcula y loguea, pero no envía (y no marca nada como
notificado, así que no se pierde nada).

1. Crear cuenta en [resend.com](https://resend.com) y **verificar un dominio** de envío.
2. **GitHub** → repo → Settings → Secrets and variables → Actions → New secret:
   - `RESEND_API_KEY` = tu API key
   - `EMAIL_FROM` = `Notebooks.com.ar <avisos@tudominio.com>`
3. Probar: **Actions → "Worker de emails" → Run workflow**.

> Requiere la migración `0007` del paso 1 (si no, los avisos de disponibilidad fallan).

---

## 4. Cargar datos — las 3 tiendas nuevas (+126 publicaciones)

Ya están programadas Gezatek (10), Mexx (41) y Venex (75). Hoy hay 73 listings; esto los triplica.

```bash
cd website
export SUPABASE_URL=https://itisgcfxvryxyvolxjvs.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=<la service_role NUEVA>

npm run clean:seed                    # borra las 30 publicaciones ficticias del seed
node scrapers/run.mjs                 # trae las 3 tiendas nuevas
node scrapers/bulk-review.mjs         # DRY-RUN: mirá qué modelos agruparía
node scrapers/bulk-review.mjs --apply # crea los modelos canónicos y confirma
```

**Por qué el `bulk-review`:** de las 126 publicaciones nuevas, ~125 caen en cola de revisión.
No es un error: el catálogo tiene 22 modelos canónicos y estas tiendas venden decenas que
todavía no existen como modelo. `bulk-review` los crea en bloque.

Revisá el dry-run antes del `--apply`: si agrupa cosas raras, avisame y ajustamos el matching.

---

## 5. Opcional — "encender" features que están vacías

Todas funcionan pero no tienen datos que mostrar:

| Feature | Cómo activarla |
|---|---|
| ⭐ Estrellas de tiendas (0 hoy) | `/admin/solicitudes` aprobando una tienda con rating, o el `UPDATE` de ejemplo comentado en `0006_store_profile.sql` |
| 💰 Destacados "Patrocinado" + CPC | `/admin/monetizacion`: setear CPC global y marcar una tienda como `featured` (requiere `0011`) |
| 🏬 Portal de tiendas | `/admin/portal`: vincular una tienda a un usuario ya registrado (requiere Auth del paso 2) |
| 📝 Blog | ✅ ya tiene 5 reseñas |
| 🔔 Ficha "próximamente" | Crear en `/admin` un modelo sin publicaciones (requiere `0007`) |

**Admin:** si no podés entrar, revisá que estén **las dos** variables (`ADMIN_PASSWORD` y
`ADMIN_SESSION_TOKEN`) en Vercel → Environment Variables, y redeploy. Si falta alguna, el
login contesta 503 con el texto "El admin no está configurado en este entorno" — eso es un
problema de configuración, no de contraseña. Login en `/admin/login`.

---

## 6. Decisiones de negocio pendientes (no bloquean nada técnico)

- Valor del **CPC** por click-out y precio del **destacado**.
- Precio / gating de los **leads corporativos** (RFQ).

Ver `05-monetizacion-dos-puntas.md` para el benchmark y la recomendación.
