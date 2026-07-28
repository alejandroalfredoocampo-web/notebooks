-- Solicitudes de tiendas que quieren sumarse (formulario público en /tiendas).
-- El público puede INSERTAR; solo el admin (service_role) lee y aprueba/rechaza.

create table if not exists store_applications (
  id bigint generated always as identity primary key,
  status text default 'pending' check (status in ('pending','approved','rejected')),

  -- Datos comerciales
  commercial_name text not null,           -- nombre comercial / de fantasía
  legal_name      text,                     -- razón social
  cuit            text,
  website         text not null,

  -- Contacto
  contact_name    text,
  contact_email   text not null,
  contact_phone   text,

  -- Ubicación / operación
  province        text,
  city            text,
  has_physical_store boolean default false,
  physical_address   text,
  ships_nationwide   boolean default false,
  payment_methods    text,                  -- ej. "tarjetas, transferencia, MercadoPago"
  interest_free_installments boolean default false,

  -- Redes sociales
  instagram       text,
  facebook        text,
  tiktok          text,
  youtube         text,
  linkedin        text,
  mercadolibre    text,

  -- Reputación (Google)
  google_rating        numeric,             -- 0..5
  google_reviews_count int,
  google_maps_url      text,

  -- Catálogo (para la ingesta)
  catalog_url     text,                     -- URL del listado de notebooks / lista de precios
  platform        text,                     -- WooCommerce | VTEX | Tiendanube | Magento | Otro

  -- Otros
  message         text,
  created_at      timestamptz default now(),
  reviewed_at     timestamptz
);

alter table store_applications enable row level security;

-- Cualquiera puede enviar una solicitud; nadie puede leerlas con la anon key.
create policy "public insert applications" on store_applications
  for insert with check (true);
