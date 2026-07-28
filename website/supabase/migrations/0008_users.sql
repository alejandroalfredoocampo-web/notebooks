-- Login de usuarios + favoritos e intereses (spec 07).
-- Usa Supabase Auth (auth.users ya existe). Tablas de dominio ligadas por user_id.
-- RLS: cada usuario solo ve/escribe lo suyo (auth.uid()).

create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz default now()
);

create table if not exists favorites (
  user_id    uuid references auth.users(id) on delete cascade,
  model_id   text references models(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, model_id)
);
create index if not exists favorites_user_idx on favorites (user_id);

create table if not exists user_interests (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  uses       text[] default '{}',        -- gaming, diseno, programar, estudiar, oficina
  brands     text[] default '{}',        -- brand_slugs
  budget_max int,
  email_recos boolean default true,      -- opt-in a recomendaciones por mail
  updated_at timestamptz default now()
);

alter table profiles       enable row level security;
alter table favorites      enable row level security;
alter table user_interests enable row level security;

-- Cada usuario solo ve/escribe lo suyo
create policy "own profile"   on profiles       for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own favorites" on favorites      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own interests" on user_interests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- CONFIG QUE HACE EL USUARIO EN EL DASHBOARD DE SUPABASE (no es SQL):
--   1. Authentication → Providers: habilitar Email y Google (client id/secret de Google Cloud).
--   2. Authentication → URL Configuration: Site URL = https://www.notebooks.com.ar
--      y Redirect URLs: https://www.notebooks.com.ar/ingresar y http://localhost:3000/ingresar
--   3. En Vercel + .env.local, agregar (mismos valores que ya usás, con prefijo público):
--        NEXT_PUBLIC_SUPABASE_URL       = <SUPABASE_URL>
--        NEXT_PUBLIC_SUPABASE_ANON_KEY  = <SUPABASE_ANON_KEY>
-- ---------------------------------------------------------------------------
