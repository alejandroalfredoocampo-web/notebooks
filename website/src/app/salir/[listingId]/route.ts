import { NextRequest, NextResponse } from "next/server";
import { getListing, getStore } from "@/lib/data";
import { clienteDeEscritura } from "@/lib/supabaseAdmin";
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
    // visitante: se lo manda al catálogo.
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
  //
  // Ojo con el `try`: supabase-js **no tira** cuando la base rechaza el insert, devuelve
  // `{ error }`. Hasta el 15-sep el código sólo tenía el `catch`, así que un insert rechazado
  // (una columna que falta porque no se corrió una migración, una policy) se perdía sin dejar
  // ni una línea en el log. Es el click que se factura. Lección de Córdoba Notebooks
  // (a1d5809b): "no pude preguntarle" y "me dijo que no" no pueden verse igual que "ok".
  // Lo que la tabla tiene desde la 0001. Si algo falla, este subconjunto es el que se
  // reintenta: un click sin campaña se puede facturar, un click que no se guardó no.
  const minimo = {
    listing_id: listing.id,
    store_id: listing.storeId,
    model_id: listing.modelId,
    price_at_click: listing.priceCash,
    referrer: req.headers.get("referer")?.slice(0, 500) ?? null,
    user_agent: ua.slice(0, 400) || null,
  };

  try {
    const sb = clienteDeEscritura("salir");
    if (!sb) throw new Error("falta SUPABASE_SERVICE_ROLE_KEY");
    const { error } = await sb.from("click_outs").insert({
      ...minimo,
      bot: esBot,
      device: esMobile(req) ? "mobile" : "desktop",
      visitor_id: req.cookies.get(COOKIE_VISITANTE)?.value ?? null,
      utm_source: toque?.utm_source ?? null,
      utm_medium: toque?.utm_medium ?? null,
      utm_campaign: toque?.utm_campaign ?? null,
      // `utm_content` no es un campo más: con Meta es lo único que separa el link de la bio
      // (`link_in_bio`, gratis) de un anuncio pago, porque `fbclid` viene en los dos. Córdoba
      // Notebooks tenía 3.083 visitantes de la bio contados como Meta Ads (a70b5c9e). Lo que
      // no se escribe el día del click no se reconstruye después. Ver migración 0017.
      utm_content: toque?.utm_content ?? null,
      utm_term: toque?.utm_term ?? null,
      click_id: toque?.click_id ?? null,
      click_plataforma: toque?.click_plataforma ?? null,
      first_touch_at: guardado.primero?.contacto ?? null,
    });
    if (error) throw error;
  } catch (e) {
    // Una columna que todavía no existe no puede costar el click.
    //
    // Este endpoint es lo que se factura, y su `insert` nombra columnas de tres migraciones
    // (0001, 0014, 0017). Si el código llega antes que la migración —que es el orden normal
    // de un deploy, y el que este proyecto tiene pendiente desde el 15-sep— la base rechaza
    // el insert **entero** y se deja de registrar *todo*: no se pierde la atribución, se
    // pierde la facturación, y en silencio, porque la persona llega a la tienda igual.
    //
    // Es la misma decisión que tomó Córdoba Notebooks en `feaf982c` cuando el JS viejo
    // cacheado le pegaba al endpoint sin el token nuevo: guardar el click sin el campo que
    // falta antes que no guardarlo. Perder una dimensión es un informe peor; perder el click
    // es plata que no se puede cobrar.
    if (esColumnaQueFalta(e)) {
      console.error(
        "[salir] la base no conoce alguna columna del click: falta correr una migración " +
          "(0014 / 0017). Se guarda el click sin atribución — el informe por campaña queda " +
          "incompleto hasta que se aplique.",
        e,
      );
      try {
        const sb = clienteDeEscritura("salir");
        const { error } = (await sb?.from("click_outs").insert(minimo)) ?? {
          error: new Error("falta SUPABASE_SERVICE_ROLE_KEY"),
        };
        if (error) throw error;
      } catch (e2) {
        console.error("[salir] tampoco se pudo registrar el click mínimo", e2);
      }
    } else {
      console.error("[salir] no se pudo registrar el click", e);
    }
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

/**
 * ¿El rechazo fue porque la base no conoce una columna?
 *
 * PostgREST contesta `PGRST204` ("Could not find the 'x' column ... in the schema cache") y
 * Postgres `42703` (`undefined_column`) cuando la consulta se arma sin pasar por el caché de
 * esquema. Se miran los dos códigos y, de última, el texto: el objetivo es no confundir esto
 * con una policy que rechaza o con la base caída, que son fallas distintas y no se arreglan
 * reintentando con menos columnas.
 */
function esColumnaQueFalta(e: unknown): boolean {
  const o = e as { code?: unknown; message?: unknown } | null;
  const code = String(o?.code ?? "");
  if (code === "PGRST204" || code === "42703") return true;
  return /column .* does not exist|could not find the .* column/i.test(String(o?.message ?? ""));
}
