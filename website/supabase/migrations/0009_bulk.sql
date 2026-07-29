-- Venta corporativa / mayorista — RFQ (spec 08, Fase A).
-- El público crea solicitudes (bulk_requests); solo el admin (service_role) las lee.
-- Las cotizaciones (bulk_quotes) las carga el admin a mano en Fase A; el portal de
-- tiendas con auth propia (Fase B) agrega policies para que las tiendas coticen.

create table if not exists bulk_requests (
  id            text primary key,           -- nanoid
  status        text default 'open' check (status in ('open','quoting','closed','cancelled')),
  -- Qué pide
  model_id      text references models(id) on delete set null,  -- null si describe specs libres
  specs_note    text,                        -- si no hay modelo canónico
  quantity      int not null check (quantity > 0),
  needed_by     date,
  -- Quién pide
  company_name  text not null,
  cuit          text,
  contact_name  text,
  contact_email text not null,
  contact_phone text,
  province      text,
  user_id       uuid,                        -- opcional (spec 07)
  message       text,
  created_at    timestamptz default now()
);
create index if not exists bulk_requests_status_idx on bulk_requests (status, created_at desc);

create table if not exists bulk_quotes (
  id             text primary key,
  request_id     text not null references bulk_requests(id) on delete cascade,
  store_id       text references stores(id) on delete set null,
  unit_price     int not null,
  total_price    int,
  valid_until    date,
  notes          text,
  status         text default 'submitted' check (status in ('submitted','accepted','declined')),
  created_at     timestamptz default now()
);
create index if not exists bulk_quotes_request_idx on bulk_quotes (request_id);

alter table bulk_requests enable row level security;
alter table bulk_quotes   enable row level security;
-- Fase A: el público puede crear solicitudes; solo admin (service_role) lee/escribe el resto.
create policy "public insert bulk_requests" on bulk_requests for insert with check (true);
-- bulk_quotes: sin acceso público en Fase A. Las policies de tiendas se agregan en Fase B.
