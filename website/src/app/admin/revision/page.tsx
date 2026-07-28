import { getReviewQueue, getAdminModels, getAdminStores } from "@/lib/adminData";
import ReviewQueue from "@/components/admin/ReviewQueue";

export const dynamic = "force-dynamic";

export default async function RevisionPage() {
  const [queue, models, stores] = await Promise.all([
    getReviewQueue(),
    getAdminModels(),
    getAdminStores(),
  ]);

  const modelOptions = models.map((m) => ({ id: m.id, label: `${m.brand} ${m.name}` }));
  const storeNames = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  const items = queue.map((l) => ({
    id: l.id,
    storeId: l.storeId,
    titleRaw: l.titleRaw,
    priceCash: l.priceCash,
    image: l.image,
    matchConfidence: l.matchConfidence,
    matchCandidate: l.matchCandidate,
  }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Revisión de matcheos</h1>
      <p className="mb-4 text-sm text-slate-500">
        Publicaciones que el matcheo automático no pudo asignar con confianza. Confirmá el modelo
        correcto, rechazá la publicación, o creá un modelo nuevo. Los cambios impactan en el sitio en vivo.
      </p>
      {queue.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          No hay publicaciones pendientes de revisión. Cuando el scraper cargue publicaciones nuevas
          sin matchear, aparecen acá.
        </div>
      ) : (
        <ReviewQueue items={items} models={modelOptions} storeNames={storeNames} initialDecisions={{}} />
      )}
    </div>
  );
}
