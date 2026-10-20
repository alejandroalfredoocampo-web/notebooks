-- El click saliente guarda el **id** de la campaña (`utm_id`), no sólo su nombre.
--
-- ## Por qué
--
-- Portado de Córdoba Notebooks (2046e18b, 24/09/2026): la plantilla de UTMs de la agencia
-- mandaba `utm_id` y el toque lo descartaba, porque sólo leía los cinco `utm_` clásicos y los
-- click ids.
--
-- Acá cierra una rotura que este proyecto ya pagó. La ronda del 24-sep arregló que un
-- `utm_campaign` con corchetes (`[TOF] Notebooks`, `Victus [video]`) se perdiera entero y la
-- visita quedara como "sin campaña". Ese arreglo es correcto, pero el problema de fondo es que
-- el único corte por campaña que teníamos era **el nombre**: texto que alguien escribe, que se
-- reescribe a mitad de mes y que hay que parsear. `utm_id` no cambia cuando renombran la
-- campaña y no tiene nada que escapar.
--
-- Lo mandan tanto Google Ads como Meta, así que no es de una plataforma sola.
--
-- ## Por qué la columna va ahora
--
-- El mismo argumento de la 0017, que sigue siendo el que manda: **lo que no se escribe el día
-- del click no se reconstruye después**. El informe que la va a leer todavía no existe; la
-- columna sí tiene que existir antes del primer click que la necesite.

alter table click_outs add column if not exists campana_id text;

comment on column click_outs.campana_id is
  'utm_id: el id de la campaña, no su nombre. Sobrevive a que la renombren; el nombre (utm_campaign) no. Lo mandan Google Ads y Meta.';

-- ## Sin índice, a propósito
--
-- Igual que la 0017: los cortes que se piden hoy (campaña por nombre, visitante, tienda) ya
-- tienen el suyo en la 0014. Un índice para un informe que todavía no existe es costo de
-- escritura en la tabla más caliente del sitio a cambio de nada.

-- ## Esta columna NO se le abre a la tienda
--
-- La 0015 le sacó a `authenticated` el `select` sobre la tabla y se lo devolvió columna por
-- columna. Por eso acá no hay ningún `grant`: una columna nueva nace sin permiso, que es lo
-- correcto. Es nuestro costo de adquisición, no dato de la tienda. La vista `store_click_outs`
-- tampoco la nombra.
