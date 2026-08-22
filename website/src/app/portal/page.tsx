"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/useUser";
import { getSupabaseBrowser, authConfigured } from "@/lib/supabaseBrowser";
import { fmtARS, fmtDate } from "@/lib/format";

type Membership = { storeId: string; storeName: string };
type Request = {
  id: string;
  status: string;
  model_id: string | null;
  specs_note: string | null;
  quantity: number;
  needed_by: string | null;
  company_name: string;
  province: string | null;
  message: string | null;
  created_at: string;
};
type Quote = { request_id: string; unit_price: number; total_price: number | null; status: string };
type InsightRow = {
  modelId: string; brand: string; name: string; brandSlug: string; slug: string;
  storePrice: number; bestPrice: number; marketAvg: number; rank: number;
  totalStores: number; gapToBestPct: number; isCheapest: boolean;
};
type Insights = { kpis: { modelsSold: number; wins: number; avgGapPct: number }; rows: InsightRow[] };
type Traffic = { total: number; last30: number; top: { modelId: string; count: number }[] };

/**
 * ID de la cotización.
 *
 * `crypto.randomUUID()` en vez de `Math.random()`: el generador de V8 no es criptográfico
 * y su estado se reconstruye observando salidas. Acá el id identifica una cotización
 * comercial, así que no conviene que sea adivinable.
 */
function genId() {
  return "q_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export default function PortalPage() {
  const { user, loading } = useUser();
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined);
  const [requests, setRequests] = useState<Request[]>([]);
  const [modelNames, setModelNames] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [traffic, setTraffic] = useState<Traffic | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!user || !sb) {
      if (!user) setMembership(null);
      return;
    }
    (async () => {
      const { data: m } = await sb.from("store_members").select("store_id, stores(name)").maybeSingle();
      if (!m) {
        setMembership(null);
        return;
      }
      const storeName = (m as { stores?: { name?: string } }).stores?.name ?? (m.store_id as string);
      const storeId = m.store_id as string;
      setMembership({ storeId, storeName });

      // Inteligencia de precios (spec 11): posición competitiva de la tienda.
      //
      // El informe dejó de ser público (ver `lib/sesionTienda.ts`), así que ahora va con el
      // token de la sesión. Se lee en el momento del pedido y no antes: Supabase lo rota,
      // y un token capturado al montar el componente puede estar vencido cuando se usa.
      (async () => {
        const { data: s } = await sb.auth.getSession();
        const token = s.session?.access_token;
        if (!token) return;
        try {
          const r = await fetch(`/api/portal/insights?storeId=${encodeURIComponent(storeId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!r.ok) return;
          const d = await r.json();
          setInsights(d?.rows ? d : null);
        } catch {
          /* el panel de insights simplemente no se muestra */
        }
      })();

      // Panel de tráfico: click-outs que le mandamos a la tienda (RLS: solo los suyos).
      (async () => {
        const { data: clicks } = await sb.from("click_outs").select("model_id, created_at").eq("store_id", storeId).limit(100000);
        const cl = (clicks ?? []) as { model_id: string | null; created_at: string }[];
        const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const byModel = new Map<string, number>();
        let last30 = 0;
        for (const c of cl) {
          if (new Date(c.created_at).getTime() >= cutoff) last30++;
          if (c.model_id) byModel.set(c.model_id, (byModel.get(c.model_id) ?? 0) + 1);
        }
        const top = [...byModel.entries()].map(([modelId, count]) => ({ modelId, count })).sort((a, b) => b.count - a.count).slice(0, 5);
        setTraffic({ total: cl.length, last30, top });
        const need = top.map((t) => t.modelId);
        if (need.length) {
          const res = await fetch(`/api/models/summary?ids=${need.join(",")}`);
          const data = await res.json();
          setModelNames((prev) => {
            const next = { ...prev };
            for (const mm of data.models ?? []) next[mm.id] = `${mm.brand} ${mm.name}`;
            return next;
          });
        }
      })();

      const { data: reqs } = await sb
        .from("bulk_requests")
        .select("*")
        .in("status", ["open", "quoting"])
        .order("created_at", { ascending: false });
      const list = (reqs ?? []) as Request[];
      setRequests(list);

      const ids = [...new Set(list.map((r) => r.model_id).filter(Boolean))] as string[];
      if (ids.length) {
        const res = await fetch(`/api/models/summary?ids=${ids.join(",")}`);
        const data = await res.json();
        const map: Record<string, string> = {};
        for (const mm of data.models ?? []) map[mm.id] = `${mm.brand} ${mm.name}`;
        setModelNames(map);
      }

      const { data: myQuotes } = await sb.from("bulk_quotes").select("request_id, unit_price, total_price, status");
      const qmap: Record<string, Quote> = {};
      for (const q of (myQuotes ?? []) as Quote[]) qmap[q.request_id] = q;
      setQuotes(qmap);
    })();
  }, [user]);

  async function submitQuote(r: Request) {
    const sb = getSupabaseBrowser();
    if (!sb || !membership) return;
    const unit = Math.round(Number(draft[r.id]));
    if (!Number.isFinite(unit) || unit <= 0) return;
    setBusy(r.id);
    const total = unit * r.quantity;
    const { error } = await sb.from("bulk_quotes").insert({
      id: genId(),
      request_id: r.id,
      store_id: membership.storeId,
      unit_price: unit,
      total_price: total,
    });
    if (!error) {
      setQuotes((q) => ({ ...q, [r.id]: { request_id: r.id, unit_price: unit, total_price: total, status: "submitted" } }));
    }
    setBusy(null);
  }

  // --- estados de carga / gating ---
  if (!authConfigured()) {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-slate-500">El portal todavía no está disponible.</div>;
  }
  if (loading || membership === undefined) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-400">Cargando…</div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Portal para tiendas</h1>
        <p className="mt-2 text-sm text-slate-500">
          Ingresá con la cuenta de tu tienda para ver las solicitudes de compra por volumen y cotizar.
        </p>
        <Link href="/ingresar" className="mt-5 inline-block rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-darker">
          Ingresar
        </Link>
      </div>
    );
  }
  if (!membership) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Portal para tiendas</h1>
        <p className="mt-2 text-sm text-slate-500">
          Tu cuenta ({user.email}) todavía no está vinculada a una tienda. Escribinos para habilitarte
          el acceso a las solicitudes corporativas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="text-[11px] font-bold uppercase tracking-widest text-brand-blue">Portal · {membership.storeName}</div>

      {/* Inteligencia de precios (spec 11) */}
      {insights && insights.rows.length > 0 && (
        <section className="mt-2">
          <h1 className="text-2xl font-extrabold tracking-tight">Inteligencia de precios</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cómo estás vs. el resto del mercado en los modelos que vendés. Datos en vivo.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-2xl font-extrabold tracking-tight">{insights.kpis.modelsSold}</div>
              <div className="text-[12px] font-semibold text-slate-500">modelos que vendés</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
              <div className="text-2xl font-extrabold tracking-tight text-brand-green">{insights.kpis.wins}</div>
              <div className="text-[12px] font-semibold text-slate-500">donde sos la más barata</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-2xl font-extrabold tracking-tight">{insights.kpis.avgGapPct}%</div>
              <div className="text-[12px] font-semibold text-slate-500">gap promedio al mejor precio</div>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2.5">Modelo</th>
                  <th className="px-3 py-2.5">Tu precio</th>
                  <th className="px-3 py-2.5">Mejor</th>
                  <th className="px-3 py-2.5">Promedio</th>
                  <th className="px-3 py-2.5">Tu puesto</th>
                  <th className="px-3 py-2.5">Gap</th>
                </tr>
              </thead>
              <tbody>
                {insights.rows.map((r) => (
                  <tr key={r.modelId} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 font-semibold">
                      <a href={`/notebooks/${r.brandSlug}/${r.slug}`} className="hover:text-brand-blue hover:underline">
                        {r.brand} {r.name}
                      </a>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-bold">{fmtARS(r.storePrice)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-500">{fmtARS(r.bestPrice)}</td>
                    <td className="px-3 py-2.5 tabular-nums text-slate-500">{fmtARS(r.marketAvg)}</td>
                    <td className="px-3 py-2.5">
                      {r.isCheapest ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-brand-green">★ #1</span>
                      ) : (
                        <span className="text-slate-500">{r.rank}º de {r.totalStores}</span>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 tabular-nums font-semibold ${r.gapToBestPct > 0 ? "text-red-600" : "text-brand-green"}`}>
                      {r.gapToBestPct > 0 ? `+${r.gapToBestPct}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-slate-400">
            Ordenado por oportunidad (mayor gap primero): dónde bajar el precio te haría ganar posición.
          </p>
        </section>
      )}

      {/* Panel de tráfico */}
      {traffic && traffic.total > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-extrabold tracking-tight">Tu tráfico</h2>
          <p className="mt-1 text-sm text-slate-500">Visitas que te enviamos desde el comparador (click-outs).</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-2xl font-extrabold tracking-tight">{traffic.total}</div>
              <div className="text-[12px] font-semibold text-slate-500">clics totales</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-2xl font-extrabold tracking-tight">{traffic.last30}</div>
              <div className="text-[12px] font-semibold text-slate-500">últimos 30 días</div>
            </div>
          </div>
          {traffic.top.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[12px] font-bold text-slate-500">Modelos con más clics</div>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-[13px]">
                {traffic.top.map((t) => (
                  <li key={t.modelId} className="flex items-center justify-between px-3 py-2">
                    <span className="truncate">{modelNames[t.modelId] ?? t.modelId}</span>
                    <span className="shrink-0 font-bold tabular-nums">{t.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <h2 className="mt-8 text-xl font-extrabold tracking-tight">Solicitudes de compra por volumen</h2>
      <p className="mt-1 text-sm text-slate-500">
        Cotizá las solicitudes abiertas. La empresa compara las propuestas y te contacta si elige la tuya.
      </p>

      {requests.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No hay solicitudes abiertas por ahora.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map((r) => {
            const mine = quotes[r.id];
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-extrabold">
                      {r.company_name}
                      <span className="ml-2 text-[12px] font-normal text-slate-400">{fmtDate(r.created_at)}</span>
                    </div>
                    <div className="text-[13px] text-slate-600">
                      <b>{r.quantity}</b> equipos ·{" "}
                      {r.model_id ? modelNames[r.model_id] ?? r.model_id : r.specs_note || "—"}
                      {r.needed_by && <span className="text-slate-400"> · para {fmtDate(r.needed_by)}</span>}
                      {r.province && <span className="text-slate-400"> · {r.province}</span>}
                    </div>
                    {r.message && <p className="mt-1 text-[13px] text-slate-500">“{r.message}”</p>}
                  </div>
                </div>

                {mine ? (
                  <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">
                    ✓ Cotizaste {fmtARS(mine.unit_price)} / u
                    {mine.total_price ? <span className="font-normal"> · total {fmtARS(mine.total_price)}</span> : null}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-[13px] text-slate-500">Precio por unidad:</span>
                    <input
                      type="number"
                      min={1}
                      value={draft[r.id] ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                      placeholder="$ por equipo"
                      className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-blue"
                    />
                    <button
                      onClick={() => submitQuote(r)}
                      disabled={busy === r.id}
                      className="rounded-lg bg-brand-blue px-4 py-1.5 text-[13px] font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
                    >
                      {busy === r.id ? "Enviando…" : "Cotizar"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
