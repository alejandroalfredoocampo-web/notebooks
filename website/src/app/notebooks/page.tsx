import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { filterModels } from "@/lib/data";
import { parseQuery } from "@/lib/parseQuery";
import ModelCard from "@/components/ModelCard";
import Filters from "@/components/Filters";
import SortSelect from "@/components/SortSelect";
import SponsoredStores from "@/components/SponsoredStores";

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
  const q = typeof searchParams.q === "string" ? searchParams.q : undefined;
  // Búsqueda por necesidad: interpreta presupuesto/uso/marca en lenguaje natural
  const parsed = q ? parseQuery(q) : null;
  const understood = parsed?.understood ?? false;

  const models = await filterModels({
    q: understood ? undefined : q, // si entendimos la necesidad, usamos filtros derivados
    brands: parsed?.brand ? [parsed.brand] : arr(searchParams.brand),
    cpus: arr(searchParams.cpu),
    rams: arr(searchParams.ram),
    storage: arr(searchParams.storage),
    screen: arr(searchParams.screen),
    gpu: arr(searchParams.gpu),
    price: parsed?.priceMax ? [`0-${parsed.priceMax}`] : arr(searchParams.price),
    fin: typeof searchParams.fin === "string" ? searchParams.fin : undefined,
    use: parsed?.use ?? (typeof searchParams.use === "string" ? searchParams.use : undefined),
    sort: typeof searchParams.sort === "string" ? searchParams.sort : undefined,
  });

  const totalOffers = models.reduce((s, m) => s + m.listings.length, 0);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 md:grid-cols-[250px_1fr]">
      <Suspense>
        <Filters />
      </Suspense>
      <div>
        <div className="mb-4">
          <SponsoredStores compact />
        </div>
        {understood && parsed && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[13px]">
            <span className="font-semibold text-brand-blue">🔎 Entendí tu búsqueda:</span>
            <span className="text-slate-600">{parsed.summary}</span>
            <Link href="/notebooks" className="ml-auto text-slate-400 hover:text-brand-blue">
              limpiar
            </Link>
          </div>
        )}
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
