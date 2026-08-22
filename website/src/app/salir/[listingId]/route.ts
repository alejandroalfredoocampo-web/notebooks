import { NextRequest, NextResponse } from "next/server";
import { getListing, getStore } from "@/lib/data";
import { supabase } from "@/lib/supabaseServer";
import { COOKIE_ORIGEN, COOKIE_VISITANTE, decodificar, ultimoToque } from "@/lib/atribucion";

export const dynamic = "force-dynamic";

/**
 * Redirect saliente con registro del click.
 *
 * Es **el** endpoint del negocio: lo que se le factura a la tienda. Todo lo que sigue está
 * escrito con esa prioridad — el redirect nunca se rompe por un problema al registrar, y el
 * registro nunca miente sobre lo que se puede facturar.
 *
 * ## Lo que se agregó
 *
 * 1. **Atribución.** De dónde vino el visitante, leído de la cookie que escribe el
 *    middleware. Antes se guardaba el `referrer` del click, que en la práctica es siempre
 *    este mismo sitio (la persona navegó tres páginas antes de apretar).
 * 2. **Marca de bot.** Un crawler que recorre el catálogo genera clicks salientes reales.
 *    Facturarlos es cobrar de más; borrarlos deja un hueco que la tienda va a discutir. Se
 *    guardan marcados.
 * 3. **Validación del destino.** `listing.url` viene de un scraper sobre HTML ajeno. Un
 *    valor raro en esa columna convertía este endpoint en un redirector a cualquier lado.
 */

/**
 * Detección de bots.
 *
 * Es una heurística y no pretende ser otra cosa: un scraper que se hace pasar por Chrome no
 * la pasa. Sirve para lo que tiene que servir — no cobrarle a la tienda los clicks de
 * Googlebot, de un monitor de uptime o de un `curl` — y su costo de equivocarse es bajo en
 * los dos sentidos, porque el click igual se guarda.
 */
const RE_BOT =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|httpx|axios|node-fetch|libwww|java\//i;

export async function GET(
  req: NextRequest,
  { params }: { params: { listingId: string } }
) {
  const listing = await getListing(params.listingId);
  if (!listing) {
    return NextResponse.redirect(new URL("/notebooks", req.url), 302);
  }

  const destino = destinoSeguro(listing.url);
  if (!destino) {
    // La publicación existe pero su URL no es utilizable. Es un problema de datos, no del
    // visitante: se lo manda a la ficha del modelo, que es lo más cerca que se puede.
    console.error("[salir] URL inválida en la publicación", { listingId: listing.id });
    return NextResponse.redirect(new URL("/notebooks", req.url), 302);
  }

  const store = await getStore(listing.storeId);
  const ua = req.headers.get("user-agent") ?? "";
  const esBot = !ua || RE_BOT.test(ua);

  const guardado = decodificar(req.cookies.get(COOKIE_ORIGEN)?.value);
  const toque = ultimoToque(guardado);

  // El registro nunca puede romper el redirect: si falla, la persona igual llega a la
  // tienda y nosotros perdemos un click de la contabilidad. Al revés sería inaceptable.
  try {
    await supabase.from("click_outs").insert({
      listing_id: listing.id,
      store_id: listing.storeId,
      model_id: listing.modelId,
      price_at_click: listing.priceCash,
      referrer: req.headers.get("referer")?.slice(0, 500) ?? null,
      user_agent: ua.slice(0, 400) || null,
      bot: esBot,
      device: esMobile(req) ? "mobile" : "desktop",
      visitor_id: req.cookies.get(COOKIE_VISITANTE)?.value ?? null,
      utm_source: toque?.utm_source ?? null,
      utm_medium: toque?.utm_medium ?? null,
      utm_campaign: toque?.utm_campaign ?? null,
      click_id: toque?.click_id ?? null,
      first_touch_at: guardado.primero?.contacto ?? null,
    });
  } catch (e) {
    console.error("[salir] no se pudo registrar el click", e);
  }

  // Parámetros de afiliado / UTM que pidió la tienda.
  const url = new URL(destino);
  if (store?.affiliate?.kind === "utm") {
    for (const [k, v] of Object.entries(store.affiliate.params)) {
      url.searchParams.set(k, v);
    }
  }

  return NextResponse.redirect(url.toString(), {
    status: 302,
    // Cinturón sobre las cabeceras de `next.config.mjs`: un redirect cacheado por un
    // intermediario es un click que ocurre y no se cuenta.
    headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" },
  });
}

/**
 * El destino, sólo si es `http`/`https`.
 *
 * La URL sale de un scraper sobre el HTML de otra empresa, así que no es un dato de
 * confianza. Sin este filtro, un `javascript:` o un `data:` guardado en la columna hace que
 * el sitio emita un `Location:` con ese esquema. Los navegadores modernos lo ignoran, pero
 * "el navegador lo tapa" no es una defensa: el que decide qué esquemas emite este endpoint
 * tiene que ser este endpoint.
 */
function destinoSeguro(raw: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function esMobile(req: NextRequest): boolean {
  if (req.headers.get("sec-ch-ua-mobile") === "?1") return true;
  return /Mobi|Android|iPhone|iPad/i.test(req.headers.get("user-agent") ?? "");
}
