# Prompt de desarrollo — Notebooks.com.ar

> Documento pensado para usarse como prompt una vez tomadas las decisiones de producto. Las secciones marcadas `[DECISIÓN PENDIENTE]` deben completarse antes de ejecutarlo.

---

## Contexto

Sos el desarrollador principal de **Notebooks.com.ar**, un comparador de precios de notebooks en Argentina. El sitio indexa publicaciones de tiendas online de terceros (no vende ni intermedia pagos). El usuario final busca un modelo de notebook, compara ofertas de todas las tiendas, ve historial de precios y sale con un clic hacia la tienda elegida.

Referencias de producto: SoloTodo (solotodo.cl) para fichas por modelo y specs normalizadas; HardGamers (hardgamers.com.ar) como competidor local; Idealo para el modelo CPC futuro.

## Decisiones de producto (definidas 07/2026)

- **Tiendas iniciales (11)**: Córdoba Notebooks, Full H4rd, Maximus, Gezatek, Venex, Mexx, Frávega, Cetrogar, Musimundo, Backup Computación, Max Tecno.
- **Mercado Libre**: NO se incluye en el día 1.
- **Monetización fase 1**: afiliación donde exista + tracking de clics salientes para todas las tiendas.
- **Categorías**: solo notebooks al lanzamiento.
- **Identidad visual**: reutilizar la imagen de cordobanotebooks.com.ar. Paleta relevada del sitio: azul primario `#336EFA`, azul profundo `#046BD2` / `#0049A3`, azul marino oscuro `#131525` (secciones/footer), celeste `#B3CFFF` / `#6EC1E4`, verde `#28A745` (éxito/stock), texto `#333`. Header blanco con logo azul, secciones destacadas sobre navy. Tono: retail argentino directo ("Envío gratis a todo el país", "12 cuotas sin interés"), trust-badges prominentes. Adoptar el formato de specs en chips de Córdoba Notebooks (procesador / RAM / SSD / pantalla / GPU / OS).

## Stack sugerido

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind. SSR/ISR para SEO — las páginas de modelo y listados deben renderizar server-side con metadata completa.
- **Backend/API**: el mismo Next.js (route handlers) o un servicio aparte en Node/TypeScript si la ingesta lo justifica.
- **Base de datos**: PostgreSQL (Supabase o RDS).
- **Búsqueda**: Meilisearch o Typesense (filtros facetados + typo tolerance).
- **Ingesta**: workers en Node o Python (Playwright para sitios JS, requests/cheerio para HTML estático), orquestados con cron (cada 4–6 hs). Colas con BullMQ/Redis si crece.
- **Email**: Resend o similar para alertas de precio.
- **Analytics**: Plausible/GA4 + tabla propia de clics salientes.
- **Hosting**: Vercel (front) + Railway/Fly/VPS (workers y DB), o todo en un VPS al inicio.

## Modelo de datos (núcleo)

```
Store        (id, name, slug, url, logo, has_physical_store, payment_methods, active)
Brand        (id, name, slug)
NotebookModel(id, brand_id, name, slug, part_number, ean,
              cpu, cpu_benchmark_score, ram_gb, ram_type, storage_gb, storage_type,
              screen_size_in, screen_resolution, screen_panel, screen_refresh_hz,
              gpu, gpu_type[integrada|dedicada], os, weight_kg, battery_wh,
              release_year, image_urls, status[active|discontinued])
Listing      (id, store_id, model_id nullable, external_id, url, title_raw,
              price_list, price_cash, price_installments, installments_count,
              currency, in_stock, condition[new|refurb|outlet],
              first_seen_at, last_seen_at, active)
PriceHistory (id, listing_id, price_cash, price_list, in_stock, captured_at)
ClickOut     (id, listing_id, store_id, model_id, session_id, referrer, created_at)
PriceAlert   (id, user_id, model_id, target_price, active, last_notified_at)
User         (id, email, auth_provider, created_at)
MatchReview  (id, listing_id, candidate_model_id, confidence, status[pending|approved|rejected])
```

Regla clave: **Listing ≠ Model**. Cada publicación de tienda es un Listing; el matching los agrupa bajo un NotebookModel canónico. Listings sin match quedan visibles pero huérfanos hasta pasar por MatchReview.

## Pipeline de ingesta y matching

1. **Scraper por tienda** (un módulo por tienda, interfaz común): extrae título, precio contado/lista/cuotas, stock, URL, imagen, ID externo. Tolerante a fallos: si una tienda cambia el HTML, alerta y no rompe el resto.
2. **Normalización**: parseo del título para extraer marca, línea, CPU, RAM, almacenamiento, pantalla, GPU (regex + diccionarios; opcionalmente LLM para casos ambiguos con cache del resultado).
3. **Matching**: por part number/EAN si existe; si no, por specs parseadas + similitud de título. Score de confianza: match automático arriba del umbral, cola de revisión manual (MatchReview) debajo.
4. **Snapshot de precios**: cada corrida inserta en PriceHistory solo si cambió el precio o el stock.
5. **Detección de ofertas**: un Listing es "oferta real" si su precio actual está X% (ej. 10%) debajo de su promedio de 90 días y no hubo suba artificial previa (anti "inflar y rebajar").

## Páginas y rutas

```
/                                → home: buscador, ofertas del día, accesos por uso/marca
/notebooks                       → listado con filtros facetados (marca, CPU, RAM, storage,
                                   pantalla, GPU, precio, tienda, stock) — SSR, URLs con
                                   query params canonicalizadas
/notebooks/[brand]/[model-slug]  → ficha de modelo: specs, tabla de ofertas ordenada por
                                   precio, gráfico de historial, alerta de precio,
                                   similares. JSON-LD Product + AggregateOffer.
/ofertas                         → bajadas de precio verificadas
/comparar?m=a,b,c                → comparador lado a lado (hasta 4)
/tiendas y /tiendas/[slug]       → índice y detalle de tienda
/guias/[slug]                    → contenido editorial/SEO
/salir/[listing-id]              → redirect 302 con registro de ClickOut (+ tag de
                                   afiliado si la tienda lo soporta)
/admin                           → dashboard interno: salud de scrapers, cola de matching,
                                   métricas de clics
```

## Requisitos no funcionales

- **SEO**: SSR, sitemap.xml dinámico, canonical por modelo, JSON-LD (Product, AggregateOffer, BreadcrumbList), Core Web Vitals en verde, URLs en español.
- **Performance**: listado y ficha < 1s TTFB con cache/ISR; revalidación al actualizar precios.
- **Transparencia**: todo resultado esponsoreado o link de afiliado, etiquetado. Página "cómo ganamos dinero".
- **Legal**: los precios son informativos y pueden variar; mostrar timestamp de última actualización por oferta. Términos, privacidad y baja de alertas en un clic.
- **Robustez de scraping**: user-agent identificable, respeto de robots.txt donde aplique, rate limiting, y preferencia por feeds/acuerdos directos con tiendas cuando existan.

## Fases de entrega

1. **MVP (4–6 semanas)**: 10 tiendas, ~2.000 listings, matching semiautomático, listado+ficha+historial, clic saliente con tracking, sin login.
2. **v1**: alertas de precio con login Google, sección ofertas, comparador lado a lado, sitemap/SEO completo, admin de matching.
3. **v1.5**: guías editoriales, recomendador por uso, newsletter semanal de ofertas.
4. **v2 (comercial)**: portal para tiendas (dashboard de clics), destacados pagos etiquetados, infraestructura CPC.

## Criterios de aceptación del MVP

- Buscar "lenovo i5" devuelve modelos (no publicaciones duplicadas) en <300 ms.
- Una ficha muestra ≥2 ofertas de tiendas distintas con precios reales y links funcionales para al menos el 60% de los modelos activos.
- El historial de precios registra cambios reales tras 2 semanas de corridas.
- Google indexa fichas de modelo con rich results (validar en Search Console).
- Si un scraper falla, el sitio sigue sirviendo los últimos datos y el admin recibe alerta.
