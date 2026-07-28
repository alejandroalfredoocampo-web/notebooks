import type { Metadata } from "next";
import { Suspense } from "react";
import { filterModels } from "@/lib/data";
import ModelCard from "@/components/ModelCard";
import Filters from "@/components/Filters";
import SortSelect from "@/components/SortSelect";

export const metadata: Metadata = {
  title: "Notebooks en Argentina — compará precios de todas las tiendas",
  description:
    "Todas las notebooks a la venta en Argentina con el mejor precio de cada tienda. Filtrá por marca, procesador, RAM, placa de video y precio.",
};

// Filtra por querystring en el servidor, leyendo de Supabase en cada request.
export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

function arr(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function NotebooksPage({ searchParams }: { searchParams: SP }) {
  const models = await filterModels({
    q: typeof searchParams.q === "string" ? searchParams.q : undefined,
    brands: arr(searchParams.brand),
    cpus: arr(searchParams.cpu),
    rams: arr(searchParams.ram),
    gpu: arr(searchParams.gpu),
    price: arr(searchParams.price),
    fin: typeof searchParams.fin === "string" ? searchParams.fin : undefined,
    use: typeof searchParams.use === "string" ? searchParams.use : undefined,
    sort: typeof searchParams.sort === "string" ? searchParams.sort : undefined,
  });

  const totalOffers = models.reduce((s, m) => s + m.listings.length, 0);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 md:grid-cols-[250px_1fr]">
      <Suspense>
        <Filters />
      </Suspense>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            <b className="text-slate-900">{models.length}</b> modelos encontrados{" "}
            <span className="text-slate-400">· {totalOffers} ofertas comparadas</span>
          </div>
          <Suspense>
            <SortSelect />
          </Suspense>
        </div>
        {models.length ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {models.map((m) => (
              <ModelCard key={m.id} model={m} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No encontramos modelos con esos filtros. Probá quitando alguno.
          </p>
        )}
      </div>
    </div>
  );
}
