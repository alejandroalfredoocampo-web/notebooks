import type { Metadata } from "next";
import { getStores, getModels } from "@/lib/data";

export const metadata: Metadata = {
  title: "Tiendas indexadas",
  description:
    "Las tiendas argentinas que monitoreamos para comparar precios de notebooks. Indexación gratuita para tiendas online establecidas.",
};

export default function TiendasPage() {
  const stores = getStores();
  const models = getModels();

  const offersByStore = new Map<string, number>();
  for (const m of models) {
    for (const l of m.listings) {
      offersByStore.set(l.storeId, (offersByStore.get(l.storeId) ?? 0) + 1);
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
            <div className="font-extrabold">{s.name}</div>
            <div className="text-xs text-slate-500">{s.type}</div>
            <div className="mt-2.5 space-y-1 text-[11px] text-slate-400">
              <div>📍 {s.city}</div>
              {s.physicalStore && <div>🏬 Local físico</div>}
              <div>
                💻 {offersByStore.get(s.id) ?? 0} ofertas activas
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-brand-sky bg-blue-50 p-6">
        <h2 className="font-extrabold text-brand-darker">
          ¿Tenés una tienda? Sumate gratis
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Indexamos tiendas online establecidas con precios en pesos y stock
          actualizado. No cobramos por listar: el índice completo es nuestro
          producto. Escribinos a{" "}
          <a href="mailto:tiendas@notebooks.com.ar" className="font-bold text-brand-blue">
            tiendas@notebooks.com.ar
          </a>
        </p>
      </div>
    </div>
  );
}
