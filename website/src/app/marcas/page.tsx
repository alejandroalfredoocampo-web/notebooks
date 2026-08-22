import type { Metadata } from "next";
import { metaRuta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { breadcrumbLd, grafo, ID_SITIO } from "@/lib/schema";
import { urlAbsoluta } from "@/lib/site";
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
  const migas: Miga[] = [
    { nombre: "Inicio", path: "/" },
    { nombre: "Marcas", path: "/marcas" },
  ];

  return (
    <>
      {/* Un `ItemList` de marcas, no de productos: por eso no se reusa `coleccionLd`, que
          arma la URL de cada item como una ficha. Ver su docblock. */}
      <JsonLd
        data={grafo(
          {
            "@type": "CollectionPage",
            "@id": `${urlAbsoluta("/marcas")}#coleccion`,
            url: urlAbsoluta("/marcas"),
            name: "Marcas de notebooks a la venta en Argentina",
            inLanguage: "es-AR",
            isPartOf: { "@id": ID_SITIO },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: brands.length,
              itemListElement: brands.map((b, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: b.name,
                url: urlAbsoluta(`/marcas/${b.slug}`),
              })),
            },
          },
          breadcrumbLd(migas),
        )}
      />
      <div className="mx-auto max-w-6xl px-4">
        <Breadcrumbs items={migas} />
      </div>
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
    </>
  );
}
