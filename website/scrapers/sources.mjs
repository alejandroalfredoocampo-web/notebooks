/**
 * Fuentes de datos. Sumar una tienda del mismo tipo = agregar una línea acá,
 * sin escribir un scraper nuevo.
 *
 * Plataformas confirmadas por sondeo (2026-07):
 *   - WooCommerce Store API (JSON): Córdoba Notebooks, Max Tecno
 *   - VTEX Catalog API (JSON):      Frávega, Cetrogar, Naldo
 * A confirmar (HTML/JSON-LD o headless): Maximus, Venex, Musimundo, etc.
 */
import { makeWooScraper } from "./adapters/woocommerce.mjs";
import { makeVtexScraper } from "./adapters/vtex.mjs";

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
];
