/**
 * Adaptador genérico para tiendas WooCommerce (WordPress).
 * Usa la Store API pública (JSON), sin parsear HTML:
 *   {base}/wp-json/wc/store/v1/products
 *
 * Sirve para cualquier tienda Woo agregándola en sources.mjs; no hace falta
 * un archivo por tienda. Captura precio, stock, imagen y atributos (que el
 * paso de matching usa para asignar el modelo canónico).
 */
import { politeFetch, parsePriceARS } from "../lib.mjs";

/**
 * @param {{ storeId: string, base: string, category?: string, maxPages?: number }} cfg
 * @returns {{ storeId: string, fetchListings: () => Promise<object[]> }}
 */
export function makeWooScraper({ storeId, base, category, maxPages = 20 }) {
  const root = base.replace(/\/$/, "");

  async function fetchListings() {
    const listings = [];
    let page = 1;

    while (page <= maxPages) {
      const params = new URLSearchParams({ per_page: "50", page: String(page) });
      if (category) params.set("category", category);
      const url = `${root}/wp-json/wc/store/v1/products?${params}`;

      let products;
      try {
        const res = await politeFetch(url);
        products = await res.json();
      } catch (e) {
        // Si el slug de categoría no existe, reintentar sin filtro (solo pág. 1)
        if (page === 1 && category) {
          const res = await politeFetch(
            `${root}/wp-json/wc/store/v1/products?per_page=50&page=1`
          );
          products = await res.json();
        } else {
          throw e;
        }
      }
      if (!Array.isArray(products) || products.length === 0) break;

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
      page++;
    }

    return listings;
  }

  return { storeId, fetchListings };
}
