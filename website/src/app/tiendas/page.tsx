import type { Metadata } from "next";
import { metaRuta } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { breadcrumbLd, grafo, tiendaLd, ID_SITIO } from "@/lib/schema";
import { urlAbsoluta } from "@/lib/site";
import Link from "next/link";
import { getStores, getModels } from "@/lib/data";
import StoreApplicationForm from "@/components/StoreApplicationForm";
import StoreRating from "@/components/StoreRating";
import StoreTierBadge from "@/components/StoreTierBadge";
import SponsoredStores from "@/components/SponsoredStores";

export const metadata: Metadata = metaRuta("/tiendas", {
  title: "Tiendas indexadas",
  description:
    "Las tiendas argentinas que monitoreamos para comparar precios de notebooks. Indexación gratuita para tiendas online establecidas.",
});

export const dynamic = "force-dynamic";

export default async function TiendasPage() {
  const [stores, models] = await Promise.all([getStores(), getModels()]);
  const migas: Miga[] = [
    { nombre: "Inicio", path: "/" },
    { nombre: "Tiendas", path: "/tiendas" },
  ];

  /**
   * El nodo de cada tienda va acá también, no sólo en su ficha.
   *
   * Comparte `@id` con el que emiten la ficha de la tienda y cada oferta de producto, así
   * que no son tres entidades: es la misma, declarada donde aparece. Es lo que permite que
   * un buscador entienda que el vendedor de una oferta es una empresa con reputación y
   * dirección, y no un nombre suelto en un `seller`.
   */
  const nodosDeTiendas = stores.map(tiendaLd);

  const offersByStore = new Map<string, number>();
  const interestFreeStores = new Set<string>();
  for (const m of models) {
    for (const l of m.listings) {
      offersByStore.set(l.storeId, (offersByStore.get(l.storeId) ?? 0) + 1);
      if (l.installments && l.installments.count * l.installments.amount <= l.priceCash * 1.02) {
        interestFreeStores.add(l.storeId);
      }
    }
  }

  return (
    <>
      <JsonLd
        data={grafo(
          {
            "@type": "CollectionPage",
            "@id": `${urlAbsoluta("/tiendas")}#coleccion`,
            url: urlAbsoluta("/tiendas"),
            name: "Tiendas de notebooks indexadas en Argentina",
            inLanguage: "es-AR",
            isPartOf: { "@id": ID_SITIO },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: stores.length,
              itemListElement: stores.map((t, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: t.name,
                url: urlAbsoluta(`/tiendas/${t.slug}`),
              })),
            },
          },
          ...nodosDeTiendas,
          breadcrumbLd(migas),
        )}
      />
      <div className="mx-auto max-w-6xl px-4">
        <Breadcrumbs items={migas} />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">
        Tiendas indexadas
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Monitoreamos estas tiendas varias veces por día. La indexación es
        gratuita: si tenés una tienda online de notebooks con stock y precios
        actualizados, escribinos y la sumamos.
      </p>

      <div className="mt-6">
        <SponsoredStores />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {stores.map((s) => (
          <Link
            key={s.id}
            href={`/tiendas/${s.slug}`}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-extrabold group-hover:text-brand-blue">{s.name}</div>
              <StoreTierBadge store={s} className="shrink-0" />
            </div>
            <div className="text-xs text-slate-500">{s.type}</div>
            <div className="mt-1">
              <StoreRating store={s} />
            </div>
            <div className="mt-2.5 space-y-1 text-[11px] text-slate-400">
              <div>📍 {s.city}</div>
              {s.physicalStore && <div>🏬 Local físico</div>}
              <div>💻 {offersByStore.get(s.id) ?? 0} ofertas activas</div>
              {interestFreeStores.has(s.id) && (
                <div className="font-semibold text-brand-green">💳 Cuotas sin interés</div>
              )}
            </div>
          </Link>
        ))}
      </div>

      <div id="sumate" className="mt-10 max-w-3xl scroll-mt-24">
        <StoreApplicationForm />
      </div>
    </div>
    </>
  );
}
