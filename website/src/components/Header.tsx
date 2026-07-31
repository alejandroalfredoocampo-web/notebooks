import Link from "next/link";
import { getStores } from "@/lib/data";
import MobileMenu from "./MobileMenu";
import AuthNav from "./AuthNav";

export default async function Header() {
  const storeCount = (await getStores()).length;
  return (
    <>
      {/* Barra de anuncio, estilo Córdoba Notebooks */}
      <div className="bg-brand-navy text-brand-sky text-xs font-medium tracking-wide">
        <div className="mx-auto max-w-6xl px-4 py-1.5 text-center">
          Comparamos <b className="text-white">{storeCount} tiendas</b> de todo el país ·
          Precios actualizados varias veces por día · <b className="text-white">100% gratis, sin registro</b>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 md:gap-6">
          <Link href="/" className="shrink-0 leading-tight">
            <span className="text-lg font-extrabold tracking-tight text-brand-navy md:text-xl">
              notebooks<span className="text-brand-blue">.com.ar</span>
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              comparador de precios
            </span>
          </Link>

          <form action="/notebooks" className="relative hidden flex-1 max-w-lg md:block">
            <input
              type="text"
              name="q"
              placeholder='Buscá por modelo, marca o specs: "lenovo i5 16gb"'
              className="h-10 w-full rounded-full border border-slate-300 pl-4 pr-11 text-sm outline-none transition focus:border-brand-blue"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white transition hover:bg-brand-darker"
            >
              →
            </button>
          </form>

          <nav className="ml-auto hidden items-center gap-1 text-sm font-semibold text-slate-600 md:flex">
            <Link href="/marcas" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand-blue">
              Marcas
            </Link>
            <Link href="/comparar" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand-blue">
              Comparar
            </Link>
            <Link href="/tiendas" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand-blue">
              Tiendas
            </Link>
            <Link href="/blog" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand-blue">
              Blog
            </Link>
            <Link href="/corporativo" className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-brand-blue">
              Venta Corporativa
            </Link>
            <AuthNav />
          </nav>

          <div className="ml-auto md:hidden">
            <MobileMenu />
          </div>
        </div>
      </header>
    </>
  );
}
