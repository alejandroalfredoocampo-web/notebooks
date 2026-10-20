"use client";

import Link from "next/link";
import { useEffect } from "react";
import { recargarPagina, recargarSiEsDeDeploy } from "@/lib/recarga-por-deploy";

/**
 * Qué se ve cuando una ruta se rompe.
 *
 * Hasta acá no existía: cualquier error tirado por un componente mostraba la pantalla genérica
 * de Next, sin marca, sin explicación y **sin salida**. La única opción era el botón de atrás.
 *
 * En este sitio eso se paga distinto que en una tienda. El producto es el click saliente hacia
 * la tienda (`/salir/[listingId]`), que es lo que se factura: alguien que llegó a la ficha de un
 * equipo estaba a un click de generar el único ingreso que hay. Las tres salidas de abajo
 * —reintentar, el catálogo y las ofertas— son tres formas de que esa visita no termine en cero.
 *
 * El `digest` se muestra a propósito: es el identificador que Next le pone al error y el mismo
 * que queda en el log del servidor, así que sirve para encontrarlo sin pedirle a nadie que
 * cuente qué estaba haciendo.
 *
 * ## Por qué esto loguea a consola y no a un servicio
 *
 * Córdoba Notebooks resolvió la misma pantalla enganchada a Sentry. Acá no se portó esa mitad:
 * es una cuenta de terceros con costo recurrente, y la decisión de sumar terceros ya se tomó al
 * revés en el doc 06 (ni GA4 ni pixel de Meta; la atribución es first-party). El `console.error`
 * queda en los logs de Vercel, que es visibilidad real hoy; lo que falta cuando alguien decida
 * el servicio es agrupación y alertas.
 *
 * **Lo que nunca se loguea es la URL.** El link de baja de alertas es `/baja?id=…&t=<hmac>`: un
 * reporte de error que arrastra la query manda ese token al log. Es la misma lección que Córdoba
 * Notebooks escribió para el recorte de datos de Sentry, y acá ya estaba aplicada en
 * `/api/csp-report`, que loguea el `pathname` y descarta la query.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Una pestaña abierta desde antes de un deploy pide chunks que ya no existen. Eso no es un
    // error de la página: se arregla solo recargando, y se recarga una vez sin mostrar nada.
    if (recargarSiEsDeDeploy(error)) return;
    console.error("[error-de-ruta]", error?.digest ?? "(sin digest)", error?.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
        Se nos rompió algo acá
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
        No es culpa tuya y ya quedó registrado. Probá de nuevo; si sigue igual, los precios y las
        ofertas están a un click.
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-brand-blue px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-darker"
        >
          Reintentar
        </button>
        {/* `reset()` re-dibuja el mismo árbol; si lo roto es un chunk o el layout, no sale de
            ahí. Este sí recarga el documento. */}
        <button
          onClick={recargarPagina}
          className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:border-brand-blue hover:text-brand-blue"
        >
          Recargar la página
        </button>
        <Link
          href="/notebooks"
          className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:border-brand-blue hover:text-brand-blue"
        >
          Ver las notebooks
        </Link>
        <Link
          href="/ofertas"
          className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-bold text-slate-900 transition hover:border-brand-blue hover:text-brand-blue"
        >
          Ver ofertas
        </Link>
      </div>

      {error?.digest && (
        <p className="mt-10 text-xs text-slate-400">
          Código del error: <code className="font-mono">{error.digest}</code>
        </p>
      )}
    </div>
  );
}
