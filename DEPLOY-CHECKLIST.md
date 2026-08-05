# Checklist de setup — Notebooks.com.ar

Estado verificado contra producción el **2026-08-05**. Tachá a medida que avances.
Todo esto son pasos **del dueño del proyecto** (requieren la `service_role` o accesos que el
asistente no tiene). El código ya está deployado: lo que falta es *encender* features construidas.

---

## 1. 🔐 Seguridad (hacer primero)

- [ ] **Rotar la `service_role` key** — quedó expuesta en una captura de pantalla (2026-07-31).
  1. Supabase → Project Settings → **API Keys** → regenerar la `service_role` / secret.
  2. Actualizarla en: **Vercel** (env vars), **GitHub → Settings → Secrets → Actions**
     (`SUPABASE_SERVICE_ROLE_KEY`), y tu `.env.local` / terminal.
  3. Redeploy en Vercel.
  > ⚠️ Ojo: el token de baja de alertas (`/baja`) se firma con esta key (HMAC). Al rotarla, los
  > links de baja de emails ya enviados dejan de validar. Sin impacto hoy (aún no se enviaron mails).

---

## 2. 🗄️ Migraciones pendientes (Supabase → SQL Editor)

Verificado: `0004`, `0005`, `0006`, `0008`, `0009`, `0010` ✅ ya corridas.

- [ ] **`0007_model_notify.sql`** ❌ falta → tabla `model_notify`.
      Sin esto: el form "avisame cuando esté disponible" falla y el worker de emails no puede
      procesar avisos de disponibilidad.
- [ ] **`0011_store_tiers.sql`** ❌ falta → `tier`/`featured`/`featured_until`/`cpc_ars` en `stores`
      + tabla `app_settings`. Sin esto: `/admin/monetizacion` no carga y no hay destacados.
- [ ] **`0012_store_clicks_read.sql`** ⚠️ verificar (no se puede detectar desde afuera; es una
      policy). Sin esto: el panel de tráfico del portal no muestra clics.

> ⚠️ Las migraciones con `create policy` **no son re-ejecutables** (tiran "policy already exists").
> Corré cada archivo **una sola vez**. Si dudás de `0012`, probá y si tira ese error, ya estaba.

---

## 3. 🔑 Supabase Auth (desbloquea 6 features ya construidas)

Verificado: **NO configurado** — `/ingresar` muestra "el login todavía no está disponible".

Desbloquea: login, **favoritos**, `/cuenta` (intereses), **portal de tiendas**, **inteligencia de
precios** y **panel de tráfico**.

- [ ] **Env vars** en Vercel *y* en `.env.local` (son los mismos valores que ya usás, con prefijo público):
      ```
      NEXT_PUBLIC_SUPABASE_URL=https://itisgcfxvryxyvolxjvs.supabase.co
      NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu anon/publishable key>
      ```
- [ ] **Redeploy en Vercel** (las `NEXT_PUBLIC_*` se hornean en build; sin redeploy sigue apagado).
- [ ] Supabase → Authentication → **Providers → Email** activado (ojo con "Confirm email": si está
      ON, el registro pide confirmar por mail; para probar rápido se puede apagar temporalmente).
- [ ] Supabase → Authentication → **URL Configuration**:
      - Site URL: `https://notebooks-tan.vercel.app` (o el dominio final)
      - Redirect URLs: `https://notebooks-tan.vercel.app/ingresar` y `http://localhost:3000/ingresar`
- [ ] *(Opcional)* **Google OAuth**: crear OAuth Client ID en Google Cloud con redirect
      `https://itisgcfxvryxyvolxjvs.supabase.co/auth/v1/callback`, y pegar client id/secret en
      Supabase → Providers → Google. Sin esto, el botón de Google falla pero el login por email anda.

---

## 4. ✉️ Resend (worker de emails)

Hoy el worker corre en **dry-run**: loguea lo que enviaría y no marca nada como notificado.

- [ ] Crear cuenta en **Resend** + verificar el dominio de envío.
- [ ] GitHub → Settings → Secrets → Actions: agregar **`RESEND_API_KEY`** y **`EMAIL_FROM`**
      (ej. `Notebooks.com.ar <avisos@notebooks.com.ar>`).
- [ ] Probar: **Actions → "Worker de emails" → Run workflow**. Sin la key igual corre y muestra el
      dry-run (útil para ver qué mandaría).

---

## 5. 🧹 Datos (el corazón del producto)

- [ ] **Limpiar el seed ficticio**: hay **30 publicaciones inventadas** (`l-001`…`l-030`) todavía
      visibles, que ensucian precios e historial:
      ```bash
      cd website && SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run clean:seed
      ```
- [ ] **Historial real**: el `price_history` actual mezcla seed inventado con datos reales.
      Se sanea acumulando corridas del cron diario (ya activo). *Cada día sin recolectar es
      historial perdido* → verificá que el workflow "Scrape diario" esté corriendo verde.
- [ ] **Part numbers**: solo **10 de 22** modelos los tienen. Cargarlos mejora el auto-match.
- [ ] **Más tiendas en el scraper**: hoy solo se scrapean **5 de las 12** tiendas de la DB
      (`cordobanotebooks`, `maxtecno`, `fravega`, `cetrogar`, `naldo`).
      Faltan: `fullh4rd`, `venex`, `maximus`, `musimundo`, `gezatek`, `mexx`, `backup`.

---

## 6. 🎛️ Cargar datos para "encender" features (desde `/admin`)

Estas features están construidas pero **no se ven porque no hay datos**:

- [ ] **Estrellas de reputación**: 0 tiendas tienen `google_rating`. Cargarle a una:
      ```sql
      update stores set google_rating = 4.6, google_reviews_count = 1234,
        google_maps_url = 'https://maps.google.com/...', rating_updated_at = now()
      where id = 'cordobanotebooks';
      ```
      (O aprobar una solicitud de tienda que traiga rating — se copia solo.)
- [ ] **Destacados / "Patrocinado"**: en `/admin/monetizacion`, setear el **CPC global**, marcar una
      tienda como `featured` con fecha → aparece el módulo en `/tiendas` y `/notebooks`. *(Requiere `0011`.)*
- [ ] **Portal de tiendas**: en `/admin/portal`, vincular una tienda a un usuario (el usuario debe
      registrarse antes en `/ingresar`) → habilita `/portal` con inteligencia de precios y tráfico.
- [ ] **Modelo "próximamente"**: crear un modelo sin publicaciones desde `/admin/nuevo-modelo` para
      ver la ficha en modo aviso + captura de email. *(Requiere `0007`.)*
- [ ] **Admin**: si no podés entrar, revisar `ADMIN_PASSWORD` en Vercel y redeployar.

---

## 7. 💵 Decisiones de negocio (no bloquean código)

- [ ] Valor del **CPC** por click-out (global y/o por tienda).
- [ ] Precio del **destacado** (fee mensual fijo, CPC más alto, o ambos).
- [ ] Precio y **gating de leads RFQ** (¿solo tiers pagos cotizan? ¿pay-per-lead?).

---

## Qué mirar cuando esté todo arriba

Home (voz + autocomplete + USD + vistos recientemente) · `/notebooks` (filtros nuevos + slot
Patrocinado) · ficha (chips→filtros, compartir, USD, freshness, ♥) · `/marcas` · `/tiendas/[slug]`
(estrellas) · `/blog` (5 reseñas ✅) · `/corporativo` · login → `/favoritos` → `/cuenta` ·
`/portal` (inteligencia de precios + tráfico + RFQ) · `/admin/monetizacion`.
