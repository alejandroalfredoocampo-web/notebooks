/**
 * Adaptador para tiendas sobre Medusa v2 (Store API).
 *
 *   GET {apiBase}/store/products?limit=…&offset=…&order=created_at&region_id=…&fields=…
 *   cabecera: x-publishable-api-key
 *
 * ## Por qué existe
 *
 * Córdoba Notebooks dejó WooCommerce en agosto de 2026 y pasó a Medusa. El adaptador de Woo
 * siguió apuntando a `/wp-json/wc/store/v1/products`, que desde entonces da 404, y el runner
 * conservaba los datos anteriores en silencio: la tienda que la reunión del 20-oct quería
 * destacar era la única sin precios de hoy.
 *
 * ## Qué lee, medido contra la API real el 21-oct-2026
 *
 * - El precio de contado es **el de la variante** (`calculated_price.calculated_amount`, en
 *   pesos enteros), que es lo que Medusa le cobra al carrito. `metadata.precioEfectivo` es una
 *   foto de la migración y sólo sirve de respaldo. Es la misma decisión que tomó el storefront
 *   (`src/lib/medusa.ts`), y por la misma razón: 4 de 47 productos habían divergido.
 * - `metadata.precioLista` es el ancla de las cuotas; `metadata.cuotas` es `[{ n, monto }]`.
 * - `metadata.enStock === false` es "sin stock". `metadata.condiciones` trae `outlet`,
 *   `usado`, `oferta`, `preventa`.
 * - `metadata.oculto` marca productos comprables por link pero fuera de todo listado: no se
 *   indexan.
 * - Las categorías vienen por `handle`; el filtro por `categoryHandle` se hace acá y no con
 *   `category_id[]`, porque el id no dice nada y el handle sí.
 * - La ficha pública es `{base}/producto/{handle}`, el mismo esquema que tenía el WordPress.
 *
 * La publishable key **es pública por diseño**: viaja en el bundle del navegador de la
 * tienda. Sólo habilita la Store API de lectura. Igual se puede pisar por entorno.
 */
import { politeFetch, parsePriceARS, juntarPaginas } from "../lib.mjs";

/**
 * @param {{
 *   storeId: string,
 *   base: string,
 *   apiBase: string,
 *   publishableKey: string,
 *   regionId?: string,
 *   categoryHandle?: string,
 *   maxPages?: number,
 * }} cfg
 * @returns {{ storeId: string, base: string, fetchListings: () => Promise<object[]> }}
 */
export function makeMedusaScraper({
  storeId,
  base,
  apiBase,
  publishableKey,
  regionId,
  categoryHandle,
  maxPages = 10,
}) {
  const root = base.replace(/\/$/, "");
  const api = apiBase.replace(/\/$/, "");
  const key = process.env[`MEDUSA_PUBLISHABLE_KEY_${storeId.toUpperCase()}`] ?? publishableKey;
  const headers = { "x-publishable-api-key": key, accept: "application/json" };

  async function resolverRegion() {
    if (regionId) return regionId;
    const res = await politeFetch(`${api}/store/regions`, { headers });
    const { regions } = await res.json();
    const ars = (regions ?? []).find((r) => r.currency_code === "ars") ?? regions?.[0];
    if (!ars?.id) throw new Error(`${storeId}: la API no declara ninguna región`);
    return ars.id;
  }

  async function fetchListings() {
    const region = await resolverRegion();
    const PASO = 100;

    const products = await juntarPaginas({
      paso: PASO,
      maxItems: maxPages * PASO,
      etiqueta: storeId,
      async pedirPagina(desde, paso) {
        const params = new URLSearchParams({
          limit: String(paso),
          offset: String(desde),
          // Sin orden explícito el orden entre páginas no está garantizado y un producto se
          // repite o falta al paginar. Lección del storefront.
          order: "created_at",
          region_id: region,
          fields:
            "id,title,handle,status,thumbnail,metadata,*variants,*variants.calculated_price,*categories",
        });
        const res = await politeFetch(`${api}/store/products?${params}`, { headers });
        const cuerpo = await res.json();
        // Medusa declara el total en el cuerpo (`count`), no en una cabecera.
        return { items: Array.isArray(cuerpo.products) ? cuerpo.products : [], total: cuerpo.count };
      },
    });

    const ahora = new Date().toISOString();
    const listings = [];
    for (const p of products) {
      const l = mapearProducto(p, { storeId, root, categoryHandle, ahora });
      if (l) listings.push(l);
    }
    return listings;
  }

  return { storeId, base, fetchListings };
}

/**
 * Un producto de la Store API → una publicación del comparador, o `null` si no se indexa.
 *
 * Es una función aparte, sin red, para poder probarla con los casos que importan: precio de la
 * variante contra precio de la metadata, producto oculto, categoría ajena, sin stock.
 *
 * @param {object} p El producto tal como lo devuelve `GET /store/products`.
 * @param {{ storeId: string, root: string, categoryHandle?: string, ahora?: string }} ctx
 */
export function mapearProducto(p, { storeId, root, categoryHandle, ahora = new Date().toISOString() }) {
  const md = p?.metadata ?? {};
  if (p?.status && p.status !== "published") return null;
  if (md.oculto === true || md.oculto === "true") return null;

  const handles = (p?.categories ?? []).map((c) => String(c?.handle ?? ""));
  if (categoryHandle && !handles.includes(categoryHandle)) return null;

  const variante = p?.variants?.[0];
  const deVariante = Number(variante?.calculated_price?.calculated_amount);
  const priceCash = parsePriceARS(deVariante > 0 ? deVariante : Number(md.precioEfectivo));
  if (!priceCash) return null;

  const lista = parsePriceARS(Number(md.precioLista));
  const priceList = lista && lista > priceCash ? lista : null;

  // La cuota más larga que ofrece la tienda: es la que compara el sitio ("mejor en cuotas").
  let installments = null;
  if (Array.isArray(md.cuotas)) {
    const mejor = md.cuotas
      .map((c) => ({ count: Number(c?.n), amount: parsePriceARS(Number(c?.monto)) }))
      .filter((c) => Number.isInteger(c.count) && c.count > 1 && c.amount)
      .sort((a, b) => b.count - a.count)[0];
    if (mejor) installments = mejor;
  }

  const condiciones = Array.isArray(md.condiciones) ? md.condiciones.map((c) => String(c).toLowerCase()) : [];
  const condition = condiciones.includes("outlet")
    ? "outlet"
    : condiciones.includes("usado") || /usad[oa]|reacond/i.test(p.title ?? "")
      ? "refurb"
      : "new";

  // `specs` es `[{ label, value }]`; el matching lee un mapa {nombre: valor}, como con Woo.
  const attrs = {};
  if (md.marca) attrs.marca = String(md.marca);
  for (const s of Array.isArray(md.specs) ? md.specs : []) {
    const k = String(s?.label ?? "").toLowerCase().trim();
    const v = String(s?.value ?? "").trim();
    if (k && v) attrs[k] = v;
  }

  return {
    id: `${storeId}-${p.id}`,
    storeId,
    modelId: null, // lo asigna matching.mjs
    url: `${root}/producto/${p.handle}`,
    titleRaw: p.title,
    priceList,
    priceCash,
    installments,
    inStock: md.enStock !== false,
    condition,
    image: p.thumbnail ?? null,
    attrs,
    lastSeenAt: ahora,
  };
}
