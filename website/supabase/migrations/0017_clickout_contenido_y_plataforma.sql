-- El click saliente guarda `utm_content`, `utm_term` y la plataforma del click id.
--
-- ## Por qué faltaban
--
-- La 0014 eligió cuatro campos de campaña (`utm_source`, `utm_medium`, `utm_campaign`,
-- `click_id`) porque son los que arma un informe "por campaña". La cookie de atribución
-- (`src/lib/atribucion.ts`) captura **siete**, así que los otros tres se leían del visitante
-- y se tiraban en el `insert`.
--
-- ## Por qué importa, medido en Córdoba Notebooks
--
-- El 22/09/2026 CN midió 30 días de su propia atribución (`a70b5c9e`): **3.083 visitantes que
-- se estaban contando como Meta Ads eran el link de la bio de Instagram**, tráfico gratis.
-- Casi la mitad de ese canal. La consecuencia no es un número feo en un tablero: las ventas de
-- ese tráfico se le sumaban a la campaña paga, y su costo por adquisición parecía mucho mejor
-- de lo que era — o sea, la plata se reparte mirando un número inflado.
--
-- Lo que separa un caso del otro es **`utm_content=link_in_bio`**, la etiqueta que Instagram
-- le agrega sólo al link de la bio. `fbclid` no alcanza: Meta lo pega también a los links
-- orgánicos, así que "vino con fbclid" no prueba que se haya pagado.
--
-- Acá ese corte hoy es **imposible de hacer, incluso a futuro**: el dato llega en la cookie y
-- no se guarda. Y a diferencia de un reporte, esto no se arregla después — lo que no se
-- escribió el día del click no se puede reconstruir. Por eso la columna va ahora, aunque el
-- informe que la va a leer todavía no exista.
--
-- `click_plataforma` evita tener que re-deducir la plataforma del prefijo del `click_id`, que
-- es exactamente el parche que CN tuvo que dejar para sus filas viejas.

alter table click_outs add column if not exists utm_content      text;
alter table click_outs add column if not exists utm_term         text;
alter table click_outs add column if not exists click_plataforma text;

comment on column click_outs.utm_content is
  'Variante del aviso. Con Meta es además lo único que distingue el link de la bio (link_in_bio, orgánico) de un anuncio pago: fbclid viene en los dos.';
comment on column click_outs.click_plataforma is
  'google | meta | tiktok | microsoft. Qué plataforma puso el click id. NO significa "pago": Meta pega fbclid también en los links orgánicos.';

-- ## Sin índice, a propósito
--
-- Los tres cortes que se piden hoy (campaña, visitante, tienda) ya tienen el suyo en la 0014.
-- Un índice para un informe que todavía no existe es costo de escritura en la tabla más
-- caliente del sitio a cambio de nada.

-- ## Estas columnas NO se le abren a la tienda
--
-- La 0015 le sacó a `authenticated` el `select` sobre la tabla y se lo devolvió **columna por
-- columna**. Por eso acá no hay ningún `grant`: una columna nueva nace sin permiso, que es lo
-- correcto. Son nuestro costo de adquisición, no dato de la tienda — la misma razón por la que
-- la 0015 le sacó `visitor_id` y los `utm_*`. La vista `store_click_outs` tampoco las nombra.
