-- Blog + CMS básico (spec 01). Artículos de opinión/reseña/guía con relación a modelos.
-- Alta/edición: solo service_role (admin). Lectura pública: solo publicados.

create table if not exists posts (
  id           text primary key,             -- slug-based o nanoid
  slug         text unique not null,
  title        text not null,
  excerpt      text,                          -- resumen para cards y meta description
  cover_image  text,
  body_md      text not null default '',      -- cuerpo en Markdown
  kind         text default 'opinion' check (kind in ('opinion','review','guia')),
  author       text default 'Redacción',
  status       text default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now()
);
create index if not exists posts_status_idx on posts (status, published_at desc);

-- Relación artículo ↔ modelos mencionados
create table if not exists post_models (
  post_id  text references posts(id) on delete cascade,
  model_id text references models(id) on delete cascade,
  primary key (post_id, model_id)
);

alter table posts       enable row level security;
alter table post_models enable row level security;

-- Solo artículos publicados son visibles al público
create policy "public read published posts" on posts       for select using (status = 'published');
create policy "public read post_models"     on post_models for select using (true);
-- Alta/edición: service_role (admin) bypassa RLS → no hace falta policy de insert/update.
