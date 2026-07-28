import type { Metadata } from "next";
import { getStores, getModels } from "@/lib/data";
import StoreApplicationForm from "@/components/StoreApplicationForm";

export const metadata: Metadata = {
  title: "Tiendas indexadas",
  description:
    "Las tiendas argentinas que monitoreamos para comparar precios de notebooks. Indexación gratuita para tiendas online establecidas.",
};

export const dynamic = "force-dynamic";

export default async function TiendasPage() {
  const [stores, models] = await Promise.all([getStores(), getModels()]);

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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">
        Tiendas indexadas
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Monitoreamos estas tiendas varias veces por día. La indexación es
        gratuita: si tenés una tienda online de notebooks con stock y precios
        actualizados, escribinos y la sumamos.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {stores.map((s) => (
          <div
            key={s.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-extrabold">{s.name}</div>
              {s.verified && (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  ✓ Verificada
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">{s.type}</div>
            <div className="mt-2.5 space-y-1 text-[11px] text-slate-400">
              <div>📍 {s.city}</div>
              {s.physicalStore && <div>🏬 Local físico</div>}
              <div>💻 {offersByStore.get(s.id) ?? 0} ofertas activas</div>
              {interestFreeStores.has(s.id) && (
                <div className="font-semibold text-brand-green">💳 Cuotas sin interés</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div id="sumate" className="mt-10 max-w-3xl scroll-mt-24">
        <StoreApplicationForm />
      </div>
    </div>
  );
}
