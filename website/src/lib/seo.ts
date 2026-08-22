import type { Metadata } from "next";
// Relativo y con extensión, y no `@/lib/site`, para que este módulo se pueda importar
// desde `node --test`: el runner de Node no conoce el alias `@/` del tsconfig ni resuelve
// extensiones al hacer type stripping. Webpack lo acepta igual, así que el costo es esta
// nota y el beneficio es que `metaRuta` y `recortar` tienen tests.
import { DESCRIPCION_SITIO, NOMBRE_SITIO } from "./site.ts";

/**
 * Metadata por ruta.
 *
 * ## El problema que resuelve
 *
 * `alternates.canonical` **se hereda** en el App Router. Ponerlo en el layout raíz hace
 * que cada página del sitio declare como canónica la URL del layout — o sea, que el sitio
 * entero se presente ante Google como copias de la home. Y omitirlo por completo deja que
 * Google elija: con parámetros de tracking (`?utm_source=...`), con la versión apex y con
 * la www, la misma página entra al índice varias veces y se reparte su propio ranking.
 *
 * Por eso el canonical vive por ruta, y `metaRuta` es la forma de no olvidarse: devuelve
 * el canonical y el bloque de OpenGraph ya armados, con `url` apuntando a la misma ruta.
 */

export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${NOMBRE_SITIO} — el comparador de precios de notebooks de Argentina`,
};

/**
 * Canonical + OpenGraph para una ruta.
 *
 * `path` va relativo (`/notebooks`): Next lo resuelve contra el `metadataBase` del layout,
 * así que el mismo build sirve en staging declarando staging y en producción declarando
 * producción, sin condicionales.
 */
export function metaRuta(path: string, extra?: Metadata): Metadata {
  const { openGraph, ...resto } = extra ?? {};
  return {
    ...resto,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: NOMBRE_SITIO,
      locale: "es_AR",
      images: [OG_IMAGE],
      url: path,
      ...openGraph,
    },
  };
}

/**
 * Metadata de una página que no debe entrar al índice.
 *
 * No es lo mismo que `Disallow` en robots.txt: robots frena el **crawleo** de las que
 * todavía no entraron, y esto frena la **indexación** de las que ya están dadas de alta.
 * Hacen falta los dos, y en ese orden: una página bloqueada por robots que ya está en el
 * índice no se puede desindexar, porque Google no puede leer el `noindex` que la sacaría.
 */
export function metaPrivada(titulo: string, path?: string): Metadata {
  return {
    title: titulo,
    robots: { index: false, follow: true },
    ...(path ? { alternates: { canonical: path } } : {}),
  };
}

/** La description que usan la home y el JSON-LD, sin duplicar el texto. */
export const DESCRIPCION_HOME = DESCRIPCION_SITIO;

/**
 * Recorta un texto para una meta description **en el último espacio**, no a mitad de
 * palabra.
 *
 * El bug que evita es literal: en el otro proyecto la description del JSON-LD cortaba en
 * el carácter 800 y salía partiendo palabras. Un buscador que muestra "…con placa de vid"
 * no está mostrando un resumen, está mostrando un error.
 */
export function recortar(texto: string, largo = 160): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= largo) return limpio;
  const corte = limpio.slice(0, largo);
  const ultimoEspacio = corte.lastIndexOf(" ");
  return (ultimoEspacio > largo * 0.6 ? corte.slice(0, ultimoEspacio) : corte).replace(/[.,;:]$/, "") + "…";
}
