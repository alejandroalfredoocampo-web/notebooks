-- Landings por marca (spec 02). Contenido editorial por marca.
-- El listado de modelos funciona sin esta tabla (fallback en código); esta tabla
-- agrega intro/logo/SEO por marca. slug coincide con models.brand_slug.

create table if not exists brands (
  slug        text primary key,
  name        text not null,
  logo_url    text,
  intro_md    text,                  -- 1–3 párrafos de introducción (Markdown)
  hero_image  text,
  sort_weight int default 0,         -- orden del índice /marcas
  seo_title   text,
  seo_desc    text,
  updated_at  timestamptz default now()
);

alter table brands enable row level security;
create policy "public read brands" on brands for select using (true);
-- edición: service_role (admin)
