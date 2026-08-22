"use client";

import { useEffect } from "react";
import { fmtARS } from "@/lib/format";

/**
 * Barra fija de mobile con el mejor precio y el link a la tienda.
 *
 * ## Por qué
 *
 * Medido en un navegador a 375×812 sobre una ficha real: el primer botón **"Ir a la
 * tienda" estaba a 1.584px, casi dos pantallas abajo**. Ese click es el producto entero de
 * este sitio — es lo que se le factura a la tienda — y para llegar había que scrollear el
 * hero, la imagen, la tabla de specs, los chips y el termómetro de precio.
 *
 * Es el mismo hallazgo que la auditoría de mobile del otro proyecto encontró con el botón
 * "Comprar" (1.673px, 2,06 pantallas) y se resolvió igual: una barra fija.
 *
 * ## El detalle que hay que saber para no romperlo
 *
 * El espacio que deja libre la barra **no puede vivir en el componente de la ficha**. En el
 * otro proyecto el primer intento hizo eso y el footer siguió tapado, porque el footer está
 * fuera del árbol de la página. Acá el espacio se agrega al `<body>` con una clase, y se
 * saca al desmontar. Feo, y es la única forma de que cubra todo lo que hay debajo.
 */
export default function BarraMejorPrecio({
  precio,
  tienda,
  listingId,
  cantidadTiendas,
  cuotas,
}: {
  precio: number;
  tienda: string;
  listingId: string;
  cantidadTiendas: number;
  cuotas?: { count: number; amount: number; interestFree: boolean } | null;
}) {
  useEffect(() => {
    document.body.classList.add("con-barra-fija");
    return () => document.body.classList.remove("con-barra-fija");
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      // `env(safe-area-inset-bottom)` es el espacio de la barra de gestos del iPhone. Sin
      // esto, en un iPhone con notch el botón queda medio tapado por la barra del sistema.
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center gap-3 px-4 pb-1 pt-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Mejor precio · {cantidadTiendas} {cantidadTiendas === 1 ? "tienda" : "tiendas"}
          </div>
          <div className="truncate text-lg font-extrabold leading-tight tracking-tight">
            {fmtARS(precio)}
          </div>
          <div className="truncate text-[11px] leading-tight text-slate-500">
            {cuotas?.interestFree
              ? `${cuotas.count}x ${fmtARS(cuotas.amount)} sin interés · ${tienda}`
              : `en ${tienda}`}
          </div>
        </div>
        <a
          href={`/salir/${listingId}`}
          target="_blank"
          // `noopener` cierra el acceso de la tienda a `window.opener`; `sponsored` es lo que
          // Google pide declarar en un link comercial saliente, y no declararlo en un sitio
          // que vive de eso es pedir una penalización por links no marcados.
          rel="noopener noreferrer sponsored"
          className="flex min-h-[48px] shrink-0 items-center rounded-lg bg-brand-blue px-5 text-sm font-bold text-white shadow-sm transition active:bg-brand-darker"
        >
          Ir a la tienda ↗
        </a>
      </div>
    </div>
  );
}
