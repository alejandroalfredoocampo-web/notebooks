/**
 * Adaptador genérico para tiendas sobre la plataforma **Qloud** (SaaS argentino,
 * tema "mink-kit"): Gezatek, Mexx y probablemente otras tiendas AR.
 *
 * No hay API de catálogo, así que usa dos estrategias sobre el HTML del listado
 * (1 request por categoría, sin JavaScript ni headless):
 *
 *   1. **JSON-LD** (`<script type="application/ld+json">` con `CollectionPage` →
 *      `mainEntity.itemListElement[].item`): nombre, precio, url, imagen, stock y
 *      sku ya normalizados. Es el camino preferido (contrato estable).
 *   2. **Fallback HTML**: tarjetas `div.card.card-ecommerce`. Se usa cuando la
 *      tienda no publica JSON-LD en el listado (caso Mexx).
 *
 * ⚠️ Precios — dos formatos distintos, NO mezclar:
 *   - JSON-LD / `data-precio`: decimal con punto ("999990.00") → `Number()`.
 *   - HTML formateado ("$699.939"): punto = separador de MILES → `parsePriceARS()`.
 *     Pasar "999990.00" por parsePriceARS daría 99999000 (100× más).
 *
 * Nota de stock: estas tiendas parecen **ocultar** lo agotado en vez de marcarlo.
 * El pipeline trata la desaparición de una publicación como falta de stock, así que
 * acá se reporta `inStock` según lo que declare el listado (por defecto, true).
 */
import { politeFetch, parsePriceARS } from "../lib.mjs";

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
  ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü", deg: "°",
};

/** Des-escapa entidades HTML y normaliza espacios. */
export function decodeHtml(s) {
  return String(s ?? "")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrae todos los bloques JSON-LD parseables de un HTML. */
function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      out.push(JSON.parse(m[1].trim()));
    } catch {
      /* bloque inválido: ignorar */
    }
  }
  return out;
}

/** Busca recursivamente arrays `itemListElement` en los bloques JSON-LD. */
function collectProductsFromJsonLd(html) {
  const products = [];
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (Array.isArray(node.itemListElement)) {
      for (const el of node.itemListElement) {
        const item = el?.item ?? el;
        if (item && (item["@type"] === "Product" || item.offers)) products.push(item);
      }
    }
    for (const v of Object.values(node)) visit(v);
  };
  visit(extractJsonLd(html));
  return products;
}

const firstMatch = (s, re) => s.match(re)?.[1] ?? null;

/** Parsea las tarjetas de producto del HTML (fallback sin JSON-LD). */
function parseCards(html) {
  // Cada tarjeta arranca en un div con clase "productos" o "card-ecommerce".
  const chunks = html.split(/<div[^>]+class=["'][^"']*(?:productos|card card-ecommerce)[^"']*["']/i).slice(1);
  const out = [];
  for (const chunk of chunks) {
    // El link del título es el ancla dentro de un h4.card-title
    const titleBlock = chunk.match(/<h4[^>]+class=["'][^"']*card-title[^"']*["'][\s\S]{0,400}?<\/h4>/i)?.[0] ?? chunk;
    const url = firstMatch(titleBlock, /<a[^>]+href=["']([^"']+)["']/i);
    const name = decodeHtml(
      (titleBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "").replace(/<[^>]+>/g, "")
    );
    if (!url || !name) continue;

    // Precio: preferir data-precio (número limpio); si no, texto formateado.
    const dataPrecio = firstMatch(chunk, /data-precio=["']([\d.]+)["']/i);
    let priceCash = null;
    if (dataPrecio) {
      priceCash = Math.round(Number(dataPrecio));
    } else {
      const raw = firstMatch(chunk, /<b[^>]*>\s*\$?\s*([\d.,]+)\s*<\/b>/i);
      priceCash = raw ? parsePriceARS(raw) : null;
    }
    if (!priceCash) continue;

    const image = firstMatch(chunk, /<img[^>]+src=["']([^"']+)["']/i);
    // Código de artículo/SKU: "Art: 10075" o span.articulo_field
    const sku =
      firstMatch(chunk, /Art[:.]?\s*(\d+)/i) ??
      decodeHtml(firstMatch(chunk, /class=["'][^"']*articulo_field[^"']*["'][^>]*>([\s\S]*?)</i) ?? "") ??
      null;
    const outOfStock = /sin\s*stock|agotado|out\s*of\s*stock/i.test(chunk);

    out.push({ name, url, priceCash, image, sku: sku || null, inStock: !outOfStock });
  }
  return out;
}

/**
 * @param {{ storeId: string, base: string, categoryPaths: string[], listAll?: boolean }} cfg
 *   - categoryPaths: rutas de categoría relativas (ej. "productos-rubro/notebooks/")
 *   - listAll: agrega `?all=1` para traer la categoría completa en 1 request (Mexx)
 * @returns {{ storeId: string, fetchListings: () => Promise<object[]> }}
 */
export function makeQloudScraper({ storeId, base, categoryPaths = [], listAll = false }) {
  const root = base.replace(/\/$/, "");

  async function fetchListings() {
    const listings = [];
    const seen = new Set();

    for (const path of categoryPaths) {
      const url = `${root}/${String(path).replace(/^\//, "")}${listAll ? "?all=1" : ""}`;
      let html;
      try {
        const res = await politeFetch(url);
        html = await res.text();
      } catch (e) {
        console.warn(`  · ${storeId}: no se pudo leer ${url} (${e.message})`);
        continue;
      }

      // 1) JSON-LD (preferido)
      const jsonLd = collectProductsFromJsonLd(html);
      const items = jsonLd.length
        ? jsonLd.map((p) => {
            const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
            // JSON-LD trae el precio como decimal con punto → Number, NO parsePriceARS
            const priceCash = Math.round(Number(offer?.price ?? 0));
            const avail = String(offer?.availability ?? "");
            return {
              name: decodeHtml(p.name),
              url: p.url,
              priceCash,
              image: Array.isArray(p.image) ? p.image[0] : p.image ?? null,
              sku: p.sku ?? null,
              inStock: avail ? !/OutOfStock|SoldOut/i.test(avail) : true,
            };
          })
        : parseCards(html);

      for (const it of items) {
        if (!it.url || !it.priceCash || it.priceCash <= 0) continue;
        // ID estable: sku si hay; si no, el número que Qloud pone en la URL
        const fromUrl = it.url.match(/(\d{3,})(?=[^/]*\.html?$)/)?.[1] ?? it.url.match(/(\d{3,})/)?.[1];
        const key = String(it.sku || fromUrl || it.url);
        const id = `${storeId}-${key}`;
        if (seen.has(id)) continue;
        seen.add(id);

        listings.push({
          id,
          storeId,
          modelId: null, // lo asigna matching.mjs
          url: it.url.startsWith("http") ? it.url : `${root}/${it.url.replace(/^\//, "")}`,
          titleRaw: it.name,
          priceList: it.priceCash,
          priceCash: it.priceCash,
          installments: null, // el listado publica el precio de contado
          inStock: it.inStock !== false,
          condition: /outlet/i.test(it.name)
            ? "outlet"
            : /usad[oa]|reacond/i.test(it.name)
              ? "refurb"
              : "new",
          image: it.image ?? null,
          attrs: {},
          lastSeenAt: new Date().toISOString(),
        });
      }
    }

    return listings;
  }

  return { storeId, fetchListings };
}
