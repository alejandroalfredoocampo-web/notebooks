-- Notebooks.com.ar — esquema inicial (Supabase / Postgres)
-- Modela todo el producto y destraba: alertas de precio, tracking de click-outs
-- y el flujo de revisión de matcheos, todo en la DB (reemplaza los JSON).

-- ---------------------------------------------------------------------------
-- Tiendas
-- ---------------------------------------------------------------------------
create table if not exists stores (
  id             text primary key,
  name           text not null,
  slug           text unique not null,
  url            text not null,
  type           text,
  physical_store boolean default true,
  city           text,
  affiliate      jsonb,                    -- { kind, params } | null
  created_at     timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Modelos canónicos (ficha única por modelo)
-- ---------------------------------------------------------------------------
create table if not exists models (
  id                text primary key,
  brand             text not null,
  brand_slug        text not null,
  name              text not null,
  slug              text not null,
  part_number       text,
  cpu               text,
  cpu_family        text,
  ram_gb            int,
  ram_type          text,
  storage_gb        int,
  storage_type      text,
  screen_size_in    numeric,
  screen_resolution text,
  screen_panel      text,
  screen_refresh_hz int,
  gpu               text,
  gpu_type          text check (gpu_type in ('integrada','dedicada')),
  os                text,
  weight_kg         numeric,
  battery_wh        int,
  release_year      int,
  use_cases         jsonb default '[]',
  image_url         text,
  source            text default 'seed',   -- seed | manual
  created_at        timestamptz default now(),
  unique (brand_slug, slug)
);

-- ---------------------------------------------------------------------------
-- Publicaciones (una por tienda). El estado de matcheo vive acá: reemplaza
-- review-queue.json + match-decisions.json.
-- ---------------------------------------------------------------------------
create table if not exists listings (
  id               text primary key,
  store_id         text not null references stores(id),
  model_id         text references models(id) on delete set null,
  url              text,
  title_raw        text not null,
  price_list       int,
  price_cash       int not null,
  installments     jsonb,                  -- { count, amount } | null
  in_stock         boolean default true,
  condition        text default 'new',
  image            text,
  source           text default 'scraper', -- scraper | manual
  match_status     text default 'pending' check (match_status in ('pending','confirmed','rejected')),
  match_confidence numeric default 0,
  match_candidate  text references models(id),
  first_seen_at    timestamptz default now(),
  last_seen_at     timestamptz default now()
);
create index if not exists listings_model_idx  on listings (model_id);
create index if not exists listings_store_idx  on listings (store_id);
create index if not exists listings_status_idx on listings (match_status);

-- ---------------------------------------------------------------------------
-- Historial de precios (un punto por modelo por día si cambió)
-- ---------------------------------------------------------------------------
create table if not exists price_history (
  id          bigint generated always as identity primary key,
  model_id    text not null references models(id) on delete cascade,
  captured_on date not null,
  best_price  int not null,
  unique (model_id, captured_on)
);
create index if not exists price_history_model_idx on price_history (model_id, captured_on);

-- ---------------------------------------------------------------------------
-- Alertas de precio (loop de retención)
-- ---------------------------------------------------------------------------
create table if not exists price_alerts (
  id                 bigint generated always as identity primary key,
  email              text not null,
  model_id           text not null references models(id) on delete cascade,
  target_price       int,                  -- null = avisar en cualquier baja
  active             boolean default true,
  created_at         timestamptz default now(),
  last_notified_at   timestamptz,
  last_notified_price int
);
create index if not exists price_alerts_active_idx on price_alerts (model_id) where active;

-- ---------------------------------------------------------------------------
-- Click-outs (inventario a monetizar: CPA/CPC)
-- ---------------------------------------------------------------------------
create table if not exists click_outs (
  id            bigint generated always as identity primary key,
  listing_id    text,
  store_id      text,
  model_id      text,
  price_at_click int,
  referrer      text,
  user_agent    text,
  created_at    timestamptz default now()
);
create index if not exists click_outs_created_idx on click_outs (created_at);
create index if not exists click_outs_model_idx   on click_outs (model_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Público (anon key): lee catálogo; puede crear alertas y registrar clics.
--   Admin/pipeline (service_role key): bypassea RLS para escrituras.
-- ---------------------------------------------------------------------------
alter table stores        enable row level security;
alter table models        enable row level security;
alter table listings      enable row level security;
alter table price_history enable row level security;
alter table price_alerts  enable row level security;
alter table click_outs    enable row level security;

-- Lectura pública del catálogo
create policy "public read stores"   on stores        for select using (true);
create policy "public read models"   on models        for select using (true);
-- Solo publicaciones confirmadas son visibles al público
create policy "public read listings" on listings       for select using (match_status = 'confirmed');
create policy "public read history"  on price_history  for select using (true);

-- El público puede suscribirse a alertas y registrar clics (insert), no leer
create policy "public insert alerts" on price_alerts for insert with check (true);
create policy "public insert clicks" on click_outs   for insert with check (true);
