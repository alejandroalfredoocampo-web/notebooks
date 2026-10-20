/**
 * Recarga una vez cuando el error es un archivo de un deploy anterior.
 *
 * Portado de Córdoba Notebooks (73ab293d, 7e42b76d, 0990c951 — el 09-sep, "el sitio no está
 * cargando bien" una vez cada tanto, desde el celular).
 *
 * ## Qué pasa
 *
 * Cada deploy cambia el hash de todos los archivos de JavaScript. Una pestaña abierta desde
 * antes —el celular que quedó con una ficha abierta toda la tarde— sigue teniendo en memoria
 * la lista vieja: al navegar pide un chunk que ya no existe, `import()` tira (`ChunkLoadError`,
 * "Failed to fetch dynamically imported module", en Safari "Importing a module script failed")
 * y React cae en la pantalla de error.
 *
 * Acá pega en el peor lugar: la navegación típica es listado → ficha → "Ir a la tienda", y la
 * ficha es donde se genera el click que se factura. En Vercel el deploy anterior sigue
 * sirviendo sus archivos un tiempo, pero no para siempre, y la protección contra desfase de
 * versiones (Skew Protection) es de un plan pago.
 *
 * ## Qué se hace
 *
 * Si el error es de esta familia, recargar **una sola vez**: el HTML nuevo trae la lista nueva.
 *
 * De la versión de allá no se trae el aviso a Sentry (acá no hay terceros, doc 06). Queda el
 * `console.warn`, con el `pathname` y nunca la query: el link de baja de alertas lleva un HMAC.
 */
const CLAVE = "nb-recarga-por-deploy";
const VENTANA_MS = 60_000;

const FIRMAS = [
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /Loading CSS chunk/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS/i,
];

/** La carga actual ya fue un reload (del botón, de la persona o nuestro). */
export function yaEsUnaRecarga(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "reload";
  } catch {
    return false;
  }
}

export function esErrorDeDeploy(error: unknown): boolean {
  const e = error as { name?: string; message?: string } | undefined;
  const texto = `${e?.name ?? ""} ${e?.message ?? ""}`;
  return FIRMAS.some((re) => re.test(texto));
}

/**
 * Recarga si el error es de un deploy y no se recargó ya hace menos de un minuto. Devuelve si
 * recargó.
 *
 * Contra el bucle, dos frenos y en este orden. El principal es la marca en `sessionStorage`
 * (ventana de 60 s). El de respaldo —"esta carga ya fue un reload"— corre **sólo** si el storage
 * no anduvo (Safari privado tira en `setItem`). No se usa siempre porque `type === "reload"`
 * también es verdad tras un pull-to-refresh, y eso apagaría el arreglo justo en el celular con
 * la pestaña vieja, que es el caso que lo motivó. Allá lo aprendieron en dos tandas.
 */
export function recargarSiEsDeDeploy(error: unknown): boolean {
  if (typeof window === "undefined" || !esErrorDeDeploy(error)) return false;
  let marcado = false;
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE) ?? 0);
    if (Date.now() - ultima < VENTANA_MS) return false;
    sessionStorage.setItem(CLAVE, String(Date.now()));
    marcado = true;
  } catch {
    // sin sessionStorage: queda el freno de respaldo de abajo
  }
  if (!marcado && yaEsUnaRecarga()) return false;
  const e = error as { name?: string; message?: string } | undefined;
  console.warn(
    "[recarga-por-deploy]",
    `${e?.name ?? "Error"}: ${(e?.message ?? "").slice(0, 200)} · ${window.location.pathname}`,
  );
  window.location.reload();
  return true;
}

/**
 * El botón "Recargar": recarga el documento de verdad.
 *
 * `reset()` de Next vuelve a dibujar el mismo árbol. Cuando lo que falló es el layout o un
 * chunk, re-dibuja lo mismo roto y el botón parece no hacer nada — lo que en Córdoba Notebooks
 * se reportó como "Reintentar no anda" (4be1489c).
 */
export function recargarPagina(): void {
  window.location.reload();
}
