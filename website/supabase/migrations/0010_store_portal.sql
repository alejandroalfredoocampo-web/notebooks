-- Portal de tiendas para RFQ (spec 08, Fase B).
-- Auth de tiendas = Supabase Auth (mismos usuarios que spec 07) + tabla store_members
-- que vincula un usuario a una tienda. El admin (service_role) crea los vínculos.

create table if not exists store_members (
  user_id    uuid references auth.users(id) on delete cascade,
  store_id   text references stores(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, store_id)
);
create index if not exists store_members_user_idx on store_members (user_id);

alter table store_members enable row level security;
-- Cada usuario ve su(s) vínculo(s); los crea el admin (service_role bypassa RLS).
create policy "read own membership" on store_members for select using (auth.uid() = user_id);

-- --- RFQ visibles para tiendas (miembros) ----------------------------------
-- Una tienda vinculada puede LEER solicitudes abiertas / en cotización.
-- (Nota: expone el contacto del solicitante a las tiendas vetadas por el admin;
--  ofuscar columnas -vía vista- queda como refinamiento futuro.)
create policy "members read open requests" on bulk_requests
  for select using (
    status in ('open','quoting')
    and exists (select 1 from store_members m where m.user_id = auth.uid())
  );

-- --- Cotizaciones -----------------------------------------------------------
-- Una tienda puede INSERTAR una cotización solo para SU tienda, y LEER las suyas.
create policy "members insert own quotes" on bulk_quotes
  for insert with check (
    exists (select 1 from store_members m where m.user_id = auth.uid() and m.store_id = bulk_quotes.store_id)
  );
create policy "members read own quotes" on bulk_quotes
  for select using (
    exists (select 1 from store_members m where m.user_id = auth.uid() and m.store_id = bulk_quotes.store_id)
  );
