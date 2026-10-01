/**
 * Utilidades comunes para scrapers.
 */
export const USER_AGENT =
  "NotebooksComArBot/1.0 (+https://www.notebooks.com.ar/bot)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastRequest = 0;
/** GET con rate-limit global de 1 req/seg y user-agent identificable. */
export async function politeFetch(url, options = {}) {
  const wait = Math.max(0, lastRequest + 1000 - Date.now());
  if (wait) await sleep(wait);
  lastRequest = Date.now();
  const res = await fetch(url, {
    ...options,
    headers: { "User-Agent": USER_AGENT, ...(options.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res;
}

/**
 * Valida que las credenciales del entorno sirvan para ESCRIBIR en Supabase.
 * Aborta con un mensaje claro si falta la key o si pasaron la anon/publishable
 * (que respeta RLS → los INSERT fallan y los DELETE borran 0 filas EN SILENCIO).
 * Llamarla al inicio de todo script que escriba.
 */
export function requireServiceRole() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("\n❌ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.\n");
    process.exit(1);
  }
  if (/^sb_publishable_/.test(key) || key === process.env.SUPABASE_ANON_KEY) {
    console.error(`
❌ La key de SUPABASE_SERVICE_ROLE_KEY es la ANON/PUBLISHABLE, no la service_role.

   Con esta key el script NO puede escribir: los INSERT fallan con
   "violates row-level security policy" y los DELETE borran 0 filas sin avisar.

   Copiá la correcta en:  Supabase → Project Settings → API Keys → "service_role" (secret)
   Empieza con  sb_secret_...  o es un JWT largo  eyJ...
   (la que empieza con sb_publishable_ es la pública, va en el navegador)
`);
    process.exit(1);
  }
  // Devuelve las claves con el MISMO nombre que usan los scripts, para que
  // `const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireServiceRole()`
  // funcione sin renombrar nada.
  return { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, url, key };
}

/** Normaliza un precio argentino ("$1.234.567,89" | 1234567) a entero ARS. */
export function parsePriceARS(raw) {
  if (typeof raw === "number") return Math.round(raw);
  const clean = String(raw)
    .replace(/[^\d.,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Parseo básico de specs desde el título de una publicación.
 * Devuelve { cpu, ramGb, storageGb, screenSizeIn } con null donde no matchea.
 * El matching real usa esto + diccionarios; ver README.
 */
export function parseSpecsFromTitle(title) {
  const t = title.toUpperCase();
  const cpu =
    t.match(/(?:INTEL\s*)?CORE\s*(?:ULTRA\s*\d|I[3579])[- ]?\w*/)?.[0] ??
    t.match(/RYZEN\s*[3579]\s*\w*/)?.[0] ??
    t.match(/\bM[1-4](?:\s*(?:PRO|MAX))?\b/)?.[0] ??
    null;
  const ramGb = Number(t.match(/(\d{1,2})\s*GB(?:\s*(?:RAM|DDR))?/)?.[1]) || null;
  const storage =
    t.match(/(\d+)\s*TB/) ? Number(t.match(/(\d+)\s*TB/)[1]) * 1000 :
    Number(t.match(/(\d{3,4})\s*GB\s*(?:SSD|NVME)?/)?.[1]) || null;
  const screenSizeIn = Number(t.match(/(\d{2}[.,]?\d?)\s*(?:"|”|PULG)/)?.[1]?.replace(",", ".")) || null;
  return { cpu, ramGb, storageGb: storage, screenSizeIn };
}

/**
 * Todas las filas de una consulta, y no las primeras mil.
 *
 * PostgREST corta cada respuesta en `max-rows` (1.000 por defecto en Supabase) sin error. En el
 * scraper eso no es un dato de menos, es una corrida rota: si `listings` existentes vuelve
 * truncado, las publicaciones que no entraron parecen nuevas, el insert choca con la clave
 * primaria y el scrape entero falla. Y el snapshot de `price_history` se calcularía sobre las
 * primeras mil confirmadas. Misma función que `todasLasFilas` en `src/lib/data.ts`.
 *
 *   const { data, error } = await todasLasFilas((d, h) =>
 *     sb.from("listings").select("id", { count: "exact" }).order("id").range(d, h));
 *
 * La consulta tiene que pedir `count: "exact"` y tener un orden estable.
 */
export async function todasLasFilas(consulta) {
  const PAGINA = 1000;
  const filas = [];
  // El total declarado **no baja**: se guarda el más alto que PostgREST haya dicho. Hoy manda
  // el mismo `count` en cada página, así que esto no cambia ningún resultado; está escrito así
  // porque es el agujero que Córdoba Notebooks pagó dos veces en el mismo bucle (tanda 95, doc
  // 141), donde el total se pisaba con el de la última página y el control de abajo comparaba
  // contra el número chico y pasaba de largo. Un contador que se puede pisar no es un control.
  let declarado = null;
  while (filas.length < (declarado ?? Infinity)) {
    const { data, error, count } = await consulta(filas.length, filas.length + PAGINA - 1);
    if (error) return { data: null, error };
    if (count != null) declarado = declarado == null ? count : Math.max(declarado, count);
    if (!data?.length) break;
    filas.push(...data);
  }
  if (declarado != null && filas.length < declarado) {
    return { data: null, error: { message: `lectura incompleta: ${filas.length} de ${declarado} filas` } };
  }
  return { data: filas, error: null };
}

/* ------------------------------------------------------------------ paginación */

/**
 * Se tiró un catálogo a medias en vez de devolverlo.
 *
 * Es su propia clase para que el runner pueda distinguirla de "la tienda no contestó": las
 * dos conservan los datos anteriores, pero sólo esta significa "la tienda contestó y nos
 * mintió el largo".
 */
export class ErrorCatalogoIncompleto extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = "ErrorCatalogoIncompleto";
  }
}

/**
 * Junta las páginas de un catálogo paginado y **exige que esté completo**.
 *
 * ## Por qué existe
 *
 * Es el arreglo de Córdoba Notebooks del 26 y el 28/09 (tandas 94 y 95, doc
 * `141-catalogo-de-dux-a-medias.md`), portado. Allá el bucle que paginaba el catálogo de Dux
 * cortaba con `if (pagina.length === 0) break`, así que **una página vacía en el medio se
 * tomaba como el fin del catálogo**: el 26/09 se usó un catálogo de 200 ítems de 512 y un
 * pedido falló por un producto que sí existía. Dos días después, con esa guarda puesta, pasó
 * otra vez por una segunda razón — **la última página venía sin `paging` y pisaba el total
 * declarado con su propio tamaño**, así que el control de completitud comparaba contra el
 * número chico y pasaba de largo.
 *
 * ## Por qué un comparador lo necesita igual
 *
 * Acá no hay pedidos que fallen, y por eso es **peor**: `run.mjs` no borra las publicaciones
 * que no volvieron a aparecer (sólo inserta las nuevas y actualiza las vistas), así que un
 * catálogo a medias no se nota en ninguna parte. Lo que deja es un pedazo de la tienda con el
 * precio de ayer, y el log de la corrida dice `✅ fravega: 150 publicaciones` en verde. El
 * producto de este sitio es mandar a alguien a una tienda **al precio que le mostramos**: un
 * precio viejo es un click facturado que termina en una página que dice otra cosa.
 *
 * Los tres agujeros que tenían los adaptadores, todos del mismo bucle:
 *
 * 1. una página vacía en el medio terminaba el catálogo;
 * 2. una página corta (30 de 50) también, aunque el offset avanzaba igual;
 * 3. en VTEX, un error de red en la página 3 de 10 hacía `break` y la corrida seguía **en
 *    verde** con el 30 % del catálogo.
 *
 * ## El contrato
 *
 * `pedirPagina(desde, paso)` devuelve `{ items, total }`. `total` es el largo que declara la
 * tienda (la cabecera `resources` de VTEX, `X-WP-Total` de WooCommerce) o `null` si no lo
 * dice. Reglas:
 *
 * - **El total declarado nunca baja.** Se guarda el más alto que la tienda haya dicho, que es
 *   exactamente lo que faltaba en la tanda 95.
 * - **Una página vacía o corta en el medio no termina el catálogo** mientras falten ítems
 *   para llegar al total declarado.
 * - **Si la tienda declaró un total y llegan menos ítems, tira `ErrorCatalogoIncompleto`** en
 *   vez de devolver lo que juntó. El `catch` por tienda de `run.mjs` conserva los datos
 *   anteriores, que es la respuesta correcta: el precio de ayer completo es mejor que medio
 *   catálogo de hoy y medio de ayer sin saber cuál es cuál.
 * - **Si la tienda nunca declaró un total, se confía en lo que llegó** y una página vacía
 *   corta el bucle: no hay con qué controlar y es el comportamiento de antes. Igual que allá.
 *
 * Recibe el "pedí esta página" por parámetro **a propósito**: es lo que permite probar los
 * casos feos sin red, que es la lección que dejó escrita el doc 141 — este bucle se tocó dos
 * veces en dos días y las dos veces el síntoma fue "un producto que existe no existe". Un
 * bucle de paginación con un contador que se puede pisar no se arregla mirándolo.
 *
 * @param {object} cfg
 * @param {(desde: number, paso: number) => Promise<{ items: unknown[], total?: number|null }>} cfg.pedirPagina
 * @param {number} [cfg.paso] Tamaño de página.
 * @param {number} [cfg.maxItems] Techo duro de ítems a traer.
 * @param {string} [cfg.etiqueta] Para el mensaje de error.
 * @returns {Promise<unknown[]>}
 */
export async function juntarPaginas({ pedirPagina, paso = 50, maxItems = 500, etiqueta = "catálogo" }) {
  const items = [];
  let totalDeclarado = null;

  for (let desde = 0; desde < maxItems; desde += paso) {
    const { items: pagina, total } = await pedirPagina(desde, paso);
    const llegaron = Array.isArray(pagina) ? pagina : [];

    // El total declarado nunca baja: una página sin `paging` (o con un total más chico) no
    // puede pisar lo que la tienda ya dijo. Tanda 95.
    //
    // Ojo con `Number(null)`, que es **0** y no `NaN`: tomar eso como un total declarado de
    // cero haría que cualquier catálogo pase como completo, que es justo el control que esto
    // viene a poner. "No lo dijo" tiene que quedar en `null`.
    if (total != null && total !== "") {
      const declarado = Number(total);
      if (Number.isFinite(declarado) && declarado > 0) {
        totalDeclarado = totalDeclarado == null ? declarado : Math.max(totalDeclarado, declarado);
      }
    }

    items.push(...llegaron);

    if (totalDeclarado == null) {
      // Sin total declarado no hay con qué controlar: una página vacía es el único fin de
      // catálogo que existe, y una corta también.
      if (llegaron.length === 0 || llegaron.length < paso) break;
      continue;
    }

    // Con total declarado, el fin lo decide el total y no el tamaño de una página: una vacía
    // o corta en el medio es un agujero, y el offset sigue avanzando. Tanda 94.
    if (items.length >= totalDeclarado) break;
  }

  if (totalDeclarado != null && items.length < Math.min(totalDeclarado, maxItems)) {
    throw new ErrorCatalogoIncompleto(
      `${etiqueta}: llegaron ${items.length} de los ${totalDeclarado} ítems que declara la tienda`,
    );
  }

  return items;
}

/**
 * El total que declara la respuesta, de las cabeceras que usan las dos APIs que scrapeamos.
 *
 * - **VTEX** manda `resources: 0-49/512` (y a veces `Content-Range: resources 0-49/512`).
 * - **WooCommerce Store API** manda `X-WP-Total: 512`.
 *
 * Devuelve `null` si no viene ninguna, que es el caso en que `juntarPaginas` confía en lo que
 * llegó en vez de inventar un control.
 */
export function totalDeclarado(res) {
  // `Number(null)` es 0, no `NaN`: sin este guardia una respuesta sin la cabecera declaraba un
  // total de cero y cualquier catálogo pasaba como completo.
  const xwp = res.headers?.get?.("x-wp-total");
  if (xwp != null && xwp !== "" && Number.isFinite(Number(xwp)) && Number(xwp) > 0) return Number(xwp);
  const rango = res.headers?.get?.("resources") ?? res.headers?.get?.("content-range") ?? "";
  const m = /\/\s*(\d+)\s*$/.exec(String(rango));
  if (m && Number(m[1]) > 0) return Number(m[1]);
  return null;
}
