import {
  getRawListings,
  getManualListings,
  getMatchDecisions,
  adminStores,
  modelName,
} from "@/lib/adminData";
import PublicationsTable from "@/components/admin/PublicationsTable";

export const dynamic = "force-dynamic";

export default async function PublicacionesPage() {
  const [raw, manual, decisions] = await Promise.all([
    getRawListings(),
    getManualListings(),
    getMatchDecisions(),
  ]);

  const all = [...manual, ...raw].map((l) => {
    const decision = decisions[l.id];
    const resolvedModelId =
      decision?.action === "confirmed" ? decision.modelId : l.modelId ?? null;
    return {
      id: l.id,
      storeId: l.storeId,
      title: l.titleRaw,
      priceCash: l.priceCash,
      url: l.url,
      source: l.source === "manual" ? "propia" : "scrapeada",
      model: modelName(resolvedModelId),
      rejected: decision?.action === "rejected",
    };
  });

  const storeNames = Object.fromEntries(adminStores.map((s) => [s.id, s.name]));

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Publicaciones</h1>
      <p className="mb-4 text-sm text-slate-500">
        Todas las publicaciones indexadas ({all.length}) — scrapeadas y cargadas a mano.
      </p>
      {all.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Todavía no hay publicaciones. Corré <code className="rounded bg-slate-100 px-1">npm run scrape</code> o cargá una a mano.
        </div>
      ) : (
        <PublicationsTable items={all} storeNames={storeNames} />
      )}
    </div>
  );
}
