# 01 — Blog + CMS básico

## Objetivo
Publicar artículos de opinión y reseñas de modelos que aparecen en el sitio, con un CMS mínimo dentro
del admin para crear/editar/despublicar. El blog es un motor de **SEO** (long tail: "reseña Lenovo
LOQ", "¿conviene el MacBook Air M3?") y de **autoridad editorial** que refuerza la confianza del
comparador. Cada artículo puede enlazar a las fichas de los modelos que menciona.

## Alcance
- **MVP**: listado del blog, artículo individual, CMS en `/admin/blog` (alta/edición/borrador/publicado),
  cuerpo en Markdown, imagen de portada, relación artículo↔modelos, RSS y sitemap.
- **Fuera de MVP** (dejar preparado, no construir): comentarios, autores múltiples con permisos,
  categorías/tags jerárquicos, editor WYSIWYG rico, programación de publicación futura.

## Modelo de datos — migración `0004_blog.sql`
```sql
create table if not exists posts (
  id           text primary key,            -- nanoid o slug-based
  slug         text unique not null,
  title        text not null,
  excerpt      text,                         -- resumen para cards y meta description
  cover_image  text,
  body_md      text not null,                -- cuerpo en Markdown
  kind         text default 'opinion' check (kind in ('opinion','review','guia')),
  author       text default 'Redacción',
  status       text default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);
create index if not exists posts_status_idx on posts (status, published_at desc);

-- Relación artículo ↔ modelos mencionados (para "reseña de X" y bloques de precio embebidos)
create table if not exists post_models (
  post_id  text references posts(id) on delete cascade,
  model_id text references models(id) on delete cascade,
  primary key (post_id, model_id)
);

alter table posts       enable row level security;
alter table post_models enable row level security;
-- Solo artículos publicados son visibles al público
create policy "public read published posts" on posts for select using (status = 'published');
create policy "public read post_models"     on post_models for select using (true);
-- Alta/edición: solo service_role (admin) → bypassa RLS, no hace falta policy de insert.
```
Agregar tipos `Post` / `PostModel` a `src/lib/types.ts` y mappers en un nuevo `src/lib/blog.ts`
(mismo patrón que `data.ts`: `loadPosts()` cacheado con `react.cache`, mapea snake→camel).

## Rutas / UI (público)
- `/blog` — listado paginado (o "cargar más") de artículos publicados, ordenados por `published_at`.
  Card: portada, `kind` (badge Opinión/Reseña/Guía), título, excerpt, fecha. Reusar tono visual de
  `ModelCard`.
- `/blog/[slug]` — artículo. Render de `body_md` a HTML (ver "Markdown" abajo). Encabezado con
  portada, título, autor, fecha. Al pie: bloque "Modelos mencionados" con mini-cards de precio de los
  `post_models` (reusar `getModelBySlug`/`getModels`), y CTA de compartir (ver spec 09).
- Enlazar el blog en `Header.tsx`/`MobileMenu.tsx` y en `Footer.tsx` (sección "Explorar").

## Rutas / UI (admin — CMS)
- `/admin/blog` — tabla de artículos (título, estado, fecha) con acciones editar / publicar / pasar a
  borrador. Mismo layout que `src/app/admin/publicaciones/page.tsx`.
- `/admin/blog/nuevo` y `/admin/blog/[id]` — formulario: título (autogenera `slug`, editable),
  `kind`, excerpt, portada (URL; subida a Storage es fuera de MVP), cuerpo Markdown en `<textarea>`
  con preview en vivo, selector múltiple de modelos (autocomplete sobre `getModels()`), botón
  Guardar borrador / Publicar.
- API: `src/app/api/admin/post/route.ts` (POST crear/actualizar, PATCH estado). Protegida por
  `requireAdmin()` (patrón de `src/lib/adminAuth.ts`), escribe con `supabaseAdmin`.

## Markdown
- Usar `react-markdown` + `remark-gfm` (agregar dependencia). Sanitizar (`rehype-sanitize`) porque el
  cuerpo lo escribe el admin pero igual se renderiza como HTML. Permitir encabezados, listas, links,
  imágenes, código y tablas. Estilar con `@tailwindcss/typography` (`prose`).

## SEO
- `generateMetadata` por artículo: `title`, `description` (excerpt), Open Graph (`og:image` = portada,
  `og:type=article`) — base para spec 09.
- JSON-LD `@type: BlogPosting` (autor, `datePublished`, `image`, `headline`), igual patrón que el
  `Product` de la ficha.
- Sumar `/blog` y cada `/blog/[slug]` publicado a `src/app/sitemap.ts`. RSS en `/blog/rss.xml`
  (route handler que serializa los últimos N publicados).

## Criterios de aceptación
- [ ] Un artículo en `draft` no aparece en `/blog`, ni en sitemap, ni es accesible por slug (404).
- [ ] Publicar setea `published_at` y lo hace visible sin redeploy (lectura `no-store`).
- [ ] El artículo muestra precio en vivo de los modelos mencionados (no un precio hardcodeado).
- [ ] El cuerpo Markdown renderiza sanitizado (un `<script>` en el body no se ejecuta).
- [ ] `/blog/[slug]` genera OG tags correctos (verificable en el debugger de OG).

## Notas
- No introducir un CMS externo: el CMS "básico" pedido es este panel propio, coherente con el admin
  file-less ya migrado a Supabase.
- Riesgo de scope: mantener el editor como `textarea`+preview. Un WYSIWYG completo es otra iteración.
