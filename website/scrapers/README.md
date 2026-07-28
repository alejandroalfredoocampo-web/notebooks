# Scrapers — Notebooks.com.ar

Pipeline de ingesta. En vez de un scraper por tienda, hay **adaptadores
genéricos por plataforma** parametrizados en `sources.mjs`: sumar una tienda
del mismo tipo es agregar una línea, no escribir código.

## Correr

```bash
npm run scrape                 # todas las fuentes de sources.mjs
node scrapers/run.mjs fravega  # una sola
```

El runner ejecuta 4 etapas y escribe archivos **generados** (no pisan el seed
curado de `data/*.json`; están en `.gitignore`):

1. **Scrape** → `data/listings.raw.json` (tolerante a fallos por tienda)
2. **Matching** → `data/listings.matched.json` + `data/review-queue.json`
3. **Snapshot** → `data/price-history.snapshots.json` (solo si cambió el precio)
4. **Imágenes** → `data/model-images.json` (una imagen canónica por modelo)

## Publicar al sitio

El sitio corre en edge (sin filesystem), así que no lee estos archivos en runtime.
El paso de **publish** hornea los matcheos **confirmados** (en el admin) + las
**publicaciones propias** en un overlay que el sitio importa estáticamente:

```bash
npm run publish:site   # o el botón "Publicar al sitio" en /admin
```

Genera `data/generated-listings.json` / `generated-models.json` /
`generated-images.json` / `generated-history.json` (committeados, con defaults
vacíos). `generated-models.json` son los **modelos canónicos creados por el
operador** desde el admin ("+ Crear modelo" en la revisión, a partir de una
publicación scrapeada que no matcheaba ninguno). Es idempotente y no toca el seed
curado. En el sitio deployado hay que **rebuild + redeploy** para que tome el
overlay (en `npm run dev` se ve al instante).

## Adaptadores

| Adaptador | Archivo | Estrategia |
|---|---|---|
| WooCommerce | `adapters/woocommerce.mjs` | Store API pública (JSON): `/wp-json/wc/store/v1/products` |
| VTEX | `adapters/vtex.mjs` | Catalog API pública (JSON): `/api/catalog_system/pub/products/search` |

## Fuentes configuradas (`sources.mjs`)

Plataformas confirmadas por sondeo (2026-07):

| Tienda | Plataforma | Estado |
|---|---|---|
| Córdoba Notebooks | WooCommerce | ✅ trae datos reales |
| Max Tecno | WooCommerce | ✅ configurada |
| Frávega | VTEX | ✅ configurada (afinar categoría) |
| Cetrogar | VTEX | ✅ configurada (afinar categoría) |
| Naldo | VTEX | ✅ configurada (afinar categoría) |
| Maximus, Venex, Musimundo, Gezatek, Mexx, Backup | HTML/JSON-LD | ⬜ segunda ola |
| Compragamer, Garbarino, Megatone, Invid… | detrás de WAF | ⬜ requieren UA/acuerdo o headless |

## Matching (`matching.mjs`)

1. **Part number** exacto → confianza 1.0.
2. **Huella de specs + nombre de línea** (marca requerida; nombre de línea con
   peso alto para no confundir modelos de la misma marca; CPU, RAM, storage, GPU).
3. Confianza < `CONFIDENCE_THRESHOLD` (0.8) → cola de revisión manual.

> El seed demo tiene SKUs específicos que rara vez aparecen verbatim en un
> catálogo real, así que el driver de auto-match será el **part number** una vez
> cargados en los modelos canónicos. Hasta entonces, casi todo va a revisión (a
> propósito: se prioriza precisión sobre cantidad).

## Reglas

1. **User-agent identificable**: `NotebooksComArBot/1.0 (+https://www.notebooks.com.ar/bot)`
   (el adaptador VTEX usa un UA de navegador porque el WAF bloquea bots).
2. **Rate limiting**: 1 request/segundo global (`politeFetch` en `lib.mjs`).
3. **Tolerancia a fallos**: si una tienda falla, el runner loguea y sigue;
   conserva los últimos datos buenos de esa tienda.
4. **Preferir feeds/APIs** a parsing de HTML cuando existan.

## Roadmap

Ver [`../../BACKLOG.md`](../../BACKLOG.md).
