/**
 * Adaptador para **Venex** (osCommerce custom, server-rendered).
 *
 * No expone API de catálogo, pero cada tarjeta del listado trae un `onclick`
 * con `enhancedClick({...})` (payload de analytics) que es JSON con id, name,
 * brand y **price numérico limpio** — más confiable que parsear el precio
 * formateado. El nombre se toma del `<h3>` (en enhancedClick viene truncado).
 *
 * `?limit=96` devuelve la categoría completa en 1 request (sin paginar).
 *
 * ⚠️ El sitio responde en **ISO-8859-1**: hay que decodificar como latin1 o se
 * corrompen los acentos. `politeFetch` devuelve la respuesta cruda, así que acá
 * se lee el ArrayBuffer y se decodifica explícitamente.
 */
import { politeFetch } from "../lib.mjs";
import { decodeHtml } from "./qloud.mjs";

const firstMatch = (s, re) => s.match(re)?.[1] ?? null;

/** Lee el body respetando el charset declarado (latin1 en Venex). */
async function readBody(res) {
  const buf = await res.arrayBuffer();
  const ct = res.headers.get("content-type") ?? "";
  const charset = /charset=([\w-]+)/i.exec(ct)?.[1]?.toLowerCase() ?? "utf-8";
  const enc = /8859|latin/i.test(charset) ? "latin1" : "utf-8";
  return new TextDecoder(enc).decode(buf);
}

/**
 * @param {{ storeId?: string, base?: string, categoryPaths: string[], limit?: number }} cfg
 * @returns {{ storeId: string, fetchListings: () => Promise<object[]> }}
 */
export function makeVenexScraper({
  storeId = "venex",
  base = "https://www.venex.com.ar",
  categoryPaths = ["notebooks"],
  limit = 96,
}) {
  const root = base.replace(/\/$/, "");

  async function fetchListings() {
    const listings = [];
    const seen = new Set();

    for (const path of categoryPaths) {
      const url = `${root}/${String(path).replace(/^\//, "")}?limit=${limit}`;
      let html;
      try {
        html = await readBody(await politeFetch(url));
      } catch (e) {
        console.warn(`  · ${storeId}: no se pudo leer ${url} (${e.message})`);
        continue;
      }

      // Cada producto es un div.product-box. Ojo: hay que cortar SOLO por el
      // contenedor exacto — los hijos (product-box-media/-body/-title/-price…)
      // comparten el prefijo y partirían la tarjeta en pedazos.
      const chunks = html.split(/<div\s+class=["']product-box["']/i).slice(1);
      for (const chunk of chunks) {
        // Payload de analytics: JSON con id/name/brand/price (precio sin formatear)
        let meta = {};
        const raw = firstMatch(chunk, /enhancedClick\((\{[\s\S]*?\})\)/);
        if (raw) {
          try {
            meta = JSON.parse(raw.replace(/\\"/g, '"').replace(/\\'/g, "'"));
          } catch {
            meta = {};
          }
        }

        // Título y URL: preferir el h3 (nombre completo)
        const titleBlock = chunk.match(/<h3[^>]+class=["'][^"']*product-box-title[^"']*["'][\s\S]{0,500}?<\/h3>/i)?.[0] ?? "";
        const url2 = firstMatch(titleBlock, /<a[^>]+href=["']([^"']+)["']/i);
        const name =
          decodeHtml((titleBlock.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "").replace(/<[^>]+>/g, "")) ||
          decodeHtml(meta.name ?? "");
        if (!url2 || !name) continue;

        // Precio: el numérico del payload; si falta, el texto de .current-price
        let priceCash = Number(String(meta.price ?? "").replace(/[^\d]/g, "")) || null;
        if (!priceCash) {
          const txt = firstMatch(chunk, /class=["'][^"']*current-price[^"']*["'][^>]*>\s*\$?\s*([\d.,]+)/i);
          priceCash = txt ? Number(txt.replace(/[^\d]/g, "")) : null;
        }
        if (!priceCash) continue;
        // Precio de lista (tachado), si existe
        const oldTxt = firstMatch(chunk, /product-box-old-price[^>]*>\s*\$?\s*([\d.,]+)/i);
        const priceList = oldTxt ? Number(oldTxt.replace(/[^\d]/g, "")) || priceCash : priceCash;

        // Imagen: relativa; ojo, los nombres pueden no tener punto de extensión
        let image = firstMatch(chunk, /<img[^>]+src=["']([^"']+)["']/i);
        if (image && !/^https?:/i.test(image)) {
          image = image.replace(/^\//, "");
          image = image ? `${root}/${image}` : null;
        }
        if (image && /\/thumb\/?$/.test(image)) image = null; // src vacío

        // ID de producto: el payload de analytics, o el `products_label_NNN` del
        // listado (hay uno por producto), o como último recurso el slug de la URL.
        // ⚠️ NO derivarlo de "el primer número del slug": ahí viven los modelos de
        // CPU (Ryzen 7 7330U → 7330) y dos productos distintos colisionarían.
        const labelId = firstMatch(chunk, /products_label_(\d+)/);
        const slug = firstMatch(url2, /\/([^/]+?)\.html?$/i);
        const key = meta.id ?? labelId ?? slug ?? name.slice(0, 60);
        const id = `${storeId}-${key}`;
        if (seen.has(id)) continue;
        seen.add(id);

        listings.push({
          id,
          storeId,
          modelId: null, // lo asigna matching.mjs
          url: url2.startsWith("http") ? url2 : `${root}/${url2.replace(/^\//, "")}`,
          titleRaw: name,
          priceList,
          priceCash,
          installments: null, // el listado publica "contado efectivo"
          inStock: true, // el listado solo muestra comprables (presencia = stock)
          condition: /outlet/i.test(name)
            ? "outlet"
            : /usad[oa]|reacond/i.test(name)
              ? "refurb"
              : "new",
          image,
          attrs: meta.brand ? { marca: String(meta.brand) } : {},
          lastSeenAt: new Date().toISOString(),
        });
      }
    }

    return listings;
  }

  return { storeId, fetchListings };
}
