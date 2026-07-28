import { getReviewQueue, getMatchDecisions, adminModels, adminStores } from "@/lib/adminData";
import ReviewQueue from "@/components/admin/ReviewQueue";

export const dynamic = "force-dynamic";

export default async function RevisionPage() {
  const [queue, decisions] = await Promise.all([getReviewQueue(), getMatchDecisions()]);

  const modelOptions = adminModels
    .map((m) => ({ id: m.id, label: `${m.brand} ${m.name}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const storeNames = Object.fromEntries(adminStores.map((s) => [s.id, s.name]));

  // Solo lo necesario al cliente
  const items = queue
    .map((l) => ({
      id: l.id,
      storeId: l.storeId,
      titleRaw: l.titleRaw,
      priceCash: l.priceCash,
      image: l.image ?? null,
      matchConfidence: l.matchConfidence ?? 0,
      matchCandidate: l.matchCandidate ?? null,
    }))
    .sort((a, b) => b.matchConfidence - a.matchConfidence);

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Revisión de matcheos</h1>
      <p className="mb-4 text-sm text-slate-500">
        Publicaciones que el matcheo automático no pudo asignar con confianza. Confirmá el modelo
        correcto o rechazá la publicación.
      </p>
      {queue.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          No hay cola de revisión. Corré <code className="rounded bg-slate-100 px-1">npm run scrape</code> para generarla.
        </div>
      ) : (
        <ReviewQueue
          items={items}
          models={modelOptions}
          storeNames={storeNames}
          initialDecisions={decisions}
        />
      )}
    </div>
  );
}
