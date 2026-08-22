import type { Metadata } from "next";
import { metaRuta } from "@/lib/seo";
import Link from "next/link";
import { getBrands } from "@/lib/data";

export const metadata: Metadata = metaRuta("/marcas", {
  title: "Marcas de notebooks",
  description:
    "Explorá las notebooks por marca: Lenovo, HP, Asus, Dell, Acer, Apple, Samsung y más. Precios comparados en todas las tiendas de Argentina.",
});

export const dynamic = "force-dynamic";

export default async function MarcasPage() {
  const brands = await getBrands();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Marcas</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Elegí una marca para ver su introducción y todas sus notebooks con el mejor precio de cada
        tienda.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => (
          <Link
            key={b.slug}
            href={`/marcas/${b.slug}`}
            className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-lg"
          >
            <div>
              <div className="text-lg font-extrabold group-hover:text-brand-blue">{b.name}</div>
              <div className="text-xs text-slate-500">
                {b.count} {b.count === 1 ? "modelo" : "modelos"}
              </div>
            </div>
            <span className="text-slate-300 group-hover:text-brand-blue">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
