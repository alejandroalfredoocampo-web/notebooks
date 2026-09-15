-- Las escrituras públicas pasan sólo por la API del sitio.
--
-- ## El problema
--
-- La anon key es pública: viaja en el bundle del navegador y cualquiera la lee. Con ella se
-- puede hablarle a PostgREST directo, sin pasar por `/api/*`. Y cinco tablas tenían una
-- policy `for insert with check (true)` para `anon`:
--
--   price_alerts, click_outs, store_applications, model_notify, bulk_requests
--
-- O sea que todo lo que protege a esos formularios —rate limit por IP, honeypot, validación
-- de email, lista blanca de esquemas de URL— vivía en un camino que se podía saltear con un
-- `curl`. Tres consecuencias concretas:
--
--  - **Mails a terceros sin techo.** Un alta masiva de `price_alerts` con direcciones ajenas
--    hace que el worker de emails les escriba a todas. Se quema la reputación del dominio.
--  - **XSS almacenado en el admin.** `store_applications.website` se renderiza como `href`
--    en la bandeja de aprobación. La API rechaza `javascript:`; un insert directo, no.
--  - **Clicks falsos.** `click_outs` es lo que se le factura a cada tienda.
--
-- Y aparte, `bump_rate_limit` se podía ejecutar como `anon`: cualquiera inflaba el contador
-- `admin-login:<ip>:<ventana>` de otra IP y el login del admin, que falla cerrado, quedaba
-- bloqueado para esa IP.
--
-- Es la lección de la auditoría del 3-sep de Córdoba Notebooks (doc 93 §8): el freno de un
-- formulario público tiene que estar en el **único** camino de escritura.
--
-- ## Lo que hace
--
-- Borra las cinco policies y le saca `bump_rate_limit` a `anon` y `authenticated`. Las rutas
-- del sitio escriben con `service_role` (server-only, `supabaseAdmin()`), que no depende de
-- policies. RLS sigue prendida en las cinco tablas, así que sin policy `anon` no inserta.
--
-- ## Orden de despliegue
--
-- **Primero el código, después esta migración.** Con el código viejo y esta migración
-- aplicada, los formularios devuelven error y los clicks salientes dejan de registrarse (el
-- redirect sigue andando). Y el código nuevo necesita `SUPABASE_SERVICE_ROLE_KEY` en el
-- runtime de Vercel, que ya hacía falta para el admin.

drop policy if exists "public insert alerts"       on price_alerts;
drop policy if exists "public insert clicks"       on click_outs;
drop policy if exists "public insert applications" on store_applications;
drop policy if exists "public insert model_notify" on model_notify;
drop policy if exists "public insert bulk_requests" on bulk_requests;

revoke execute on function bump_rate_limit(text, integer) from anon, authenticated;

-- Tamaño de la base, para vigilarlo desde el scraper.
--
-- Córdoba Notebooks estuvo 78 minutos caído el 5-sep porque el volumen de Postgres se llenó
-- (doc 107) y nadie miraba el uso. Acá el plan de Supabase tiene un techo de disco y la
-- base crece sola: `price_history` suma una fila por modelo por día, `click_outs` una por
-- click y `rate_limits` una por ventana por IP.
create or replace function tamano_base()
returns bigint
language sql
security definer
set search_path = public
as $$
  select pg_database_size(current_database());
$$;

-- `from public` NO alcanza, y esta es la trampa: Supabase tiene privilegios por defecto que
-- le dan `execute` a `anon` y `authenticated` **por nombre** sobre toda función nueva del
-- esquema `public`. Revocarle a `public` saca el grant de "todos los roles" pero deja el de
-- cada rol. La prueba de migraciones lo encontró con esta misma función.
revoke all on function tamano_base() from public, anon, authenticated;
grant execute on function tamano_base() to service_role;

-- La 0013 tiene la misma trampa: `purge_rate_limits` quedó ejecutable por `anon`. Borra sólo
-- ventanas vencidas, así que no es grave, pero es mantenimiento y no le corresponde a nadie
-- de afuera.
revoke all on function purge_rate_limits() from public, anon, authenticated;
grant execute on function purge_rate_limits() to service_role;

notify pgrst, 'reload schema';
