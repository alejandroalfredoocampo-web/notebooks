"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  name: string;
  tier: string;
  featured: boolean;
  featuredUntil: string | null;
  cpcArs: number | null;
  clicks: number;
  leads: number;
};

function fmtARS(n: number) {
  return "$" + Math.round(n).toLocaleString("es-AR");
}

export default function MonetizationManager({
  rows,
  defaultCpc,
  rangeLabel,
}: {
  rows: Row[];
  defaultCpc: number;
  rangeLabel: string;
}) {
  const router = useRouter();
  const [globalCpc, setGlobalCpc] = useState(String(defaultCpc));
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, Partial<Row>>>({});

  const val = (r: Row, k: keyof Row) => (local[r.id]?.[k] ?? r[k]) as never;
  const edit = (id: string, patch: Partial<Row>) =>
    setLocal((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  async function saveGlobal() {
    setSavingGlobal(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "default_cpc_ars", value: String(Math.round(Number(globalCpc) || 0)) }),
    });
    setSavingGlobal(false);
    router.refresh();
  }

  async function saveRow(r: Row) {
    setSavingId(r.id);
    const l = local[r.id] ?? {};
    await fetch("/api/admin/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: r.id,
        tier: l.tier ?? r.tier,
        featured: l.featured ?? r.featured,
        featuredUntil: l.featuredUntil ?? r.featuredUntil,
        cpcArs: (l.cpcArs ?? r.cpcArs) === null || (l.cpcArs ?? r.cpcArs) === undefined ? null : Number(l.cpcArs ?? r.cpcArs),
      }),
    });
    setSavingId(null);
    setLocal((s) => ({ ...s, [r.id]: {} }));
    router.refresh();
  }

  const gc = Math.round(Number(globalCpc) || 0);
  const field = "rounded-lg border border-slate-300 px-2 py-1 text-[13px] outline-none focus:border-brand-blue";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-[12px] font-bold">CPC global por defecto (ARS)</label>
          <input className={field} type="number" min={0} value={globalCpc} onChange={(e) => setGlobalCpc(e.target.value)} />
        </div>
        <button onClick={saveGlobal} disabled={savingGlobal} className="rounded-lg bg-brand-blue px-3 py-1.5 text-[13px] font-bold text-white hover:bg-brand-darker disabled:opacity-60">
          {savingGlobal ? "Guardando…" : "Guardar CPC global"}
        </button>
        <span className="text-[12px] text-slate-400">Cada tienda puede tener su propio CPC (override); si está vacío, usa el global.</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2.5">Tienda</th>
              <th className="px-3 py-2.5">Tier</th>
              <th className="px-3 py-2.5">Destacada</th>
              <th className="px-3 py-2.5">Hasta</th>
              <th className="px-3 py-2.5">CPC (override)</th>
              <th className="px-3 py-2.5">Clicks {rangeLabel}</th>
              <th className="px-3 py-2.5">A facturar</th>
              <th className="px-3 py-2.5">Leads RFQ</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cpc = (val(r, "cpcArs") as number | null) ?? gc;
              const amount = (cpc || 0) * r.clicks;
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2.5 font-semibold">{r.name}</td>
                  <td className="px-3 py-2.5">
                    <select className={field} value={val(r, "tier")} onChange={(e) => edit(r.id, { tier: e.target.value })}>
                      <option value="free">free</option>
                      <option value="verified">Verificada</option>
                      <option value="featured">Verificada+</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input type="checkbox" className="accent-brand-blue" checked={Boolean(val(r, "featured"))} onChange={(e) => edit(r.id, { featured: e.target.checked })} />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="date" className={field} value={(val(r, "featuredUntil") as string) ?? ""} onChange={(e) => edit(r.id, { featuredUntil: e.target.value || null })} />
                  </td>
                  <td className="px-3 py-2.5">
                    <input type="number" min={0} placeholder={`global ${gc}`} className={`${field} w-24`} value={(val(r, "cpcArs") as number | null) ?? ""} onChange={(e) => edit(r.id, { cpcArs: e.target.value === "" ? null : Number(e.target.value) })} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{r.clicks}</td>
                  <td className="px-3 py-2.5 font-bold tabular-nums">{amount ? fmtARS(amount) : "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums">{r.leads || "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => saveRow(r)} disabled={savingId === r.id} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-brand-blue hover:bg-blue-50 disabled:opacity-60">
                      {savingId === r.id ? "…" : "Guardar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-slate-400">
        "A facturar" = clicks del período × CPC efectivo (override de la tienda o el global). Estimación
        para facturación offline; no cobra automáticamente.
      </p>
    </div>
  );
}
