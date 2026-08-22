-- Atribución del click saliente.
--
-- El click-out es lo que el comparador le factura a la tienda, y hasta ahora se guardaba
-- con el `referrer` de la página anterior y nada más. Eso alcanza para contar clicks y no
-- alcanza para la única pregunta que decide dónde poner plata: **cuánto costó el click que
-- después se cobra**. Cuando alguien aprieta "Ir a la tienda" ya navegó tres páginas, así
-- que el referrer es este mismo sitio y el origen real se perdió tres páginas atrás.
--
-- Estas columnas las llena el redirect desde la cookie de atribución que escribe el
-- middleware (ver `src/lib/atribucion.ts`).

alter table click_outs add column if not exists visitor_id    text;
alter table click_outs add column if not exists utm_source    text;
alter table click_outs add column if not exists utm_medium    text;
alter table click_outs add column if not exists utm_campaign  text;
alter table click_outs add column if not exists click_id      text;
alter table click_outs add column if not exists device        text;
alter table click_outs add column if not exists first_touch_at timestamptz;

-- Los tres cortes que se van a pedir siempre: por campaña, por visitante y por tienda.
create index if not exists click_outs_campaign_idx on click_outs (utm_source, utm_campaign, created_at desc);
create index if not exists click_outs_visitor_idx  on click_outs (visitor_id, created_at desc);
create index if not exists click_outs_store_idx    on click_outs (store_id, created_at desc);

-- `bot` marca los clicks que NO se facturan.
--
-- No se descartan: un crawler que recorre el sitio genera clicks salientes reales, y
-- borrarlos deja un hueco inexplicable en el conteo. Guardarlos marcados permite mostrar
-- "1.240 clicks, 190 de bots" en vez de un número que la tienda va a discutir.
alter table click_outs add column if not exists bot boolean not null default false;
create index if not exists click_outs_facturables_idx on click_outs (store_id, created_at desc) where not bot;

comment on column click_outs.bot is
  'Click de un crawler o herramienta automatizada. No se factura, pero se guarda para poder explicar la diferencia entre clicks totales y facturables.';
