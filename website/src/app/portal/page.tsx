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

function genId() {
  return "q_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export default function PortalPage() {
  const { user, loading } = useUser();
  const [membership, setMembership] = useState<Membership | null | undefined>(undefined);
  const [requests, setRequests] = useState<Request[]>([]);
  const [modelNames, setModelNames] = useState<Record<string, string>>({});
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

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
      setMembership({ storeId: m.store_id as string, storeName });

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
      <h1 className="text-2xl font-extrabold tracking-tight">Solicitudes de compra por volumen</h1>
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
