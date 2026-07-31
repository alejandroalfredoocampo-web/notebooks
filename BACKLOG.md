# Backlog — Notebooks.com.ar

Estado del MVP y pendientes, ordenado por prioridad. Última actualización: 2026-07-28.

## 🧭 Nuevas secciones propuestas (especificadas en `specs/`)

Nueve funcionalidades nuevas con spec buildable cada una (modelo de datos, rutas, RLS, SEO y criterios
de aceptación) en `specs/` — ver [`specs/00-indice.md`](specs/00-indice.md). Migraciones sugeridas
`0004`…`0010`. Priorización en fases:

- **Fase 1 — quick wins de front (sin DB):** ✅ implementada (2026-07-28)
  - [x] `specs/03` Búsqueda por **voz** en la home (Web Speech API `es-AR` + página `/privacidad`).
        `HeroSearch.tsx` + `app/privacidad/page.tsx` + link en el footer. Fallback a escribir si no hay soporte.
  - [x] `specs/05` **Chips de specs como filtros** (chip → `/notebooks?cpu=...`). `specFilters.ts`
        (buckets únicos), ejes nuevos `storage` y `screen` en `filterModels`/`Filters.tsx` (+ opción Intel N),
        chips linkificados en la ficha (`SpecChips linkify`; en cards quedan texto para no anidar links).
  - [x] `specs/09` **Compartir en redes** (`ShareButton.tsx`: Web Share API nativa + fallback
        WhatsApp/Telegram/X/Facebook/copiar) + Open Graph/Twitter Card en la ficha.
        Pendiente futuro: OG en blog/marcas (specs 01/02) y OG dinámica con precio.
- **Fase 2 — confianza y SEO:** ✅ implementada (2026-07-28). ⚠️ **Falta correr en Supabase** las
  migraciones `0004_blog.sql`, `0005_brands.sql` y `0006_store_profile.sql` (SQL Editor, con service_role).
  - [x] `specs/04` **Reputación + perfil de tiendas**: `StoreRating.tsx`, estrellas en la ficha (mobile+desktop),
        perfil `/tiendas/[slug]` (`EntityHero`), nombres de tienda linkeados, `reviewApplication` copia
        `google_*`/redes/pagos a `stores` al aprobar. Migración `0006`. (Las estrellas aparecen al correr 0006 +
        cargar rating; las tiendas del seed no tienen aún.)
  - [x] `specs/02` **Landings por marca**: `/marcas` + `/marcas/[brand]` (`EntityHero` + `ModelCard`),
        `getBrandInfo` con fallback si no existe la tabla `brands`, chips de home/breadcrumb → `/marcas`,
        nav (Header/MobileMenu/Footer) + sitemap. Migración `0005` (opcional; hay fallback).
  - [x] `specs/01` **Blog + CMS básico**: `/blog` + `/blog/[slug]` (Markdown sanitizado con `react-markdown`
        + `rehype-sanitize` + typography, OG/JSON-LD, "modelos mencionados"), RSS `/blog/rss.xml`, CMS en
        `/admin/blog` (+ editor con preview y selector de modelos), API `/api/admin/post`, sitemap. Migración `0004`.
        Nota: el CMS necesita `service_role` (como todo el admin) → no se prueba en local sin esa key.
- **Fase 3 — retención y demanda:** ✅ implementada (2026-07-28). ⚠️ **Falta correr** migraciones
  `0007_model_notify.sql` y `0008_users.sql` en Supabase, + config de Auth (ver abajo).
  - [x] `specs/06` **Modelos sin publicaciones**: modelos con 0 ofertas excluidos del home/listado
        (`filterModels`), ficha en modo "próximamente" con `NotifyAvailabilityForm` → `/api/notificar`
        (insert en `model_notify`, honeypot). Migración `0007`. Pendiente: worker de emails (compartido)
        y verificación visual (crear un modelo sin ofertas con service_role).
  - [x] `specs/07` **Login + favoritos/intereses**: Supabase Auth **client-side** (sin tocar middleware).
        `/ingresar` (email+contraseña+Google), `/favoritos`, `/cuenta` (intereses), botón ♥ en la ficha,
        `AuthNav` en header/mobile. Migración `0008`. Todo **degrada con gracia** si faltan las envs
        `NEXT_PUBLIC_*` (verificado: sin config el sitio queda igual que antes, sin errores).
        **Config del usuario** (en `0008_users.sql`): habilitar Email+Google en Supabase Auth, setear
        Redirect URLs, y agregar `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel/.env.local.
        Verificación end-to-end del login: cuando el usuario configure Auth.
        Nota: SSR de sesión (mostrar usuario en server components) y recomendaciones por mail = próxima iteración.
- **Fase 4 — nuevo modelo de negocio:** ✅ Fase A implementada (2026-07-29). ⚠️ **Falta correr**
  `0009_bulk.sql` en Supabase.
  - [x] `specs/08` **Venta corporativa / RFQ (Fase A)**: landing `/corporativo` (hero + casos +
        estimador de compra por volumen + `BulkRequestForm`) → `/api/corporativo` (insert público en
        `bulk_requests`, honeypot). Bandeja `/admin/corporativo` (lista + cambio de estado). Migración `0009`.
        Verificado: landing + estimador ($/u × cantidad) + build. Submit y bandeja necesitan correr 0009.
  - [x] `specs/08` **Fase B — portal de tiendas** (2026-07-29): auth de tiendas = Supabase Auth +
        `store_members` (migración `0010`). Portal `/portal` (login → ver RFQ abiertas → cotizar en
        `bulk_quotes`), admin `/admin/portal` para vincular tienda↔usuario (busca el user por email vía
        Auth admin API). RLS: miembros leen RFQ open/quoting y escriben/leen sus propias cotizaciones.
        Degrada con gracia sin envs `NEXT_PUBLIC_*`. Verificación end-to-end: cuando el usuario configure Auth + corra 0010.
        Pendiente/refinamientos: **lado solicitante** (que la empresa compare cotizaciones y acepte una — hoy
        lo hace el admin), y ofuscar el contacto del solicitante a las tiendas (vista con columnas enmascaradas).
  - [ ] **Worker de emails** (compartido): al crear RFQ avisar al admin; en Fase B a las tiendas / al solicitante.
        Sigue pendiente junto con alertas de precio y avisos de disponibilidad.

## 🧹 Data / naming
- [x] Nombres de modelos con la marca repetida ("Acer Acer Al15…"): arreglado **a nivel display** con
      `cleanModelName` en los mappers (`data.ts`/`adminData.ts`). No toca la DB. Si se quiere limpiar en
      origen, un `UPDATE`/`bulk-review` sobre `models.name` (con service_role).

## 🔬 Investigación: monetización de las dos puntas (comprador + tienda)

- [x] **Investigación completa de monetización** (2026-07-30) → **[05-monetizacion-dos-puntas.md](05-monetizacion-dos-puntas.md)**
      (benchmark de ~13 portales del mundo + recomendación priorizada por fases). Resumen: paga la tienda,
      no el comprador; base afiliación/CPC → destacados pagos rotulados → SaaS de precios + leads RFQ →
      retail media con volumen; regla de oro: ranking siempre por precio, lo pago en slot "Patrocinado" aparte.
      El brief original (preguntas, palancas y portales a estudiar) queda abajo como referencia de alcance.
      Hoy el único modelo es afiliación por click-out (CPC/CPA); esto explora qué más se puede sumar sin
      romper la confianza ("orden siempre por precio"). Entregable: un doc con benchmark + recomendación
      priorizada (qué probar primero, con qué métrica de éxito).

  **Preguntas a responder**
  - ¿Qué monetiza cada punta y cuánto aporta cada palanca (mix de ingresos)?
  - ¿Qué se puede cobrar **sin** sesgar el ranking ni perder la percepción de neutralidad?
  - ¿Qué requiere volumen/tráfico previo (ads, afiliación) vs. qué se puede vender ya (destacados a tiendas)?

  **Palancas a evaluar (comprador)**
  - Afiliación / CPC / CPA (lo actual) — profundizar: redes (Awin, Impact), programas directos.
  - **Suscripción premium del comprador**: alertas ilimitadas, historial completo, avisos anticipados,
    sin ads. ¿Hay disposición a pagar? (probablemente bajo en AR — validar).
  - **Ads / display** (Google AdSense, native ads) y **contenido patrocinado** en el blog.
  - Datos agregados / insights de precios (informes) — cuidando privacidad.

  **Palancas a evaluar (tiendas / vendedores)**
  - **Listing pago / tiers de tienda**: gratis (indexación básica) vs. **destacado/"Verificada+"**,
    prioridad de ubicación *marcada como patrocinada*, badge, perfil enriquecido, analytics de su catálogo.
  - **Suscripción SaaS para tiendas**: dashboard de competencia (dónde están caras/baratas vs. el mercado),
    leads corporativos (RFQ del portal), alertas de precio de la competencia.
  - **CPL / comisión por RFQ corporativo** cerrado (encaja con `specs/08`).
  - **Onboarding/setup pago** o fee por integración del catálogo.

  **Benchmark — portales a estudiar (cómo monetizan cada uno)**
  - Comparadores de precios globales: **Google Shopping, Idealo (DE), PriceRunner, Kelkoo, Shopzilla,
    PriceGrabber, Trivago (modelo CPC de hoteles como analogía de subasta de posiciones)**.
  - Regionales / LATAM: **Buscapé, Zoom (BR), Mercado Libre (ads + tiers de vendedor), Precialo,
    Preciolandia**.
  - Verticales tech: **PCPartPicker (afiliación + posible premium), Versus, Camelcamelcamel (histórico
    de precios, afiliación Amazon)**.
  - Marketplaces bilaterales con tiers: **Idealo Business, Trustpilot (SaaS para comercios),
    Capterra/G2 (leads pagos)** como referencia del lado vendedor.

  **Ejes de comparación del benchmark**
  - Modelo(s) de ingreso, quién paga, gratis-vs-pago, cómo señalan lo patrocinado, estructura de tiers,
    pricing aproximado, y qué tan dependiente es del volumen de tráfico.

  **Notas de contexto AR**
  - Baja propensión a suscripciones pagas del consumidor → probablemente el peso caiga en la punta tienda.
  - Prioridad: no comprometer la neutralidad del ranking (diferencial del producto).
  - Cruzar con lo ya construido: reputación/perfil de tiendas (`specs/04`), RFQ corporativo (`specs/08`),
    y la señal de demanda de `model_notify` (`specs/06`) como posible producto de datos para tiendas.

> Nota: el **worker de emails** pendiente (alertas de precio) queda compartido por specs 06/07/08.

## 🧩 Completitud de producto (combo 2026-07-31, sin backend)

⚠️ **Falta correr** `0012_store_clicks_read.sql` (solo para el panel de tráfico de tienda).
- [x] **Precio en USD (dólar blue)**: `UsdHint` + `/api/usd` (dolarapi, cache 1h, fallback graceful) en
      cards y ficha. Verificado (blue ~$1560 → "≈ US$…").
- [x] **Buscador con autocomplete**: `/api/search/suggest` + dropdown en `HeroSearch` (marca + modelos con
      precio). Verificado.
- [x] **Filtros nuevos**: sistema operativo, condición, "solo con stock", portabilidad (≤1,5 kg) en
      `filterModels`/`Filters.tsx`. Verificado (`os=macos` → 2).
- [x] **Vistos recientemente**: `TrackView` (localStorage en la ficha) + `RecentlyViewed` (strip en home). Verificado.
- [x] **Panel de tráfico de la tienda**: sección en `/portal` con clics recibidos (total, 30d, top modelos),
      leyendo `click_outs` con RLS por `store_members` (migración `0012`). Verificar logueado en prod.
- [x] **Freshness/stock**: chip "precio desactualizado (hace N días)" en ofertas (>7d) + helper `daysAgo`.
      Verificado (el seed marca todo como viejo; en prod lo mantiene fresco el scraper diario).
- [ ] Pendientes de la lista que quedaron para más adelante (necesitan datos/UGC/backend): reseñas de
      usuarios, "mis alertas" gestionables (requiere atar alertas al usuario), reportar dato incorrecto,
      galería de imágenes, agrupar variantes/configuraciones, asistente de recomendación, autogestión de
      perfil/claim self-serve de tiendas.

## 💰 Monetización

- [x] **Fase 1 — destacados + tier de tienda + CPC** (2026-07-31, `specs/10`). ⚠️ **Falta correr**
      `0011_store_tiers.sql`. Migración: `tier`/`featured`/`featured_until`/`cpc_ars` en `stores`
      (+ backfill de `verified`→`tier`) y `app_settings` (CPC global). UI: `StoreTierBadge` (free/Verificada/
      Verificada+), módulo **"Tiendas destacadas · Patrocinado"** (`SponsoredStores`) en `/tiendas` y slot
      en `/notebooks` — **separado y rotulado, sin tocar el orden por precio**. Admin `/admin/monetizacion`:
      editar tier/featured/CPC por tienda + CPC global + reporte de facturación (click-outs × CPC, 30d, offline).
      `cpc_ars` no se expone al público. Verificado en local: degrada bien sin migración (badges por fallback,
      módulo oculto sin destacadas, sin errores). Falta verificar el path "featured" en prod (0011 + marcar una tienda).
      **[DECISIÓN de negocio pendiente]**: valor del CPC y precio del destacado.
- [x] **Fase 2** (moat, 2026-07-31, `specs/11`): **SaaS de inteligencia de precios** en el portal de
      tiendas — para cada modelo que vende, su precio vs. mejor/promedio del mercado, rank y gap %, con
      KPIs (modelos, wins, gap promedio). Cálculo `getStoreInsights` sobre datos públicos → `/api/portal/insights`
      → sección en `/portal`. **Verificado**: la API devuelve el reporte correcto (ej. Córdoba Notebooks:
      5 modelos, gana en 3, gap 1%). Sin migración (data derivada). **Parte B (leads RFQ)**: medición de
      cotizaciones por tienda en `/admin/monetizacion` (para facturar offline). Pendiente/decisión: **gating
      del lead por tier** y precio del lead; verificación del dashboard logueado en prod (Auth + membership);
      refinamiento de seguridad: validar el token del miembro en `/api/portal/insights` (hoy abierto sobre data pública).
- [ ] **Fase 3/4**: suscripción "pro" del comprador (tipo Keepa) y retail media/ads — dependientes de escala.

## ✅ Hecho

- Sitio Next.js 14 (home, listado con filtros SSR, ficha, ofertas, tiendas, `/salir`).
- Recomendación de uso por specs en la ficha (gaming/arquitectura, productividad, oficina…).
- **Imágenes reales** en cards y ficha (seed curado desde VTEX) con fallback a emoji.
- Pipeline de ingesta con **adaptadores genéricos** WooCommerce y VTEX + `sources.mjs`.
- **Categorías VTEX afinadas** (Frávega, Cetrogar, Naldo traen solo notebooks, sin accesorios).
- **Matching** publicación→modelo (part-number + huella de specs + nombre de línea) con cola de revisión.
- **Snapshot de historial** y **feed de imágenes** por modelo en cada corrida.
- **Consola de admin** (`/admin`, login con contraseña): revisión de matcheos (confirmar/rechazar),
  explorador de publicaciones y alta de publicaciones propias. Persiste a
  `data/match-decisions.json` y `data/manual-listings.json`.
- **Salida del pipeline conectada al front**: `npm run publish:site` (o botón "Publicar al sitio"
  en el admin) hornea matcheos confirmados + publicaciones propias en un overlay
  (`data/generated-*.json`) que el sitio importa estáticamente. Las ofertas nuevas aparecen en
  fichas/listado y recalculan mejor precio, conteos e historial. No toca el seed curado.
- Build de **Cloudflare Pages** con `@cloudflare/next-on-pages` (zip listo; falta subir).

## ⚠️ Deuda a resolver antes del deploy a Cloudflare

- La **consola de admin usa runtime Node** (lee/escribe archivos): rompe `npm run pages:build`
  (el edge exige runtime edge). Antes de deployar, elegir uno:
  1. **No deployar admin al edge** (tratarla como herramienta interna local), o
  2. Portar su persistencia a **D1/KV + auth real** y pasar las rutas a edge.
- Setear `ADMIN_PASSWORD` y `ADMIN_SESSION_TOKEN` en el entorno (hoy usa defaults de dev).
- Regenerar el zip (`npm run pages:build`): el actual no incluye imágenes ni pipeline nuevo.

## 🔴 Datos / pipeline (corazón del producto — hoy el sitio corre sobre seed demo)

- [ ] Cargar **part numbers reales** en los modelos canónicos → dispara auto-match de alta confianza.
- [ ] **Updates en vivo sin rebuild**: hoy publicar regenera el overlay pero el edge necesita
      rebuild/redeploy para reflejarlo (en dev se ve al instante). Se resuelve con la migración a DB
      (leer datos en runtime vía D1/API en vez de import estático).
- [x] Conectar la salida del pipeline (matcheos confirmados + publicaciones propias) al sitio.
- [x] Tiendas VTEX con categoría afinada: Frávega, Cetrogar, Naldo. Woo: Córdoba Notebooks, Max Tecno.
- [ ] Segunda ola (HTML/JSON-LD o headless): Maximus, Venex, Musimundo, Gezatek, Mexx, Backup.
- [ ] Tiendas detrás de WAF (Compragamer, Garbarino, Megatone, Invid…): definir política de user-agent / acuerdo.
- [ ] **UI de revisión** para la cola de matching (confirmar/rechazar candidatos < 0.8).
- [ ] Migrar seed JSON → **PostgreSQL**; conectar la salida del pipeline al sitio.
- [ ] **Cron diario** de scraping (GitHub Actions o Cloudflare Cron) + reintentos y alertas de fallo.

## 🟡 Producto

### Hecho recién
- [x] **Crecer el catálogo desde lo scrapeado**: botón "+ Crear modelo" en la revisión crea un modelo
      canónico (prefilleado desde la publicación) y lo matchea automáticamente; overlay
      `generated-models.json`. Ya no quedan notebooks huérfanas.
- [x] **Cuotas como dimensión de comparación**: orden "Más cuotas", filtro "Cuotas sin interés",
      badge de financiación en card y ficha (detección de sin interés = total en cuotas ≤ contado).

### Secuenciado con el deploy real (Supabase + Render)
- [~] **Alertas de precio**: la **captura** ya persiste en `price_alerts` (form → `/api/alertas`).
      Falta el **worker** (cron) que compare precios y **envíe** el email. Es EL loop de retención.
- [ ] **Integrar Mercado Libre**: revierte la decisión de fase 1 (ML estaba afuera). Es la mayor
      brecha de cobertura del país. Ojo: la API de ML hoy suele exigir OAuth; evaluar token de
      aplicación + programa de afiliados de ML. Encaja al levantar el backend real.

### Moat y confianza (el diferencial real)
- [ ] **Historial de precios REAL**: hoy es seed inventado. El "9% abajo del promedio 90d" y el
      mínimo histórico solo valen cuando se acumulan datos reales a diario → prioriza el **cron**
      (ver sección Datos). El activo es irrecuperable: cada día sin recolectar es historial perdido.
- [ ] **Freshness / staleness**: avisar o esconder ofertas que llevan días sin actualizarse (hoy una
      publicación vieja se muestra como vigente).
- [ ] **Instrumentación / analítica**: vistas de ficha, CTR de `/salir`, conversión por modelo/tienda.
      Sin esto no se sabe qué funciona ni se le prueba valor a los afiliados. (Amplitude/Pendo/GA
      requieren conectar credenciales.)

### 5 features de valor (hechas)
- [x] **Termómetro de precio** en la ficha: veredicto desde el historial ("mínimo histórico" /
      "buen momento" / "caro") + barra mín·prom·máx. `priceInsight.ts` + `PriceThermometer`.
- [x] **Comparador lado a lado** (`/comparar`): hasta 3 modelos, resalta la más barata.
- [x] **Búsqueda por necesidad**: interpreta presupuesto/uso/marca en lenguaje natural (`parseQuery.ts`)
      y muestra "qué entendió".
- [x] **Radar de financiación**: costo real en cuotas por oferta (total + recargo %) + "★ mejor en cuotas".
- [~] **Confianza de tiendas**: insignia editorial "Verificada" (falta correr `migrations/0002` en la DB)
      + señal derivada "cuotas sin interés" en `/tiendas` (ya activa).

### Hecho
- [x] **Formulario "sumá tu tienda"** en `/tiendas` (datos comerciales, contacto, ubicación, redes,
      reputación Google, catálogo/plataforma) → `store_applications` (migration 0003). Bandeja en
      `/admin/solicitudes`: aprobar (crea la tienda verificada) / rechazar.

### Migraciones a correr en Supabase (SQL Editor)
- [x] `0001_init.sql` (ya corrida)
- [ ] `0002_store_trust.sql` — agrega el flag `verified` (feature #5)
- [ ] `0003_store_applications.sql` — tabla de solicitudes de tiendas

### Próximas
- [ ] **Búsqueda por voz en la home**: botón de micrófono que dicta a la búsqueda por necesidad
      (extiende la feature #3 — "para gaming hasta 3 millones" hablado). Implica:
      - **Reconocimiento de voz**: Web Speech API (`SpeechRecognition`, locale `es-AR`) → transcribe
        en el navegador y alimenta el buscador existente. Fallback: ocultar el botón si el navegador
        no lo soporta (Safari/Firefox tienen soporte parcial).
      - **Permisos de micrófono**: pedir acceso con manejo claro del prompt y del caso "denegado"
        (mensaje + fallback a escribir). No re-pedir en loop.
      - **Política de privacidad**: página `/privacidad` + link en el footer, aclarando qué se captura,
        que el audio puede procesarse en servidores del navegador (ej. Google en Chrome), que no se
        almacena, y el uso del micrófono. **Requisito previo** a pedir el micrófono (legal + confianza).
- [ ] **Guías SEO** ("mejor notebook para programar/gaming/estudiar") — reutiliza la recomendación por specs.
- [ ] Sumar al scraper (`sources.mjs`) las tiendas aprobadas desde el formulario.
- [ ] **Búsqueda a escala**: relevancia + autocomplete cuando haya cientos de modelos.
- [x] **Test general en mobile**: filtros colapsables, ofertas como cards (CTA visible), menú
      hamburguesa con buscador, tabla de specs que envuelve, header que entra a 375px.
- [ ] Cachear imágenes a **R2 / Cloudflare Images** (hoy se hotlinkea el CDN de la tienda).
- [ ] Recomendación por specs: revisar umbrales cuando entren modelos scrapeados (GPUs MX, Ryzen desktop).

## 🟢 Infra / monetización

- [ ] **Deploy a URL de prueba (Render + Supabase)** — ver `website/SUPABASE.md`. Hecho: esquema +
      seed cargado + **sitio público leyendo de Supabase** (data.ts async, verificado) + click-outs y
      captura de alertas persistiendo. Falta: crear el Web Service en Render (cuenta del usuario) y
      **migrar el admin a Supabase** (hoy file-based → efímero en Render).
- [x] **Admin → Supabase**: `adminData.ts` + `/api/admin/*` escriben en la DB (`service_role`).
      Revisión/matcheos/publicaciones/modelos persisten. `publish` + overlays `generated-*.json`
      eliminados/obsoletos. Admin ahora stateless.
- [x] **Scraper → Supabase**: `run.mjs` hace upsert en `listings` (pending/confirmed) preservando
      decisiones del operador, y acumula `price_history`. Pipeline 100% en la DB.
- [x] Limpieza: quitado el cruft de Cloudflare + `publish.mjs`/`generated-*.json` obsoletos.
- [x] **Cron diario** del scraper vía GitHub Actions (`.github/workflows/scrape.yml`, 08:00 ART).
      Falta que el usuario cargue los secrets `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el repo.
- [ ] Freshness: marcar out-of-stock las publicaciones que dejaron de aparecer en un scrape.
- [ ] Limpiar el seed demo (listings l-001..l-030 ficticios) cuando entren datos reales.
- [ ] Deploy alternativo a **Cloudflare Pages** (parte pública, edge): subir zip + flag
      `nodejs_compat` (ver `website/DEPLOY-CLOUDFLARE.md`). Secundario a Render.
- [x] Persistir **click-outs** de `/salir` en DB (tabla `click_outs` en Supabase).
- [ ] Cerrar **programas de afiliados** reales (hoy solo UTMs en Córdoba Notebooks y Frávega).
- [ ] Resolver los `[DECISIÓN PENDIENTE]` en `04-prompt-de-desarrollo.md`.

## Notas de arquitectura

- El pipeline escribe a `data/*.raw.json` / `*.matched.json` / `review-queue.json` /
  `price-history.snapshots.json` / `model-images.json` (todos generados, en `.gitignore`).
  **No pisa** los `data/*.json` curados del seed hasta la migración a DB.
- Sumar una tienda WooCommerce o VTEX = una línea en `website/scrapers/sources.mjs`.
