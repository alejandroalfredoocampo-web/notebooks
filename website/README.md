# Notebooks.com.ar — Website

Comparador de precios de notebooks de Argentina. Next.js 14 (App Router) +
TypeScript + Tailwind. Identidad visual basada en cordobanotebooks.com.ar.

## Correr en local

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de producción (verificado ✓)
npm start
```

## Estructura

```
data/                  Seed de datos (11 tiendas, 10 modelos, 30 ofertas, historial)
                       → en producción esto migra a PostgreSQL
scrapers/              Pipeline de ingesta (ver scrapers/README.md)
src/lib/               Capa de datos: tipos, filtros, ofertas verificadas
src/components/        Header, Footer, ModelCard, SpecChips, PriceChart (SVG SSR),
                       Filters, SortSelect, PriceAlertForm
src/app/
  page.tsx             Home: hero navy, ofertas del día, tipos de uso, cómo funciona
  notebooks/           Listado con filtros facetados vía querystring (SSR)
  notebooks/[brand]/[slug]/  Ficha de modelo: ofertas por tienda, historial,
                       alerta de precio, JSON-LD Product + AggregateOffer (SSG)
  ofertas/             Solo bajadas ≥5% vs promedio 90 días
  tiendas/             Tiendas indexadas + "sumá tu tienda gratis"
  salir/[listingId]/   Redirect 302 con tracking de clic + tags de afiliado
  sitemap.ts robots.ts SEO (fichas indexables, /salir bloqueado)
```

## Decisiones implementadas

- **Ficha única por modelo** (Listing ≠ Model): cada publicación de tienda se
  agrupa bajo un modelo canónico; el orden de ofertas es SIEMPRE por precio.
- **Oferta real**: precio actual ≥5% debajo del promedio de 90 días
  (`REAL_DEAL_THRESHOLD_PCT` en `src/lib/data.ts`).
- **Monetización fase 1**: todos los clics salientes pasan por `/salir/[id]`
  (se registran en `var/clicks.jsonl`; en producción, tabla `ClickOut`).
  Las tiendas con programa de afiliación llevan sus parámetros
  (`data/stores.json → affiliate`). Links con `rel="nofollow sponsored"`.
- **Sin Mercado Libre** en esta fase, según decisión de producto.
- **Branding Córdoba Notebooks**: paleta azul `#336EFA`/`#046BD2`, navy
  `#131525`, celeste `#B3CFFF`, verde `#28A745`; chips de specs al estilo CN.

## Próximos pasos (v1)

1. Implementar los 10 scrapers restantes (`scrapers/README.md`).
2. Matching automático publicación→modelo + cola de revisión.
3. Migrar seed JSON → PostgreSQL; snapshots reales de historial.
4. Alertas de precio con email real (hoy es UI sin backend).
5. Comparador lado a lado y guías SEO.
