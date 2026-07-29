import { getBulkRequests, getAdminModels } from "@/lib/adminData";
import { fmtDate } from "@/lib/format";
import BulkStatusSelect from "@/components/admin/BulkStatusSelect";

export const dynamic = "force-dynamic";

export default async function AdminCorporativoPage() {
  let requests, models;
  try {
    [requests, models] = await Promise.all([getBulkRequests(), getAdminModels()]);
  } catch (e) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        No se pudo leer las solicitudes. ¿Corriste la migración <code>0009_bulk.sql</code> en Supabase?
        <div className="mt-2 text-[12px] text-amber-700">{e instanceof Error ? e.message : String(e)}</div>
      </div>
    );
  }

  const modelName = new Map(models.map((m) => [m.id, `${m.brand} ${m.name}`]));
  const openCount = requests.filter((r) => r.status === "open").length;

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">
        Solicitudes corporativas ({requests.length})
      </h1>
      <p className="mb-4 text-[13px] text-slate-500">
        {openCount} abiertas. Recopilá cotizaciones de las tiendas y respondé por email.
      </p>

      {requests.length ? (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-extrabold">
                    {r.companyName}
                    <span className="ml-2 text-[12px] font-normal text-slate-400">{fmtDate(r.createdAt)}</span>
                  </div>
                  <div className="text-[13px] text-slate-600">
                    <b>{r.quantity}</b> equipos ·{" "}
                    {r.modelId ? modelName.get(r.modelId) ?? r.modelId : r.specsNote || "—"}
                    {r.neededBy && <span className="text-slate-400"> · para {fmtDate(r.neededBy)}</span>}
                  </div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    ✉️ <a href={`mailto:${r.contactEmail}`} className="text-brand-blue hover:underline">{r.contactEmail}</a>
                    {r.contactPhone && <span> · 📞 {r.contactPhone}</span>}
                    {r.contactName && <span> · {r.contactName}</span>}
                    {r.province && <span> · {r.province}</span>}
                    {r.cuit && <span> · CUIT {r.cuit}</span>}
                  </div>
                  {r.message && <p className="mt-1.5 text-[13px] text-slate-500">“{r.message}”</p>}
                </div>
                <BulkStatusSelect id={r.id} status={r.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Todavía no hay solicitudes corporativas.
        </p>
      )}
    </div>
  );
}
