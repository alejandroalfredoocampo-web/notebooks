-- La tienda ve el conteo de sus clicks, no la fila cruda.
--
-- ## Qué estaba mal
--
-- La política `members read own clicks` (0012) filtra **por fila**: un miembro de la tienda
-- ve los `click_outs` de su tienda y ninguno de los de las demás, que es correcto. Lo que no
-- hace —porque una policy de RLS no puede— es filtrar **columnas**.
--
-- Cuando la 0014 agregó la atribución, esa policy pasó a dar acceso a datos que no son de la
-- tienda: `visitor_id` (el identificador que sigue a una persona 400 días entre visitas),
-- `user_agent`, `referrer`, y los `utm_*` / `click_id` / `first_touch_at`, que son **nuestro
-- costo de adquisición**. Un `select *` desde el portal, con la sesión de un miembro, se los
-- lleva todos. Es la misma clase de fuga que el informe de `insights` abierto y que el
-- `cpc_ars`: el dato suelto puede ser inocuo, el conjunto es el producto.
--
-- El panel nunca mostró nada de eso —`portal/page.tsx` pide `model_id, created_at`— pero lo
-- que protege a un dato no es la consulta que hace la aplicación, es lo que la base permite.
--
-- ## Cómo queda
--
-- Dos capas que dicen lo mismo, y por eso ninguna sola tiene que ser perfecta:
--
--  1. `authenticated` pierde el `select` sobre la tabla y lo recupera **columna por columna**,
--     sólo sobre las que son de la tienda. Un `select visitor_id` ahora es un error de
--     permisos, no una fila.
--  2. La vista `store_click_outs` expone exactamente esas columnas, así que el portal pide
--     una cosa con nombre en vez de acordarse de qué columnas no nombrar.
--
-- Las filas las sigue filtrando la policy de 0012, que no se toca.

-- ## Orden: esta migración va DESPUÉS de 0012 y 0014, y no se salta ninguna
--
-- De 0014 salen `device` y `bot`, que la vista nombra: sin ella, el `create view` falla y se
-- ve enseguida. De 0012 sale la policy que filtra las filas, y ese caso falla **callado y al
-- revés**: sin la policy, `authenticated` no tiene ninguna que le dé filas, así que después
-- del `revoke` de acá el panel de tráfico de cada tienda muestra **cero clicks** sin ningún
-- error. Si el panel queda en cero después de aplicar esto, lo que falta es 0012.

-- ---------------------------------------------------------------------------
-- La vista
-- ---------------------------------------------------------------------------

-- ⚠️ `security_invoker = on` NO ES OPCIONAL Y NO SE SACA.
--
-- Sin esa opción una vista de Postgres se ejecuta con los permisos de **quien la creó**, o
-- sea el dueño de la base, y eso **saltea la RLS de `click_outs` por completo**: cualquier
-- usuario autenticado leería los clicks de *todas* las tiendas. La vista se vería igual, la
-- consulta andaría igual, y el panel de cada tienda mostraría los números del mercado entero.
--
-- Con `on`, la vista corre con los permisos de quien la consulta y la policy de 0012 sigue
-- mandando. Requiere PostgreSQL 15 o superior. Si esta línea da error al correr la migración,
-- el arreglo **no** es borrarla: es no aplicar esta migración y avisar, porque una vista sin
-- ella es peor que el problema que vino a resolver.
create or replace view store_click_outs
with (security_invoker = on) as
select
  id,
  store_id,
  listing_id,
  model_id,
  price_at_click,
  device,
  bot,
  created_at
from click_outs;

comment on view store_click_outs is
  'Los click-outs como los ve la tienda: sin visitor_id, user_agent ni referrer (datos de la persona) y sin utm_*, click_id ni first_touch_at (nuestro costo de adquisición). Las filas las filtra la policy "members read own clicks" de 0012, que sigue aplicando porque la vista es security_invoker.';

-- `bot` se expone a propósito. Los clicks de crawlers no se facturan pero tampoco se borran
-- (ver 0014), así que la tienda tiene que poder ver la diferencia entre lo que se registró y
-- lo que se cobra. Un número que no se puede explicar es un número que se discute.

-- ---------------------------------------------------------------------------
-- Los permisos
-- ---------------------------------------------------------------------------

-- `anon` no lee clicks y nunca los leyó: sólo los inserta (policy "public insert clicks" de
-- 0001, que usa el redirect de /salir). El `revoke` es del select únicamente; el insert queda.
revoke select on click_outs from anon;

-- `authenticated` pierde el select entero y lo recupera sólo sobre las columnas de la tienda.
-- Este es el candado real: aunque alguien recreara la vista mal, o consultara la tabla directo,
-- las columnas sensibles no están.
revoke select on click_outs from authenticated;
grant select (id, store_id, listing_id, model_id, price_at_click, device, bot, created_at)
  on click_outs to authenticated;

grant select on store_click_outs to authenticated;

-- `service_role` no se toca: bypassea RLS y es el que usa el admin (`lib/adminData.ts`) para
-- contar clicks por tienda. Quitarle el select rompería el tablero de monetización.

-- ---------------------------------------------------------------------------
-- Que PostgREST se entere
-- ---------------------------------------------------------------------------
-- El portal no habla SQL: pide `/rest/v1/store_click_outs` y del otro lado hay PostgREST, que
-- sirve lo que tiene en su caché de esquema. Una vista recién creada existe en la base y
-- todavía no para la API, y el síntoma es un 404 sobre una vista que en el SQL Editor anda
-- perfecto — o sea, otra vez el panel de tráfico vacío, por una razón distinta a la de arriba.
-- Supabase suele recargar solo; esto lo fuerza y no cuesta nada.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Cómo verificar que quedó bien (con la sesión de un miembro de tienda, no con service_role)
-- ---------------------------------------------------------------------------
--   select count(*) from store_click_outs;              -- devuelve sólo los de su tienda
--   select visitor_id from click_outs limit 1;          -- debe fallar: permiso denegado
--   select * from click_outs limit 1;                   -- debe fallar por la misma razón
--   select store_id, count(*) from store_click_outs group by 1;  -- una sola fila: la suya
