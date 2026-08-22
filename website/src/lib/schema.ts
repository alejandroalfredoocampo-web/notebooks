import { DESCRIPCION_SITIO, NOMBRE_SITIO, SITE_URL, urlAbsoluta } from "@/lib/site";
import { recortar } from "@/lib/seo";
import type { ModelWithOffers, Store } from "@/lib/types";

/**
 * Datos estructurados (schema.org / JSON-LD).
 *
 * ## Por qué en un comparador importa más que en una tienda
 *
 * Una tienda tiene una sola oferta por producto y el buscador la entiende igual sin
 * schema. Un comparador tiene N ofertas del mismo producto en N vendedores distintos, y
 * eso **no se deduce del HTML**: sin `AggregateOffer` + un `Offer` por tienda con su
 * `seller`, Google ve una página con muchos precios y no sabe si son variantes, cuotas o
 * vendedores. Es también la diferencia entre que un modelo de lenguaje conteste "el mejor
 * precio del Lenovo IdeaPad 3 es $X en la tienda Y" y que conteste una paráfrasis.
 *
 * ## La regla de la casa
 *
 * **Acá no se afirma nada que no esté respaldado por un dato cargado.** Todo lo que puede
 * faltar se omite en vez de rellenarse. Un schema que miente es peor que uno incompleto,
 * porque el dato falso viaja a lugares donde nadie lo va a contrastar — y en este sitio el
 * dato es precio ajeno, que es el que más caro sale equivocar.
 */

/** IDs estables, para poder referenciar los nodos entre sí dentro del grafo. */
export const ID_ORGANIZACION = `${SITE_URL}/#organizacion`;
export const ID_SITIO = `${SITE_URL}/#sitio`;

/** El id del nodo de una tienda indexada, para reusarlo como `seller` de sus ofertas. */
export function idTienda(slug: string): string {
  return urlAbsoluta(`/tiendas/${slug}#tienda`);
}

/**
 * La entidad que opera el sitio.
 *
 * Va como `Organization` y **no** como `OnlineStore`: este sitio no vende. Declararse
 * tienda sería pedirle a Google que lo trate como un vendedor más — y después penalizarlo
 * por no tener precio propio, ni política de devolución, ni checkout.
 *
 * `[PENDIENTE]` razón social, CUIT y domicilio: no están cargados en el proyecto. Se
 * agregan acá cuando existan, no antes — inventar datos fiscales es un problema legal, no
 * un placeholder.
 */
export function organizacionLd() {
  return {
    "@type": "Organization",
    "@id": ID_ORGANIZACION,
    name: NOMBRE_SITIO,
    url: SITE_URL,
    description: DESCRIPCION_SITIO,
    areaServed: { "@type": "Country", name: "Argentina" },
    knowsLanguage: "es-AR",
  };
}

/**
 * El sitio, con el endpoint de búsqueda declarado.
 *
 * Google retiró el sitelinks searchbox en 2024, así que esto ya no da un resultado
 * enriquecido. Se mantiene porque es la única forma legible por máquina de decir "así se
 * busca en este catálogo", y eso sí lo usan los asistentes que navegan el sitio.
 */
export function sitioLd() {
  return {
    "@type": "WebSite",
    "@id": ID_SITIO,
    url: SITE_URL,
    name: NOMBRE_SITIO,
    description: DESCRIPCION_SITIO,
    inLanguage: "es-AR",
    publisher: { "@id": ID_ORGANIZACION },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: urlAbsoluta("/notebooks?q={search_term_string}"),
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Envuelve los nodos en un `@graph`, que es como se declara más de una entidad. */
export function grafo(...nodos: (object | null | undefined)[]) {
  return { "@context": "https://schema.org", "@graph": nodos.filter(Boolean) };
}

/** Miga de pan. El `position` arranca en 1 y la última entrada es la página actual. */
export function breadcrumbLd(items: { nombre: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.nombre,
      item: urlAbsoluta(it.path),
    })),
  };
}

const CONDICION: Record<string, string> = {
  new: "https://schema.org/NewCondition",
  refurb: "https://schema.org/RefurbishedCondition",
  outlet: "https://schema.org/UsedCondition",
};

/**
 * Cuántos días vale una oferta scrapeada.
 *
 * Google trata una oferta con `priceValidUntil` vencido como expirada y le deja de mostrar
 * el precio. Al revés, declarar 90 días —lo razonable en una tienda que fija su propio
 * precio— sería mentir acá: el precio es de un tercero y el scraper lo revisa a diario.
 * Siete días es el compromiso: sobrevive a un fin de semana largo sin caerse y no promete
 * un precio de hace tres meses.
 */
const DIAS_VALIDEZ_OFERTA = 7;

function validaHasta(desde: string): string {
  const base = new Date(desde);
  const t = base.getTime();
  const d = Number.isFinite(t) ? new Date(t) : new Date();
  d.setDate(d.getDate() + DIAS_VALIDEZ_OFERTA);
  return d.toISOString().slice(0, 10);
}

/**
 * La ficha de un modelo: un `Product` con **una oferta por tienda** más el agregado.
 *
 * ## Por qué van las dos cosas y no una
 *
 * `AggregateOffer` es lo que hace que el resultado de búsqueda muestre "desde $X · N
 * ofertas", que es la promesa del sitio. Pero un agregado solo no dice **quién** vende:
 * `offers` con un `Offer` por tienda, cada uno con su `seller`, es lo que permite que un
 * asistente conteste con el nombre de la tienda. Schema.org admite que `offers` sea una
 * lista mezclada, y Google la lee.
 *
 * ## Lo que NO se declara
 *
 * - **`aggregateRating` del producto.** No hay reseñas de producto en este sitio. La
 *   reputación que sí tenemos es la de las tiendas, y va en el nodo de la tienda, que es
 *   de quién es. Poner el rating de la tienda en el producto sería declararle a Google
 *   que el equipo tiene 4,6 estrellas cuando lo que tiene 4,6 es el vendedor.
 * - **`hasMerchantReturnPolicy` / `shippingDetails`.** Son de cada tienda y no los
 *   conocemos por publicación. Un valor inventado acá es una promesa que después incumple
 *   un tercero.
 * - **`gtin`.** El catálogo tiene `partNumber`, que va como `mpn`. Cuando haya códigos de
 *   barra cargados se agrega `gtin`; hoy emitirlo sería declarar un identificador nulo.
 */
export function productoLd(model: ModelWithOffers, opciones?: { descripcion?: string }) {
  const url = urlAbsoluta(`/notebooks/${model.brandSlug}/${model.slug}`);
  const activas = model.listings.filter((l) => l.inStock);
  const conPrecio = activas.length ? activas : model.listings;

  const ofertas = conPrecio.map((l) => ({
    "@type": "Offer",
    url: urlAbsoluta(`/salir/${l.id}`),
    priceCurrency: "ARS",
    price: l.priceCash,
    priceValidUntil: validaHasta(l.lastSeenAt),
    availability: l.inStock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    itemCondition: CONDICION[l.condition] ?? CONDICION.new,
    seller: { "@id": idTienda(l.store.slug) },
  }));

  const precios = conPrecio.map((l) => l.priceCash);

  return {
    "@type": "Product",
    "@id": `${url}#producto`,
    name: `${model.brand} ${model.name}`,
    url,
    ...(model.partNumber ? { mpn: model.partNumber } : {}),
    brand: { "@type": "Brand", name: model.brand },
    ...(model.imageUrl ? { image: [model.imageUrl] } : {}),
    description: recortar(
      opciones?.descripcion ??
        `${model.brand} ${model.name}: ${[model.cpu, model.ramGb ? `${model.ramGb} GB RAM` : "", model.storageGb ? `${model.storageGb} GB ${model.storageType}` : "", model.gpu]
          .filter(Boolean)
          .join(", ")}. Comparado en ${model.listings.length} ${model.listings.length === 1 ? "tienda" : "tiendas"} de Argentina.`,
      300,
    ),
    // Las specs como propiedades legibles por máquina. Es lo que permite filtrar por
    // "16 GB de RAM" fuera de este sitio, y lo que un modelo cita cuando le preguntan por
    // el equipo sin nombrar la página.
    additionalProperty: [
      ["Procesador", model.cpu],
      ["Memoria RAM", model.ramGb ? `${model.ramGb} GB ${model.ramType}`.trim() : ""],
      ["Almacenamiento", model.storageGb ? `${model.storageGb} GB ${model.storageType}`.trim() : ""],
      ["Pantalla", model.screenSizeIn ? `${model.screenSizeIn}" ${model.screenResolution}`.trim() : ""],
      ["Placa de video", model.gpu],
      ["Sistema operativo", model.os],
      ["Peso", model.weightKg ? `${model.weightKg} kg` : ""],
      ["Batería", model.batteryWh ? `${model.batteryWh} Wh` : ""],
    ]
      .filter(([, v]) => !!v)
      .map(([name, value]) => ({ "@type": "PropertyValue", name, value })),
    ...(precios.length
      ? {
          offers: [
            {
              "@type": "AggregateOffer",
              priceCurrency: "ARS",
              lowPrice: Math.min(...precios),
              highPrice: Math.max(...precios),
              offerCount: conPrecio.length,
              availability: activas.length
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              url,
            },
            ...ofertas,
          ],
        }
      : {}),
  };
}

/**
 * Una tienda indexada.
 *
 * Es la contraparte de `seller` en cada oferta: sin este nodo, el `@id` del vendedor
 * apunta a nada y la oferta queda huérfana. Va `Organization` + `Store` cuando la tienda
 * tiene local físico cargado, que es lo mismo que hace la tienda en su propio sitio.
 *
 * `aggregateRating` sale **sólo** de la reputación de Google que la tienda declaró y que
 * el equipo verificó. Sin `googleReviewsCount` no se emite: un rating sin cantidad de
 * reseñas es un número que Google rechaza y que un lector no puede ponderar.
 */
export function tiendaLd(store: Store) {
  const conLocal = store.physicalStore && !!store.physicalAddress;
  return {
    "@type": conLocal ? ["Organization", "Store"] : "Organization",
    "@id": idTienda(store.slug),
    name: store.name,
    url: store.url,
    ...(store.description ? { description: recortar(store.description, 300) } : {}),
    ...(store.logoUrl ? { logo: store.logoUrl, image: store.logoUrl } : {}),
    ...(conLocal
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: store.physicalAddress,
            ...(store.city ? { addressLocality: store.city } : {}),
            addressCountry: "AR",
          },
        }
      : {}),
    ...(store.googleMapsUrl ? { hasMap: store.googleMapsUrl } : {}),
    ...(store.shipsNationwide ? { areaServed: { "@type": "Country", name: "Argentina" } } : {}),
    ...(store.googleRating && store.googleReviewsCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: store.googleRating,
            reviewCount: store.googleReviewsCount,
            bestRating: 5,
          },
        }
      : {}),
    ...(store.socials && Object.keys(store.socials).length
      ? { sameAs: Object.values(store.socials).filter(Boolean) }
      : {}),
  };
}

/**
 * Una página de listado, con lo que muestra declarado como lista.
 *
 * Sin esto, una página de categoría es —para un buscador— un `<h1>`, una grilla y un
 * párrafo del que hay que adivinar de qué va. Con `CollectionPage` + `ItemList` es una
 * lista con su orden y sus items, y es lo que permite que un modelo enumere productos en
 * vez de resumir la portada.
 *
 * `numberOfItems` es lo que **esta página muestra**, no el total del catálogo: es lo único
 * que se puede afirmar mirando el HTML que se está sirviendo.
 */
export function coleccionLd(opts: {
  path: string;
  nombre: string;
  descripcion?: string;
  items: { nombre: string; path: string }[];
}) {
  const url = urlAbsoluta(opts.path);
  return {
    "@type": "CollectionPage",
    "@id": `${url}#coleccion`,
    url,
    name: opts.nombre,
    ...(opts.descripcion ? { description: recortar(opts.descripcion, 300) } : {}),
    isPartOf: { "@id": ID_SITIO },
    inLanguage: "es-AR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.nombre,
        url: urlAbsoluta(p.path),
      })),
    },
  };
}

/**
 * Preguntas y respuestas de una página.
 *
 * Devuelve `null` si no hay preguntas, para poder llamarla sin condicional desde la página
 * y que el nodo simplemente no entre al grafo.
 *
 * Las respuestas van en **texto plano**: `acceptedAnswer.text` admite HTML pero Google lo
 * limita a un puñado de etiquetas, y lo que se cuela de más es motivo de rechazo del
 * bloque entero — o sea, se pierde también lo que estaba bien.
 */
export function faqLd(items: { q: string; a: string }[]) {
  if (!items.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/**
 * Artículo del blog.
 *
 * `dateModified` refleja la última edición real y no la fecha del build: un artículo que
 * dice haberse modificado hoy en cada deploy le enseña a Google que la fecha de este sitio
 * no significa nada.
 */
export function articuloLd(p: {
  slug: string;
  titulo: string;
  descripcion: string;
  publicado: string;
  modificado?: string;
  imagen?: string;
  autor?: string;
}) {
  return {
    "@type": "BlogPosting",
    "@id": urlAbsoluta(`/blog/${p.slug}#articulo`),
    mainEntityOfPage: urlAbsoluta(`/blog/${p.slug}`),
    headline: recortar(p.titulo, 110),
    description: recortar(p.descripcion, 300),
    datePublished: p.publicado,
    dateModified: p.modificado || p.publicado,
    inLanguage: "es-AR",
    ...(p.imagen ? { image: [p.imagen] } : {}),
    author: p.autor ? { "@type": "Person", name: p.autor } : { "@id": ID_ORGANIZACION },
    publisher: { "@id": ID_ORGANIZACION },
    isPartOf: { "@id": ID_SITIO },
  };
}

/**
 * El índice del blog.
 *
 * No se reusa `coleccionLd` a propósito: esa función arma la URL de cada item como una
 * ficha de producto. Pasarle artículos daría una lista de URLs que no existen, y un
 * buscador que sigue esas URLs y encuentra 404 aprende a desconfiar del resto del schema.
 */
export function blogLd(posts: { slug: string; titulo: string; publicado: string; modificado?: string }[]) {
  const url = urlAbsoluta("/blog");
  return {
    "@type": "Blog",
    "@id": `${url}#blog`,
    url,
    name: `Blog de ${NOMBRE_SITIO}`,
    inLanguage: "es-AR",
    isPartOf: { "@id": ID_SITIO },
    publisher: { "@id": ID_ORGANIZACION },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      // El mismo `@id` que emite la ficha del artículo: así los dos nodos son la misma
      // entidad y no dos artículos distintos con el mismo título.
      "@id": urlAbsoluta(`/blog/${p.slug}#articulo`),
      headline: p.titulo,
      url: urlAbsoluta(`/blog/${p.slug}`),
      datePublished: p.publicado,
      ...(p.modificado ? { dateModified: p.modificado } : {}),
    })),
  };
}
