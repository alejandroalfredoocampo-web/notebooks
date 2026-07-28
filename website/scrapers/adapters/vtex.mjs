/**
 * Adaptador genérico para tiendas VTEX (los grandes retailers argentinos:
 * Frávega, Cetrogar, Naldo, y probablemente Megatone/Garbarino/Musimundo).
 * Usa la Catalog API pública (JSON):
 *   {base}/api/catalog_system/pub/products/search/{path}?_from=&_to=
 *
 * VTEX pagina con _from/_to (máx. 50 por request, tope ~2500). Captura precio
 * y stock del primer seller, imagen y specs para el matching.
 */
import { politeFetch, parsePriceARS } from "../lib.mjs";

// Accesorios que la búsqueda por texto suele colar y no son notebooks
const ACCESSORY_RE =
  /funda|porta\s*notebook|estuche|maletin|sleeve|mochila|cargador|fuente|base\b|cooler|soporte|adaptador|memoria ram\b|disco |ssd\b|mouse|teclado|monitor|stylus|lapiz|pen\b/i;

/**
 * @param {{ storeId: string, base: string, categoryPaths?: string[], categoryPath?: string, ft?: string, maxItems?: number }} cfg
 *   categoryPaths: rutas de categoría VTEX, ej. ["informatica/notebooks"] (preferido).
 *   ft: fallback de búsqueda por texto libre si no se conocen las categorías.
 * @returns {{ storeId: string, fetchListings: () => Promise<object[]> }}
 */
export function makeVtexScraper({ storeId, base, categoryPaths, categoryPath, ft = "notebook", maxItems = 500 }) {
  const root = base.replace(/\/$/, "");
  const UA =
    "Mozilla/5.0 (compatible; NotebooksComArBot/1.0; +https://www.notebooks.com.ar/bot)";

  // Fuentes a recorrer: cada categoría (preferido) o el fallback de texto libre.
  const paths = categoryPaths ?? (categoryPath ? [categoryPath] : null);
  const queries = paths
    ? paths.map((p) => `search/${p.replace(/^\/|\/$/g, "")}?`)
    : [`search?ft=${encodeURIComponent(ft)}&`];

  async function fetchOne(query) {
    const listings = [];
    const step = 50;

    for (let from = 0; from < maxItems; from += step) {
      const to = from + step - 1;
      const url = `${root}/api/catalog_system/pub/products/${query}_from=${from}&_to=${to}`;

      let products;
      try {
        const res = await politeFetch(url, { headers: { "User-Agent": UA } });
        products = await res.json();
      } catch (e) {
        if (from === 0) throw e;
        break; // fin de resultados (VTEX devuelve 206/error al pasarse)
      }
      if (!Array.isArray(products) || products.length === 0) break;

      for (const p of products) {
        const item = p.items?.[0];
        const offer = item?.sellers?.[0]?.commertialOffer;
        const priceCash = parsePriceARS(offer?.Price ?? 0);
        if (!priceCash) continue;

        const name = p.productName ?? "";
        if (ACCESSORY_RE.test(name)) continue; // filtra accesorios

        const installmentsData = offer?.Installments?.reduce(
          (best, i) => (!best || i.NumberOfInstallments > best.NumberOfInstallments ? i : best),
          null
        );

        listings.push({
          id: `${storeId}-${p.productId}`,
          storeId,
          modelId: null,
          url: p.link ?? `${root}/${p.linkText}/p`,
          titleRaw: name,
          priceList: parsePriceARS(offer?.ListPrice ?? offer?.Price ?? 0),
          priceCash,
          installments: installmentsData
            ? {
                count: installmentsData.NumberOfInstallments,
                amount: parsePriceARS(installmentsData.Value),
              }
            : null,
          inStock: (offer?.AvailableQuantity ?? 0) > 0,
          condition: "new",
          image: item?.images?.[0]?.imageUrl ?? null,
          attrs: {
            marca: p.brand ?? "",
            // VTEX expone specs como propiedades de nombre variable
            ...Object.fromEntries(
              (p.allSpecifications ?? []).map((s) => [
                String(s).toLowerCase(),
                (p[s] ?? []).join(", "),
              ])
            ),
          },
          lastSeenAt: new Date().toISOString(),
        });
      }

      if (products.length < step) break;
    }

    return listings;
  }

  async function fetchListings() {
    const byId = new Map();
    for (const query of queries) {
      let items = [];
      try {
        items = await fetchOne(query);
      } catch (e) {
        // Si falla una categoría pero hay otras, seguir; si es la única, propagar.
        if (queries.length === 1) throw e;
        console.error(`  ⚠️  ${storeId}: categoría "${query}" falló (${e.message})`);
      }
      for (const l of items) byId.set(l.id, l); // dedupe por productId entre categorías
    }
    return [...byId.values()];
  }

  return { storeId, fetchListings };
}
