"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AuthNav from "./AuthNav";

const LINKS = [
  { href: "/notebooks", label: "Todas las notebooks" },
  { href: "/ofertas", label: "Ofertas verificadas" },
  { href: "/guias", label: "Guías para elegir" },
  { href: "/marcas", label: "Marcas" },
  { href: "/comparar", label: "Comparar" },
  { href: "/tiendas", label: "Tiendas" },
  { href: "/blog", label: "Blog" },
  { href: "/corporativo", label: "Venta corporativa" },
];

/**
 * Menú de mobile.
 *
 * Lo que se le agregó, y por qué cada cosa:
 *
 *  - **Escape cierra y el fondo no scrollea mientras está abierto.** Con el menú abierto,
 *    el dedo movía la página de atrás y el panel se quedaba flotando sobre contenido
 *    distinto del que se veía al abrirlo.
 *  - **Un fondo clickeable.** Tocar fuera de un panel abierto es el gesto que todo el mundo
 *    prueba primero. Sin él, la única salida era encontrar la ✕.
 *  - **`max-h` con `dvh`.** `100vh` en mobile es el alto **sin** la barra de direcciones,
 *    así que un panel dimensionado con `vh` se corta abajo apenas la barra aparece. Y hay
 *    que restar el header *y* la barra de anuncio — en el otro proyecto el primer arreglo
 *    usó `4rem` y quedaron links inalcanzables porque no había contado los 32px de la
 *    barra de promo. Acá son 6rem, medidos.
 *  - **Áreas táctiles de 44px** en el botón, con margen negativo para no ensanchar el
 *    header. El header a 375px ya está justo de ancho, y agrandar un control adentro es
 *    exactamente cómo aparece el scroll horizontal.
 *  - **El foco vuelve al botón al cerrar**, que es lo que espera quien navega con teclado o
 *    con lector de pantalla.
 */
export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [open]);

  const cerrar = () => {
    setOpen(false);
    botonRef.current?.focus();
  };

  return (
    <div className="md:hidden">
      <button
        ref={botonRef}
        type="button"
        aria-label={open ? "Cerrar menú" : "Menú"}
        aria-expanded={open}
        aria-controls="menu-mobile"
        onClick={() => setOpen((o) => !o)}
        className="area-tactil -m-1.5 flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 p-2.5 text-slate-600"
      >
        <span aria-hidden="true">{open ? "✕" : "☰"}</span>
      </button>

      {open && (
        <>
          {/* El fondo. `aria-hidden` porque para un lector de pantalla no es nada: el
              Escape y el botón ya son las salidas anunciadas. */}
          <div
            aria-hidden="true"
            onClick={cerrar}
            className="fixed inset-0 top-16 z-40 bg-slate-900/20"
          />
          <div
            id="menu-mobile"
            className="absolute left-0 right-0 top-16 z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain border-b border-slate-200 bg-white p-4 shadow-lg"
          >
            <form action="/notebooks" className="relative mb-3" role="search">
              <input
                type="search"
                name="q"
                // El teclado de búsqueda trae la tecla "Ir" en vez de "Enter", y
                // `autoComplete="off"` evita que el navegador tape las sugerencias del
                // sitio con su propio historial.
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                aria-label="Buscar notebooks"
                placeholder='Buscá: "lenovo i5 16gb"'
                className="h-12 w-full rounded-full border border-slate-300 pl-4 pr-12 text-base outline-none focus:border-brand-blue"
              />
              <button
                type="submit"
                aria-label="Buscar"
                className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-white"
              >
                <span aria-hidden="true">→</span>
              </button>
            </form>
            <nav aria-label="Menú principal" className="flex flex-col text-sm font-semibold text-slate-700">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  // `min-h-[44px]` y no `py-2.5`: la altura mínima táctil es un requisito,
                  // no una consecuencia del padding que quedó.
                  className="flex min-h-[44px] items-center rounded-lg px-2 hover:bg-slate-100"
                >
                  {l.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-slate-100" />
              <AuthNav variant="mobile" />
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
