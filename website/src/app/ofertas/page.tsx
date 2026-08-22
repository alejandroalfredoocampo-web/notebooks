import type { Metadata } from "next";
import { metaRuta } from "@/lib/seo";
import { getDeals } from "@/lib/data";
import ModelCard from "@/components/ModelCard";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs, { type Miga } from "@/components/Breadcrumbs";
import { breadcrumbLd, coleccionLd, grafo } from "@/lib/schema";

export const metadata: Metadata = metaRuta("/ofertas", {
  title: "Ofertas verificadas de notebooks",
  description:
    "Notebooks que bajaron de precio de verdad, verificadas contra el historial de los últimos 90 días. Sin ofertas infladas.",
});

export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  const deals = await getDeals();
  const migas: Miga[] = [
    { nombre: "Inicio", path: "/" },
    { nombre: "Ofertas", path: "/ofertas" },
  ];

  return (
    <>
      <JsonLd
        data={grafo(
          coleccionLd({
            path: "/ofertas",
            nombre: "Ofertas verificadas de notebooks",
            descripcion:
              "Modelos cuyo mejor precio de hoy está al menos 5% por debajo de su promedio de los últimos 90 días.",
            items: deals.slice(0, 100).map((m) => ({
              nombre: `${m.brand} ${m.name}`,
              path: `/notebooks/${m.brandSlug}/${m.slug}`,
            })),
          }),
          breadcrumbLd(migas),
        )}
      />
      <div className="mx-auto max-w-6xl px-4">
        <Breadcrumbs items={migas} />
      </div>
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          🔥 Ofertas verificadas
        </h1>
        <p className="text-sm text-slate-500">
          Solo bajadas reales contra el historial de los últimos 90 días
        </p>
      </div>
      {deals.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {deals.map((m) => (
            <ModelCard key={m.id} model={m} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Hoy no hay bajadas de precio verificadas. Volvé mañana o creá una
          alerta en el modelo que te interesa.
        </p>
      )}
    </div>
    </>
  );
}
