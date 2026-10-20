/**
 * Adaptador genérico para tiendas WooCommerce (WordPress).
 * Usa la Store API pública (JSON), sin parsear HTML:
 *   {base}/wp-json/wc/store/v1/products
 *
 * Sirve para cualquier tienda Woo agregándola en sources.mjs; no hace falta
 * un archivo por tienda. Captura precio, stock, imagen y atributos (que el
 * paso de matching usa para asignar el modelo canónico).
 */
import { politeFetch, parsePriceARS, juntarPaginas, totalDeclarado } from "../lib.mjs";

/**
 * @param {{ storeId: string, base: string, category?: string, maxPages?: number }} cfg
 * @returns {{ storeId: string, fetchListings: () => Promise<object[]> }}
 */
export function makeWooScraper({ storeId, base, category, maxPages = 20 }) {
  const root = base.replace(/\/$/, "");

  async function fetchListings() {
    const listings = [];
    const PASO = 50;

    /**
     * El largo del catálogo lo decide **el total que declara Woo** (cabecera `X-WP-Total`), no
     * el tamaño de una página. Ver `juntarPaginas` en `../lib.mjs` y el doc 141 de Córdoba
     * Notebooks: una página vacía en el medio se tomaba como el fin del catálogo, y el
     * resultado era un pedazo de la tienda quedándose con el precio de ayer sin que nada lo
     * dijera. Si Woo no manda la cabecera se confía en lo que llegó, igual que antes.
     */
    const products = await juntarPaginas({
      paso: PASO,
      maxItems: maxPages * PASO,
      etiqueta: storeId,
      async pedirPagina(desde, paso) {
        const page = Math.floor(desde / paso) + 1;
        const params = new URLSearchParams({ per_page: String(paso), page: String(page) });
        if (category) params.set("category", category);
        const url = `${root}/wp-json/wc/store/v1/products?${params}`;

        let res;
        try {
          res = await politeFetch(url);
        } catch (e) {
          // Si el slug de categoría no existe, reintentar sin filtro (sólo la primera página).
          if (page === 1 && category) {
            res = await politeFetch(`${root}/wp-json/wc/store/v1/products?per_page=${paso}&page=1`);
          } else {
            throw e;
          }
        }
        const cuerpo = await res.json();
        return { items: Array.isArray(cuerpo) ? cuerpo : [], total: totalDeclarado(res) };
      },
    });

    for (const p of products) {
      const minorUnit = p.prices?.currency_minor_unit ?? 2;
      const divisor = 10 ** minorUnit;
      const priceCash = parsePriceARS(Number(p.prices?.price ?? 0) / divisor);
      const priceList = parsePriceARS(
        Number(p.prices?.regular_price ?? p.prices?.price ?? 0) / divisor
      );
      if (!priceCash) continue;

      // Atributos → mapa {nombre: valor} para el matching
      const attrs = {};
      for (const a of p.attributes ?? []) {
        const key = String(a.name ?? "").toLowerCase().trim();
        const val = (a.terms ?? []).map((t) => t.name).join(", ");
        if (key && val) attrs[key] = val;
      }

      listings.push({
        id: `${storeId}-${p.id}`,
        storeId,
        modelId: null, // lo asigna matching.mjs
        url: p.permalink,
        titleRaw: p.name,
        priceList,
        priceCash,
        installments: null, // Woo no expone cuotas por API
        inStock: p.is_in_stock !== false,
        condition: /outlet/i.test(p.name)
          ? "outlet"
          : /usad[oa]|reacond/i.test(p.name)
            ? "refurb"
            : "new",
        image: p.images?.[0]?.src ?? null,
        attrs,
        lastSeenAt: new Date().toISOString(),
      });
    }

    return listings;
  }

  return { storeId, base, fetchListings };
}
