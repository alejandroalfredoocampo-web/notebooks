/**
 * Fuentes de datos. Sumar una tienda del mismo tipo = agregar una línea acá,
 * sin escribir un scraper nuevo.
 *
 * Plataformas confirmadas por sondeo (2026-07 / 2026-08):
 *   - WooCommerce Store API (JSON): Córdoba Notebooks, Max Tecno
 *   - VTEX Catalog API (JSON):      Frávega, Cetrogar, Naldo
 *   - Qloud (JSON-LD / HTML):       Gezatek, Mexx
 *   - osCommerce custom (HTML):     Venex
 *
 * No scrapeadas por ahora (ver BACKLOG):
 *   - fullh4rd: bloquea nuestro bot con Cloudflare (403). NO se evade: requiere
 *     acuerdo comercial / feed. Igual criterio para Compragamer, Garbarino, etc.
 *   - maximus: viable pero frágil (PageMethods de GlobalBluePoint: requiere cookie
 *     de sesión + POST con JSON doble-encodeado y labels versionados). Receta
 *     documentada en el BACKLOG; 19 notebooks.
 *   - musimundo (SPA), backup (robots prohíbe /Home/*): a confirmar.
 */
import { makeWooScraper } from "./adapters/woocommerce.mjs";
import { makeVtexScraper } from "./adapters/vtex.mjs";
import { makeQloudScraper } from "./adapters/qloud.mjs";
import { makeVenexScraper } from "./adapters/venex.mjs";

export const SOURCES = [
  // --- WooCommerce ---------------------------------------------------------
  makeWooScraper({
    storeId: "cordobanotebooks",
    base: "https://cordobanotebooks.com.ar",
    category: "notebooks",
  }),
  makeWooScraper({
    storeId: "maxtecno",
    base: "https://maxtecno.com.ar",
    category: "notebooks",
  }),

  // --- VTEX ----------------------------------------------------------------
  // Rutas de categoría confirmadas contra el árbol público de cada tienda
  // (/api/catalog_system/pub/category/tree). Trae solo notebooks, no accesorios.
  makeVtexScraper({
    storeId: "fravega",
    base: "https://www.fravega.com",
    categoryPaths: ["informatica/notebooks", "informatica/gaming-pc/notebooks-gamers"],
  }),
  makeVtexScraper({
    storeId: "cetrogar",
    base: "https://www.cetrogar.com.ar",
    categoryPaths: ["tecnologia/computacion/notebooks"],
  }),
  makeVtexScraper({
    storeId: "naldo",
    base: "https://www.naldo.com.ar",
    categoryPaths: ["tecnologia/informatica/notebook"],
  }),

  // --- Qloud (JSON-LD en el listado / HTML) --------------------------------
  // Verificado 2026-08-05: 1 request por categoría, sin JS. robots.txt permite el
  // catálogo (los Disallow son de carrito/cuenta/admin y de query params de orden,
  // que no usamos). Precios cruzados contra la ficha del producto: 4/4 exactos.
  makeQloudScraper({
    storeId: "gezatek",
    // ojo: www.gezatek.com.ar hace 301 al host sin www
    base: "https://gezatek.com.ar",
    categoryPaths: ["notebooks-y-accesorios/notebooks/"],
  }),
  makeQloudScraper({
    storeId: "mexx",
    base: "https://www.mexx.com.ar",
    categoryPaths: ["productos-rubro/notebooks/"],
    listAll: true, // ?all=1 → la categoría completa en 1 request (41 productos)
  }),

  // --- Venex (osCommerce custom) -------------------------------------------
  // Verificado 2026-08-05: `?limit=96` trae las 75 notebooks en 1 request.
  // Charset ISO-8859-1 (el adaptador lo decodifica). robots.txt: solo Disallow /admin.
  makeVenexScraper({
    storeId: "venex",
    base: "https://www.venex.com.ar",
    categoryPaths: ["notebooks"],
  }),
];
