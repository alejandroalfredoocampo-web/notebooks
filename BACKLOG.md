# Backlog — Notebooks.com.ar

Estado del MVP y pendientes, ordenado por prioridad. Última actualización: 2026-07-28.

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

### Próximas
- [ ] **Guías SEO** ("mejor notebook para programar/gaming/estudiar") — reutiliza la recomendación por specs.
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
- [ ] **Cron diario** del scraper (GitHub Actions o Render Cron) con la `service_role`.
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
