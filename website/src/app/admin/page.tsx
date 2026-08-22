import Link from "next/link";
import { getAllListings, getReviewQueue, getAdminModels, getAdminStores, getStoreApplications } from "@/lib/adminData";
import { contrasenaDebil } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="text-[13px] font-semibold text-slate-600">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

export default async function AdminDashboard() {
  const [listings, queue, models, stores, applications] = await Promise.all([
    getAllListings(),
    getReviewQueue(),
    getAdminModels(),
    getAdminStores(),
    getStoreApplications(),
  ]);

  const pendingApps = applications.filter((a) => a.status === "pending").length;
  const pending = queue.length;
  const confirmed = listings.filter((l) => l.matchStatus === "confirmed").length;
  const rejected = listings.filter((l) => l.matchStatus === "rejected").length;
  const manual = listings.filter((l) => l.source === "manual").length;
  const empty = listings.length === 0;

  return (
    <div>
      {contrasenaDebil && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          ⚠️ La <code>ADMIN_PASSWORD</code> de este entorno es corta o previsible. Es la única
          credencial que protege el catálogo entero: poné una de 16 caracteres o más.
        </div>
      )}

      <h1 className="mb-4 text-xl font-extrabold tracking-tight">Panel</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Publicaciones" value={listings.length} hint={`${manual} propias`} />
        <Stat label="Matcheos pendientes" value={pending} hint="esperando revisión" />
        <Stat label="Confirmados" value={confirmed} hint="visibles en el sitio" />
        <Stat label="Rechazados" value={rejected} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Modelos canónicos" value={models.length} />
        <Stat label="Tiendas" value={stores.length} />
        <Stat label="Solicitudes pendientes" value={pendingApps} hint="tiendas por revisar" />
      </div>

      {empty ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          No hay publicaciones en la base todavía. Corré el scraper (que escribe en Supabase) o{" "}
          <Link href="/admin/nueva" className="font-semibold text-brand-blue">
            cargá una a mano
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/revision"
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-darker"
          >
            Revisar matcheos ({pending}) →
          </Link>
          <Link
            href="/admin/publicaciones"
            className="rounded-lg border-[1.5px] border-brand-blue px-4 py-2 text-sm font-bold text-brand-blue transition hover:bg-blue-50"
          >
            Ver publicaciones ({listings.length})
          </Link>
          <Link
            href="/admin/nueva"
            className="rounded-lg border-[1.5px] border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            + Nueva publicación
          </Link>
        </div>
      )}

      <p className="mt-6 text-[12px] text-slate-400">
        Los cambios impactan en el sitio en vivo (sin republicar): las publicaciones confirmadas se
        muestran al instante.
      </p>
    </div>
  );
}
