-- Monetización Fase 1: tiers de tienda + destacados + CPC (spec 10).

alter table stores add column if not exists tier          text default 'free'
  check (tier in ('free','verified','featured'));      -- free | Verificada | Verificada+/Destacada
alter table stores add column if not exists featured      boolean default false; -- slot "Patrocinado" activo
alter table stores add column if not exists featured_until date;                 -- vigencia del destacado
alter table stores add column if not exists cpc_ars       int;                   -- override de CPC por tienda (ARS); null = usa el global

-- Backfill: las tiendas ya "Verificada" (spec 04) pasan a tier 'verified' para no perder la insignia.
update stores set tier = 'verified' where verified = true and coalesce(tier, 'free') = 'free';

-- Config global editable desde el admin (CPC por defecto, override por tienda con cpc_ars).
create table if not exists app_settings (
  key   text primary key,
  value text
);
insert into app_settings (key, value) values ('default_cpc_ars', '0')
  on conflict (key) do nothing;

alter table app_settings enable row level security;
-- Sin policies públicas: solo el admin (service_role) lee/escribe la config y el CPC.
-- NOTA: `cpc_ars` es info comercial → el sitio público NO la expone (el loader público
-- selecciona columnas explícitas y la excluye; ver src/lib/data.ts).
