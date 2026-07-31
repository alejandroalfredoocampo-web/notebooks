import Link from "next/link";
import { getFeaturedStores } from "@/lib/data";
import StoreRating from "./StoreRating";

/**
 * Módulo "Tiendas destacadas · Patrocinado" (spec 10). Slot pago, SIEMPRE rotulado
 * "Patrocinado" y separado del listado ordenado por precio. Se renderiza solo si
 * hay tiendas con destacado activo. No altera ningún ranking.
 */
export default async function SponsoredStores({ compact = false }: { compact?: boolean }) {
  const stores = await getFeaturedStores();
  if (!stores.length) return null;

  return (
    <section
      className={`rounded-xl border border-amber-200 bg-amber-50/40 p-4 ${compact ? "" : "shadow-sm"}`}
      aria-label="Tiendas destacadas (contenido patrocinado)"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          Patrocinado
        </span>
        <span className="text-[13px] font-bold text-slate-700">Tiendas destacadas</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
        {stores.map((s) => (
          <Link
            key={s.id}
            href={`/tiendas/${s.slug}`}
            className="flex items-center gap-2 rounded-lg border border-amber-100 bg-white p-2.5 transition hover:border-amber-300"
          >
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.logoUrl} alt={s.name} className="h-8 w-8 shrink-0 rounded object-contain" />
            ) : (
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-amber-100 text-sm" aria-hidden>🏬</span>
            )}
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold">{s.name}</div>
              <StoreRating store={s} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
