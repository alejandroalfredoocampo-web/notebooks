# 07 — Login de usuarios + favoritos e intereses

## Objetivo
Permitir que los usuarios creen una cuenta (email+contraseña u **OAuth de Google**) para **guardar
favoritos**, **marcar intereses** (usos, marcas, presupuesto) y recibir **recomendaciones por email**.
Es el loop de retención de largo plazo del producto (hasta ahora todo es anónimo, "sin registro").

## Decisión de arquitectura: Supabase Auth
- Usar **Supabase Auth** (ya tenemos el proyecto): provee email/password y Google OAuth listos,
  emite JWT y expone `auth.uid()` para RLS. Evita construir auth propia.
- El sitio hoy usa la **anon key** para todo (lecturas públicas). Para leer/escribir datos del usuario
  hace falta un cliente con la **sesión del usuario** (SSR): agregar `@supabase/ssr` para manejar la
  sesión por cookies en App Router (server components + route handlers + middleware de refresh).
- **No confundir** con el login del admin (`ADMIN_PASSWORD`, cookie propia): son sistemas separados.
  El admin sigue como está.

> ⚠️ El asistente no puede configurar el proveedor de Google OAuth ni tocar la config de Supabase Auth
> (requiere el dashboard/keys del usuario): esos pasos los hace el usuario. La spec deja el "cómo".

## Modelo de datos — migración `0008_users.sql`
Supabase ya tiene `auth.users`. Creamos tablas de dominio ligadas por `user_id uuid`:
```sql
-- Perfil público mínimo (opcional; auth.users ya tiene email)
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz default now()
);

create table if not exists favorites (
  user_id   uuid references auth.users(id) on delete cascade,
  model_id  text references models(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, model_id)
);

create table if not exists user_interests (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  uses          text[] default '{}',        -- gaming, diseno, programar, estudiar, oficina
  brands        text[] default '{}',        -- brand_slugs
  budget_max    int,
  email_recos   boolean default true,       -- opt-in a recomendaciones por mail
  updated_at    timestamptz default now()
);

alter table profiles       enable row level security;
alter table favorites      enable row level security;
alter table user_interests enable row level security;

-- Cada usuario solo ve/escribe lo suyo
create policy "own profile"     on profiles       for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "own favorites"   on favorites      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own interests"   on user_interests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## Rutas / UI
- **Auth**: `/ingresar` (login + registro con tabs), botón "Continuar con Google". Callback en
  `/auth/callback` (route handler que intercambia el code por sesión con `@supabase/ssr`).
- **Middleware** (`middleware.ts`): refresca la sesión en cada request (patrón oficial de
  `@supabase/ssr` para App Router).
- **Header**: si hay sesión, avatar/menu (Mi cuenta, Favoritos, Salir); si no, "Ingresar".
- **Favoritos**: botón ♥ en `ModelCard` y en la ficha. Click sin sesión → invita a ingresar
  (guardar intención y aplicarla post-login, o simplemente redirigir a `/ingresar`). `/favoritos`
  lista los modelos guardados (reusa `ModelCard`).
- **Intereses / preferencias**: `/cuenta` con formulario de `user_interests` (usos, marcas,
  presupuesto, opt-in a mails). Prefill de intereses desde el historial no es MVP.

## Favoritos: server actions / API
- Toggle favorito vía **server action** o `POST/DELETE /api/favoritos` usando el cliente con sesión
  del usuario (RLS garantiza aislamiento). El botón ♥ es client component optimista.

## Recomendaciones por email
- **MVP de datos**: guardar intereses + opt-in. El **envío** es un cron (comparte worker con alertas
  de precio y avisos de disponibilidad — ver `BACKLOG.md`).
- Lógica de reco reutiliza `filterModels` con los intereses del usuario (uso + marca + presupuesto) y
  prioriza `isRealDeal` (ofertas reales) y novedades. Frecuencia y unsubscribe (link con token) se
  detallan al construir el worker.

## Privacidad / seguridad
- No manejar contraseñas en texto: Supabase Auth las gestiona. El asistente **no** implementa flujos
  que ingresen credenciales; el usuario configura el proveedor.
- Actualizar `/privacidad` (spec 03) con: datos de cuenta, OAuth de Google, uso del email para
  recomendaciones y cómo darse de baja.
- Doble opt-in de email recomendado para cumplir buenas prácticas antispam.

## Criterios de aceptación
- [ ] Un usuario puede registrarse con email/clave y con Google, y la sesión persiste entre requests.
- [ ] Un usuario logueado puede marcar/quitar favoritos y verlos en `/favoritos`; otro usuario no ve
      los favoritos ajenos (verificable: RLS bloquea con la anon/otra sesión).
- [ ] Guardar intereses persiste y el opt-in queda registrado.
- [ ] Sin sesión, el sitio sigue 100% usable (favoritos invita a ingresar, no rompe).

## Notas
- Es la spec de mayor superficie: auth SSR + RLS por usuario + middleware. Conviene hacerla en su
  propia rama y después colgar favoritos/intereses.
- Habilita asociar `user_id` en spec 06 (avisos) y spec 08 (solicitudes corporativas).
