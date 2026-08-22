import { revalidateTag } from "next/cache";
import { TAG_CATALOGO } from "@/lib/data";

/**
 * Invalida el caché del catálogo después de una escritura del admin.
 *
 * Existe como función y no como una línea suelta para que sea un solo lugar el que sabe qué
 * etiqueta hay que tocar. El modo de falla de olvidarse es el peor que hay: el admin guarda,
 * muestra "listo", y el sitio público sigue mostrando lo de antes durante cinco minutos. La
 * persona que edita concluye que el admin está roto.
 *
 * No tira nunca: una invalidación que falla es un dato viejo por unos minutos, no una
 * escritura perdida. El error va al log.
 */
export function invalidarCatalogo(desde: string): void {
  try {
    revalidateTag(TAG_CATALOGO);
  } catch (e) {
    console.error(`[revalidar] no se pudo invalidar desde ${desde}`, e);
  }
}
