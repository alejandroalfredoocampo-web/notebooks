import Link from "next/link";
import {
  getReviewQueue,
  getRawListings,
  getManualListings,
  getMatchDecisions,
  adminModels,
  adminStores,
} from "@/lib/adminData";
import { usingDefaultCreds } from "@/lib/adminAuth";
import PublishButton from "@/components/admin/PublishButton";

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
  const [queue, raw, manual, decisions] = await Promise.all([
    getReviewQueue(),
    getRawListings(),
    getManualListings(),
    getMatchDecisions(),
  ]);

  const decidedIds = new Set(Object.keys(decisions));
  const pending = queue.filter((l) => !decidedIds.has(l.id)).length;
  const confirmed = Object.values(decisions).filter((d) => d.action === "confirmed").length;
  const rejected = Object.values(decisions).filter((d) => d.action === "rejected").length;
  const totalPubs = raw.length + manual.length;
  const empty = totalPubs === 0 && queue.length === 0;

  return (
    <div>
      {usingDefaultCreds && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-800">
          ⚠️ Estás usando credenciales por defecto. Seteá <code>ADMIN_PASSWORD</code> y{" "}
          <code>ADMIN_SESSION_TOKEN</code> en el entorno antes de exponer esto online.
        </div>
      )}

      <h1 className="mb-4 text-xl font-extrabold tracking-tight">Panel</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Publicaciones scrapeadas" value={raw.length} />
        <Stat label="Publicaciones propias" value={manual.length} hint="cargadas a mano" />
        <Stat label="Matcheos pendientes" value={pending} hint="esperando revisión" />
        <Stat label="Resueltos" value={confirmed + rejected} hint={`${confirmed} confirmados · ${rejected} rechazados`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Modelos canónicos" value={adminModels.length} />
        <Stat label="Tiendas" value={adminStores.length} />
      </div>

      {empty ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Todavía no hay datos del pipeline. Corré el scraper para poblar la cola de revisión:
          <pre className="mx-auto mt-3 w-fit rounded-lg bg-slate-900 px-4 py-2 text-left text-xs text-slate-100">npm run scrape</pre>
          También podés{" "}
          <Link href="/admin/nueva" className="font-semibold text-brand-blue">
            cargar una publicación a mano
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
            Ver publicaciones ({totalPubs})
          </Link>
          <Link
            href="/admin/nueva"
            className="rounded-lg border-[1.5px] border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            + Nueva publicación
          </Link>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">Publicar al sitio</h2>
        <p className="mb-3 mt-1 max-w-2xl text-[13px] text-slate-500">
          Hornea los matcheos confirmados y las publicaciones propias en el overlay que consume el
          front ({confirmed} confirmados · {manual.length} propias listas). No toca el seed curado.
        </p>
        <PublishButton />
      </div>
    </div>
  );
}
