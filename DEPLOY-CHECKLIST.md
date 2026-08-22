# Checklist de setup — Notebooks.com.ar

Estado **verificado contra producción el 2026-08-06**. Hacé los pasos en orden.
Todo esto requiere la `service_role` o acceso a dashboards → lo hacés vos, no el asistente.

- Sitio: https://notebooks-tan.vercel.app · Supabase ref: `itisgcfxvryxyvolxjvs`
- Deploy: ✅ al día · Blog: ✅ 5 reseñas publicadas · Listings: 73

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

### 2. Dos migraciones nuevas

| Migración | Qué habilita | Rompe si falta |
|---|---|---|
| `0013_rate_limits.sql` | Rate limiting de los formularios públicos | No: el limitador falla abierto y loguea. Pero el sitio queda sin techo. |
| `0014_clickout_atribucion.sql` | Atribución del click saliente | **Sí**: el `insert` en `click_outs` referencia columnas que no existen y **los clicks dejan de registrarse** (el redirect sigue andando, el registro no). |

Correr las dos en Supabase → SQL Editor antes de desplegar.

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

**Qué hacer:** abrir cada archivo de `website/supabase/migrations/` y pegar su contenido en el
**SQL Editor** de Supabase → Run. Correr **`0007`** y **`0011`**.

Para `0012` (no se puede verificar desde afuera): si al correrlo dice
`policy "members read own clicks" ... already exists`, ya estaba — ignoralo.

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
