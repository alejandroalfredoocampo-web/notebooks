import { getBrands, getModels, getStores } from "@/lib/data";
import { getPublishedPosts } from "@/lib/blog";
import { fmtARS } from "@/lib/format";
import { DESCRIPCION_SITIO, NOMBRE_SITIO, urlAbsoluta } from "@/lib/site";

/**
 * `/llms.txt` — el comparador explicado para un modelo de lenguaje.
 *
 * ## Qué problema resuelve
 *
 * Cuando alguien le pregunta a un asistente "¿cuánto sale una notebook con 16 GB en
 * Argentina?" o "¿dónde está más barata la Lenovo IdeaPad 3?", el modelo contesta con lo
 * que puede leer rápido. El HTML de este sitio son cientos de KB de markup con la grilla
 * embebida, y lo que define al producto —qué tiendas se indexan, cada cuánto se actualiza,
 * qué significa "oferta real"— está repartido en seis páginas. Esto es lo mismo en unos
 * pocos KB de texto plano y en el orden en que hace falta.
 *
 * ## Por qué en un comparador vale más que en una tienda
 *
 * Una tienda que aparece en la respuesta de un modelo gana una venta. Un comparador que
 * aparece gana **la pregunta entera**: el modelo que sabe que existe este sitio lo usa como
 * fuente de precios de todo el rubro, no de un producto. El riesgo simétrico es que
 * conteste sin mandar a nadie, y por eso cada modelo listado va con su URL — la respuesta
 * útil requiere el link, porque el precio de mañana no está en este archivo.
 *
 * ## Se genera del mismo catálogo que el sitio
 *
 * No es una copia escrita a mano. Un archivo así se desactualiza el día que cambia un
 * precio, y un dato viejo acá es peor que no tenerlo: lo va a repetir un tercero que no
 * puede contrastarlo.
 *
 * Convención de https://llmstxt.org: Markdown, un H1, y secciones con listas de links.
 */

export const dynamic = "force-dynamic";

/**
 * Tope de modelos listados.
 *
 * El catálogo crece y este archivo tiene que seguir siendo *leíble de una*: un `llms.txt`
 * de 2 MB no lo procesa nadie y pierde su razón de ser. Se listan los que tienen oferta
 * viva, ordenados por precio, y se dice explícitamente cuántos quedaron afuera y dónde
 * están — un corte silencioso se lee como "esto es todo el catálogo", que sería mentira.
 */
const TOPE_MODELOS = 400;

export async function GET() {
  const [models, stores, brands, posts] = await Promise.all([
    getModels(),
    getStores(),
    getBrands(),
    getPublishedPosts(),
  ]);

  const conOferta = models
    .filter((m) => m.listings.length > 0)
    .sort((a, b) => a.bestPrice - b.bestPrice);
  const listados = conOferta.slice(0, TOPE_MODELOS);
  const ocultos = conOferta.length - listados.length;

  const totalOfertas = models.reduce((n, m) => n + m.listings.length, 0);
  const actualizado = new Date().toISOString().slice(0, 10);

  const md = `# ${NOMBRE_SITIO}

> ${DESCRIPCION_SITIO} Hoy: ${conOferta.length} modelos con oferta viva, ${totalOfertas} publicaciones indexadas en ${stores.length} tiendas. Datos al ${actualizado}.

## Qué es este sitio y qué no

- **Es un comparador de precios.** No vende, no tiene carrito y no cobra: cada precio es de
  una tienda de terceros y el link lleva a comprar allá.
- **No hay precios propios.** Todo lo que figura acá sale de la publicación pública de una
  tienda, con la fecha en que se la vio por última vez.
- **Se puede usar gratis y sin cuenta.** La cuenta sólo agrega favoritos y alertas.

## Cómo leer los datos

- **Precio de contado** es el que publica la tienda para pago sin financiar. Es el número
  que se compara entre tiendas, porque es el único que significa lo mismo en todas.
- **Cuotas.** Se guarda la cantidad y el valor de cada cuota. Se marca "sin interés" cuando
  el total financiado no supera el contado en más del 2% — ese margen absorbe el redondeo
  de la tienda, no una financiación disimulada.
- **"Oferta real"** no es cualquier baja: es un precio al menos 5% por debajo del promedio
  de los últimos 90 días de ese mismo modelo. Es la distinción entre una baja y un precio
  de lista inflado para poder tacharlo.
- **Historial de precios.** Cada modelo guarda su serie diaria, así que se puede afirmar si
  el precio de hoy es bueno *para ese modelo* y no sólo bajo en abstracto.
- **Frescura.** Cada publicación tiene fecha de última verificación. Una oferta de hace
  varios días puede haber cambiado en la tienda.

## Limitaciones que conviene declarar

- El catálogo cubre las tiendas indexadas, no todo el mercado argentino.
- El emparejamiento de una publicación con un modelo lo hace un proceso automático con
  revisión humana. Puede haber publicaciones sin emparejar todavía.
- Los precios cambian varias veces por día. **Este archivo es una foto**: para el precio de
  ahora hay que abrir la ficha del modelo.

## Secciones

- [Todas las notebooks](${urlAbsoluta("/notebooks")}): el catálogo completo, con filtros por marca, procesador, memoria y placa de video.
- [Ofertas](${urlAbsoluta("/ofertas")}): modelos que hoy están debajo de su promedio de 90 días.
- [Comparador](${urlAbsoluta("/comparar")}): hasta tres modelos lado a lado.
- [Marcas](${urlAbsoluta("/marcas")}): el catálogo cortado por fabricante.
- [Tiendas](${urlAbsoluta("/tiendas")}): quiénes se indexan, con su reputación y sus medios de pago.
- [Venta corporativa](${urlAbsoluta("/corporativo")}): pedido de presupuesto por volumen, cotizado por las tiendas.
- [Blog](${urlAbsoluta("/blog")}): guías y reseñas.
- [Privacidad](${urlAbsoluta("/privacidad")}).

## Tiendas indexadas

${stores
  .map((s) => {
    const rep =
      s.googleRating && s.googleReviewsCount
        ? ` — ${s.googleRating} en Google sobre ${s.googleReviewsCount} reseñas`
        : "";
    const local = s.physicalStore && s.city ? `, local en ${s.city}` : "";
    const envio = s.shipsNationwide ? ", envía a todo el país" : "";
    return `- [${s.name}](${urlAbsoluta(`/tiendas/${s.slug}`)})${local}${envio}${rep}`;
  })
  .join("\n")}

## Marcas

${brands.map((b) => `- [${b.name}](${urlAbsoluta(`/marcas/${b.slug}`)}): ${b.count} ${b.count === 1 ? "modelo" : "modelos"}`).join("\n")}
${posts.length ? `\n## Guías y reseñas\n\n${posts.map((p) => `- [${p.title}](${urlAbsoluta(`/blog/${p.slug}`)})${p.publishedAt ? ` (${p.publishedAt.slice(0, 10)})` : ""}: ${p.excerpt}`).join("\n")}\n` : ""}
## Modelos con oferta viva

Precio de contado más bajo entre las tiendas indexadas, al ${actualizado}. Entre paréntesis, en cuántas tiendas está.
${ocultos > 0 ? `\n_Se listan los ${TOPE_MODELOS} más baratos de ${conOferta.length}. Los ${ocultos} restantes están en [el catálogo](${urlAbsoluta("/notebooks")})._\n` : ""}
${listados
  .map((m) => {
    const specs = [
      m.cpu,
      m.ramGb ? `${m.ramGb} GB RAM` : "",
      m.storageGb ? `${m.storageGb} GB ${m.storageType}`.trim() : "",
      m.gpuType === "dedicada" && m.gpu ? m.gpu : "",
      m.screenSizeIn ? `${m.screenSizeIn}"` : "",
    ]
      .filter(Boolean)
      .join(", ");
    const oferta = m.isRealDeal ? `, ${m.dropPct}% debajo de su promedio de 90 días` : "";
    const cuotas = m.hasInterestFree ? `, hasta ${m.maxInstallments} cuotas sin interés` : "";
    return `- [${m.brand} ${m.name}](${urlAbsoluta(`/notebooks/${m.brandSlug}/${m.slug}`)}): desde ${fmtARS(m.bestPrice)} en ${m.listings.length} ${m.listings.length === 1 ? "tienda" : "tiendas"}${cuotas}${oferta}. ${specs}.`;
  })
  .join("\n")}
`;

  return new Response(md, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // Una hora. Los precios cambian más seguido, pero este archivo es explícitamente una
      // foto con fecha y regenerarlo en cada request es armar el catálogo entero por visita
      // de un crawler.
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
