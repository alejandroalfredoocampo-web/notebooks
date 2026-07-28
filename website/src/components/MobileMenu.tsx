"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Menú mobile (hamburguesa). En md+ el header muestra el buscador y los links
 * inline; en mobile van acá dentro para que el header no desborde a 375px.
 */
export default function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Menú"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-16 z-50 border-b border-slate-200 bg-white p-4 shadow-lg">
          <form action="/notebooks" className="relative mb-3">
            <input
              type="text"
              name="q"
              placeholder='Buscá: "lenovo i5 16gb"'
              className="h-11 w-full rounded-full border border-slate-300 pl-4 pr-11 text-sm outline-none focus:border-brand-blue"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-white"
            >
              →
            </button>
          </form>
          <nav className="flex flex-col text-sm font-semibold text-slate-700">
            <Link href="/notebooks" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-slate-100">
              Notebooks
            </Link>
            <Link href="/ofertas" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-slate-100">
              Ofertas
            </Link>
            <Link href="/comparar" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-slate-100">
              Comparar
            </Link>
            <Link href="/tiendas" onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-slate-100">
              Tiendas
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
