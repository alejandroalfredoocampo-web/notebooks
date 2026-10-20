/**
 * ¿Esta URL puede salir en un `Location:` de notebooks.com.ar?
 *
 * ## Por qué no alcanza con "es una URL http"
 *
 * `/salir/[listingId]` valida hoy que el destino sea `http`/`https`, que tapa el
 * `javascript:` guardado en la columna. No tapa lo otro: que el destino sea **otro dominio**.
 *
 * Y el dominio no lo elegimos nosotros. Tres de los cuatro adaptadores del scraper toman la
 * URL del JSON que devuelve la tienda: `p.permalink` (WooCommerce), `p.link` (VTEX) y
 * `it.url` cuando ya viene absoluta (Qloud). O sea que el valor que termina en un
 * `Location:` con nuestro dominio adelante lo escribe un servidor ajeno. Alcanza con que una
 * de esas tiendas esté comprometida, o con que alguien logre meter un producto en su
 * catálogo, para que `notebooks.com.ar/salir/<id>` reparta tráfico a donde quiera: un open
 * redirect con la reputación de un dominio que no es suya, que es la munición clásica del
 * phishing.
 *
 * Es la misma clase de agujero que Córdoba Notebooks cerró el 14/09 (`5de3ba20`): su botón de
 * WhatsApp pasó a tomar el número de una lista y no de la URL, porque si no cualquiera armaba
 * `cordobanotebooks.com.ar/wa?t=<número-de-un-estafador>`. La lista, acá, es la tienda.
 *
 * ## Qué se compara
 *
 * El **dominio registrable** de la URL contra el de `stores.url`, no el host completo: una
 * tienda puede publicar en `www.` y tener el perfil sin `www.`, o usar `tienda.` para el
 * catálogo, y eso es normal. Lo que no es normal es cambiar de dominio.
 *
 * Para `.com.ar`, `.gob.ar` y compañía el dominio registrable son **tres** etiquetas
 * (`fravega.com.ar`) y no dos: con dos, `fravega.com.ar` y `cualquiera.com.ar` darían el
 * mismo resultado y la validación no validaría nada. La lista de sufijos de dos niveles es
 * corta a propósito — cubre Argentina, que es donde están las tiendas — y ante un sufijo que
 * no conoce cae en la regla de dos etiquetas, que es la estricta.
 */

/** Sufijos públicos de dos niveles relevantes para este catálogo. */
const SUFIJOS_DOBLES = new Set([
  "com.ar",
  "net.ar",
  "org.ar",
  "gob.ar",
  "tur.ar",
  "com.br",
  "com.uy",
  "com.py",
  "co.uk",
]);

/** `www.fravega.com.ar` → `fravega.com.ar`. */
export function dominioRegistrable(host: string): string {
  const h = host.toLowerCase().replace(/\.$/, "");
  const partes = h.split(".");
  if (partes.length <= 2) return h;
  const dos = partes.slice(-2).join(".");
  if (SUFIJOS_DOBLES.has(dos) && partes.length >= 3) return partes.slice(-3).join(".");
  return dos;
}

/**
 * El destino, sólo si es `http`/`https` **y** del dominio de la tienda.
 *
 * Devuelve `null` —y no una URL "arreglada"— a propósito: si el dato es sospechoso, el que
 * decide no es esta función, es quien la llama. En `/salir` eso significa mandar a la persona
 * al catálogo y dejar una línea en el log, no seguir a un destino que no reconocemos.
 *
 * `urlTienda` puede faltar (una fila de `stores` sin perfil). En ese caso no hay contra qué
 * comparar y se valida sólo el esquema, que es lo que había antes: una tienda sin `url` no es
 * motivo para dejar de mandarle los clicks que ya le mandábamos.
 */
export function destinoSaliente(
  urlPublicacion: string | null | undefined,
  urlTienda: string | null | undefined,
): { ok: true; url: string } | { ok: false; motivo: "vacia" | "esquema" | "otro-dominio" } {
  if (!urlPublicacion) return { ok: false, motivo: "vacia" };

  let u: URL;
  try {
    u = new URL(urlPublicacion);
  } catch {
    return { ok: false, motivo: "esquema" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, motivo: "esquema" };

  let tienda: URL | null = null;
  try {
    tienda = urlTienda ? new URL(urlTienda) : null;
  } catch {
    tienda = null;
  }
  if (!tienda) return { ok: true, url: u.toString() };

  if (dominioRegistrable(u.hostname) !== dominioRegistrable(tienda.hostname)) {
    return { ok: false, motivo: "otro-dominio" };
  }
  return { ok: true, url: u.toString() };
}

/**
 * Separa las publicaciones cuyo destino no es del dominio de la fuente que las trajo.
 *
 * Es la misma regla de `destinoSaliente`, aplicada una capa antes: en el scrape, donde la
 * publicación mala **se ve** —queda una línea en el log con el nombre de la tienda que la
 * publicó— en vez de costar un click en silencio el día que alguien la toque.
 *
 * Dos capas que dicen lo mismo, y por eso ninguna sola tiene que ser perfecta. Lo que no
 * pueden es decir cosas distintas: si el scrape guardara lo que el sitio frena, el click
 * perdido no lo explicaría nadie. Por eso comparten esta función y no una copia.
 *
 * Una URL que no parsea también cae en `descartadas`: si no se puede saber a dónde apunta, la
 * publicación no sirve aunque se guarde. Sin `base` pasan todas — este filtro no es el lugar
 * donde se descubre que falta una configuración.
 */
export function filtrarPorDominio<T extends { url: string }>(
  listings: readonly T[],
  base: string | null | undefined,
): { buenas: T[]; descartadas: T[] } {
  let esperado: string;
  try {
    if (!base) throw new Error("sin base");
    esperado = dominioRegistrable(new URL(base).hostname);
  } catch {
    return { buenas: [...listings], descartadas: [] };
  }

  const buenas: T[] = [];
  const descartadas: T[] = [];
  for (const l of listings) {
    let ok = false;
    try {
      const u = new URL(l.url);
      ok =
        (u.protocol === "http:" || u.protocol === "https:") &&
        dominioRegistrable(u.hostname) === esperado;
    } catch {
      ok = false;
    }
    (ok ? buenas : descartadas).push(l);
  }
  return { buenas, descartadas };
}
