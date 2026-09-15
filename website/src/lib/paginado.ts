type Row = Record<string, unknown>;

export type Pagina<T = Row> = PromiseLike<{ data: T[] | null; error: { message: string } | null; count: number | null }>;

/**
 * Todas las filas, y no las primeras mil.
 *
 * PostgREST corta cada respuesta en `max-rows` (1.000 por defecto en Supabase) **sin error y sin
 * aviso**: la consulta "anda" y devuelve un catálogo truncado. Con el historial de 90 días eso
 * pasa enseguida —50 modelos por 90 días son 4.500 puntos—, y entonces el "promedio de 90 días"
 * que sostiene la insignia de oferta real se calcula sobre lo que entró en la primera página.
 * `listings` tenía 839 filas en agosto: estaba a una tienda de lo mismo.
 *
 * Se pide el total con `count: "exact"` y se sigue pidiendo hasta tenerlo. Se avanza por lo que
 * llegó y no por un tamaño fijo, así que funciona aunque `max-rows` esté configurado más bajo.
 * La consulta tiene que pedir `count: "exact"` y tener un orden estable (sin orden, dos páginas
 * de `range` pueden repetir o saltear filas). Hay una copia en `scrapers/lib.mjs`, que es JS.
 *
 * Es la lección de Córdoba Notebooks con "cero archivos revisados es falla" (chequear-copy):
 * un resultado incompleto que parece completo es el peor resultado.
 */
export async function todasLasFilas<T = Row>(
  consulta: (desde: number, hasta: number) => Pagina<T>,
): Promise<{ data: T[]; error: null } | { data: null; error: { message: string } }> {
  const PAGINA = 1000;
  const filas: T[] = [];
  let total = Infinity;
  while (filas.length < total) {
    const { data, error, count } = await consulta(filas.length, filas.length + PAGINA - 1);
    if (error) return { data: null, error };
    if (count != null) total = count;
    if (!data?.length) break;
    filas.push(...data);
  }
  if (Number.isFinite(total) && filas.length < total) {
    return { data: null, error: { message: `lectura incompleta: ${filas.length} de ${total} filas` } };
  }
  return { data: filas, error: null };
}
