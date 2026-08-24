-- El andamio: lo que Supabase ya trae puesto y un PostgreSQL pelado no.
--
-- Las migraciones de `supabase/migrations/` no arrancan solas contra una base vacía: dan por
-- sentado tres cosas que en Supabase vienen de fábrica y acá hay que fabricar.
--
--  1. **Los tres roles.** `anon` (la clave pública), `authenticated` (alguien con sesión) y
--     `service_role` (el admin y el scraper, que saltea RLS). Las policies y los grants de
--     varias migraciones los nombran.
--  2. **El esquema `auth`.** `auth.users` existe porque lo crea Supabase Auth, y `0008` y
--     `0010` le cuelgan claves foráneas. `auth.uid()` es la función con la que casi todas las
--     policies preguntan "¿quién sos?".
--  3. **Los privilegios por defecto.** Supabase le da `all` sobre cada tabla nueva del esquema
--     público a los tres roles y deja que la RLS haga el filtrado. Reproducirlo importa: sin
--     esto, el `revoke` de la `0015` no revocaría nada y su prueba pasaría por la razón
--     equivocada.
--
-- Se usa en dos lados y por eso vive acá y no adentro de un script:
--
--   - `npm run probar:migraciones`, que lo corre sobre PGlite (Postgres en WebAssembly).
--   - Una base local de verdad (Postgres.app), para tener el esquema completo a mano.
--     Ver `supabase/local/LEEME.md`.
--
-- **Nunca se corre contra Supabase.** Allá todo esto ya está, y `create role` fallaría.

-- ---------------------------------------------------------------------------
-- 1. Los roles
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    -- `bypassrls` es lo que hace que el admin y el scraper vean todo sin policies.
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. El esquema auth
-- ---------------------------------------------------------------------------
create schema if not exists auth;

-- Sólo la columna de la que cuelgan las claves foráneas de 0008 y 0010. La tabla real de
-- Supabase tiene treinta y pico de columnas y ninguna otra nos importa acá.
create table if not exists auth.users (
  id    uuid primary key,
  email text
);

-- La de Supabase lee el JWT de la request. Acá se lee un ajuste de sesión, que es el
-- equivalente local: para actuar como alguien, `set local.uid = '<uuid>'`; para volver a ser
-- nadie (o sea `anon`), `set local.uid = ''`.
create or replace function auth.uid() returns uuid language sql stable as
  $fn$ select nullif(current_setting('local.uid', true), '')::uuid $fn$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Los privilegios por defecto
-- ---------------------------------------------------------------------------
-- Esto va ANTES de las migraciones: `alter default privileges` sólo alcanza a lo que se cree
-- después. Si se corre al final, las tablas ya creadas quedan sin grants y el resultado no se
-- parece en nada a Supabase.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
