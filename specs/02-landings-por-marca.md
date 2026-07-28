# 02 — Landings específicas por marca

## Objetivo
Dar a cada marca (Lenovo, HP, Asus, Apple…) una página propia con una **introducción editorial** a la
marca arriba y, debajo, **solo el listado de sus notebooks**. Mejora SEO ("notebooks Lenovo Argentina
precio"), da un destino natural a los chips de marca de la home y ordena la navegación por marca.

## Estado actual (reutilizar)
- Ya existe `getBrands()` en `src/lib/data.ts` (marcas + conteo).
- Hoy "ver una marca" se resuelve con `/notebooks?brand=lenovo` (filtro). Los chips de marca de la
  home (`src/app/page.tsx`) y el breadcrumb de la ficha apuntan ahí.
- La ruta `src/app/notebooks/[brand]/[slug]` es la **ficha** de producto; `[brand]` solo se usa como
  segmento. **No** hay landing de marca en `/notebooks/[brand]` (colisionaría con la ficha si `[slug]`
  faltara). Por eso la landing va en un namespace propio.

## Alcance
- **MVP**: ruta `/marcas/[brand]` con intro (copy + logo + datos) y grilla de todos los modelos de esa
  marca reutilizando `ModelCard`. Índice `/marcas`. Redirigir los enlaces de marca existentes a esta
  landing.
- **Fuera de MVP**: filtros dentro de la landing (se pueden linkear a `/notebooks?brand=...` con
  filtros extra), orden editorial manual de modelos destacados.

## Modelo de datos — migración `0005_brands.sql` (opcional)
El listado funciona sin tabla nueva (derivando de `models`). La tabla agrega **contenido editorial**
por marca (intro, logo, orden). Si se quiere lanzar rápido, se puede hardcodear un `BRAND_COPY` en
código y crear la tabla después.
```sql
create table if not exists brands (
  slug        text primary key,      -- coincide con models.brand_slug
  name        text not null,
  logo_url    text,
  intro_md    text,                  -- 1–3 párrafos de introducción (Markdown)
  hero_image  text,
  sort_weight int default 0,         -- para ordenar el índice /marcas
  seo_title   text,
  seo_desc    text,
  updated_at  timestamptz default now()
);
alter table brands enable row level security;
create policy "public read brands" on brands for select using (true);
-- edición: service_role (admin)
```
Editable desde un `/admin/marcas` mínimo (opcional) o por seed. Fallback: si no hay fila `brands`
para un slug, usar `getBrands()` + copy genérico.

## Rutas / UI
- `/marcas` — índice: grilla de marcas (logo, nombre, "N modelos"). Cada card → `/marcas/[slug]`.
- `/marcas/[brand]` (`force-dynamic`):
  1. **Hero de marca**: logo, nombre, `intro_md` renderizado, y stats (N modelos, rango de precios,
     "desde $X"). Si existe `brands` úsala; si no, copy genérico.
  2. **Listado**: `filterModels({ brands: [brand] })` → grilla `ModelCard` (mismo componente que
     `/notebooks`). Orden por defecto = el de `filterModels`. Incluir el `SortSelect`.
  3. Link "Ver con todos los filtros" → `/notebooks?brand=[brand]` (reusa el filtrado completo).
- `notFound()` si el slug no corresponde a ninguna marca con modelos.

## Cambios de navegación
- Home (`src/app/page.tsx`): los chips de marca pasan de `/notebooks?brand=` a `/marcas/[slug]`.
- Ficha (`.../[slug]/page.tsx`): el breadcrumb de marca apunta a `/marcas/[brandSlug]`.
- Agregar "Marcas" al `Header`/`MobileMenu`.

## SEO
- `generateMetadata`: `seo_title`/`seo_desc` de la tabla o derivados ("Notebooks {Marca} en Argentina
  — precios de N tiendas").
- Sumar `/marcas` y cada `/marcas/[brand]` a `src/app/sitemap.ts` (iterando `getBrands()`).
- JSON-LD `@type: CollectionPage` / `ItemList` con los modelos.

## Criterios de aceptación
- [ ] `/marcas/lenovo` muestra la intro y **solo** modelos Lenovo, con precios en vivo.
- [ ] Una marca sin fila en `brands` igual renderiza (copy fallback), sin romper.
- [ ] Los chips de marca de la home llevan a la landing, no al filtro.
- [ ] `/marcas` y cada landing están en el sitemap.

## Notas
- Mantener el listado idéntico visualmente a `/notebooks` (mismo `ModelCard`) para no duplicar diseño.
- La landing de marca y la de tienda (spec 04) comparten patrón "hero editorial + listado filtrado":
  conviene construir un componente `EntityHero` reutilizable.
