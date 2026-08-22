/**
 * Identidad del sitio: host canónico y construcción de URLs absolutas.
 *
 * Existe como módulo propio (y no como una constante suelta en cada archivo) por una
 * razón concreta que se pagó en el otro proyecto: el host canónico gobierna a la vez el
 * `metadataBase`, los canonical de cada ruta, el sitemap, el robots, el JSON-LD, el
 * `llms.txt` y el redirect de apex → www del middleware. Cuando ese valor está escrito
 * siete veces, alcanza con que uno quede viejo para que el sitio se declare a sí mismo
 * en un dominio y linkee otro — y eso Google lo lee como dos sitios que compiten.
 */

/**
 * URL canónica, sin barra final.
 *
 * `NEXT_PUBLIC_SITE_URL` permite que staging y preview se declaren a sí mismos y no a
 * producción. El default es producción porque es el caso en el que equivocarse duele.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.notebooks.com.ar"
).replace(/\/+$/, "");

/** Host canónico, sin protocolo ni puerto. `www.notebooks.com.ar`. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "").split(":")[0];

/** El dominio sin subdominio: sirve para detectar apex y cualquier subdominio propio. */
export const DOMINIO_RAIZ = "notebooks.com.ar";

/** Nombre del sitio, tal como se muestra y como se declara en schema.org. */
export const NOMBRE_SITIO = "Notebooks.com.ar";

/**
 * Qué es este sitio, en una frase.
 *
 * Se usa en el JSON-LD, en el `llms.txt` y en la meta description de la home. Va acá para
 * que las tres digan lo mismo: si un modelo lee dos descripciones distintas del mismo
 * dominio, la que repite es cualquiera de las dos.
 */
export const DESCRIPCION_SITIO =
  "Comparador de precios de notebooks en Argentina. Indexa las publicaciones de las " +
  "tiendas del país, muestra el mismo modelo en todas y guarda el historial de precios " +
  "para distinguir una baja real de un descuento inventado.";

export function urlAbsoluta(path: string): string {
  if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
  return `${SITE_URL}${path}`;
}
