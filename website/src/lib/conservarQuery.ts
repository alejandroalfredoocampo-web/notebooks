/**
 * El destino de un redirect, con la query del pedido original.
 *
 * Portado de Córdoba Notebooks (`lib/conservar-query.ts`, 6a640c2d, doc 117). Allá el
 * middleware conservaba la query pero los `redirect()` de las páginas no, y el `gclid` o el
 * `utm_*` de una campaña morían en el último salto: la visita llegaba y nadie sabía de dónde.
 *
 * Acá la atribución se captura en el middleware antes de cualquier redirect de página, así
 * que el click no se pierde. Pero la URL final sí importa: es lo que ve la persona, lo que se
 * comparte y lo que lee cualquier analítica que se sume después.
 */
export function conQuery(
  destino: string,
  params: Record<string, string | string[] | undefined>,
  excluir: string[] = [],
): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || excluir.includes(k)) continue;
    for (const x of Array.isArray(v) ? v : [v]) q.append(k, x);
  }
  const s = q.toString();
  return s ? `${destino}${destino.includes("?") ? "&" : "?"}${s}` : destino;
}
