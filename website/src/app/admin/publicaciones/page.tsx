import { getAllListings, getAdminStores } from "@/lib/adminData";
import PublicationsTable from "@/components/admin/PublicationsTable";

export const dynamic = "force-dynamic";

export default async function PublicacionesPage() {
  const [listings, stores] = await Promise.all([getAllListings(), getAdminStores()]);

  const all = listings.map((l) => ({
    id: l.id,
    storeId: l.storeId,
    title: l.titleRaw,
    priceCash: l.priceCash,
    url: l.url,
    source: l.source === "manual" ? "propia" : "scrapeada",
    model: l.matchStatus === "confirmed" ? l.modelName : null,
    rejected: l.matchStatus === "rejected",
  }));

  const storeNames = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Publicaciones</h1>
      <p className="mb-4 text-sm text-slate-500">
        Todas las publicaciones indexadas ({all.length}) — scrapeadas y cargadas a mano.
      </p>
      {all.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Todavía no hay publicaciones en la base.
        </div>
      ) : (
        <PublicationsTable items={all} storeNames={storeNames} />
      )}
    </div>
  );
}
