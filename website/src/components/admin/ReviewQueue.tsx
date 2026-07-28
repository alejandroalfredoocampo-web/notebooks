"use client";

import { useMemo, useState } from "react";

type Item = {
  id: string;
  storeId: string;
  titleRaw: string;
  priceCash: number;
  image: string | null;
  matchConfidence: number;
  matchCandidate: string | null;
};
type Decision = { action: "confirmed" | "rejected"; modelId: string | null };
type Model = { id: string; label: string };

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function ReviewQueue({
  items,
  models,
  storeNames,
  initialDecisions,
}: {
  items: Item[];
  models: Model[];
  storeNames: Record<string, string>;
  initialDecisions: Record<string, Decision>;
}) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>(initialDecisions);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "confirmed" | "rejected">("pending");
  const [limit, setLimit] = useState(40);

  const counts = useMemo(() => {
    let pending = 0, confirmed = 0, rejected = 0;
    for (const it of items) {
      const d = decisions[it.id];
      if (!d) pending++;
      else if (d.action === "confirmed") confirmed++;
      else rejected++;
    }
    return { pending, confirmed, rejected };
  }, [items, decisions]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const d = decisions[it.id];
      if (tab === "pending") return !d;
      if (tab === "confirmed") return d?.action === "confirmed";
      return d?.action === "rejected";
    });
  }, [items, decisions, tab]);

  const pickFor = (it: Item) => picks[it.id] ?? it.matchCandidate ?? "";

  async function decide(it: Item, action: "confirmed" | "rejected") {
    const modelId = action === "confirmed" ? pickFor(it) : null;
    if (action === "confirmed" && !modelId) {
      alert("Elegí un modelo antes de confirmar.");
      return;
    }
    setBusy(it.id);
    const res = await fetch("/api/admin/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: it.id, action, modelId, title: it.titleRaw }),
    });
    setBusy(null);
    if (res.ok) {
      setDecisions((d) => ({ ...d, [it.id]: { action, modelId } }));
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "No se pudo guardar la decisión");
    }
  }

  const TABS = [
    { key: "pending", label: `Pendientes (${counts.pending})` },
    { key: "confirmed", label: `Confirmados (${counts.confirmed})` },
    { key: "rejected", label: `Rechazados (${counts.rejected})` },
  ] as const;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setLimit(40); }}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
              tab === t.key ? "bg-brand-blue text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No hay publicaciones en esta pestaña.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.slice(0, limit).map((it) => {
            const d = decisions[it.id];
            const conf = Math.round(it.matchConfidence * 100);
            return (
              <div key={it.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {it.image ? <img src={it.image} alt="" className="h-full w-full object-contain p-1" /> : "💻"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold leading-snug">{it.titleRaw}</div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          conf >= 65 ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {conf}% confianza
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12px] text-slate-500">
                      {storeNames[it.storeId] ?? it.storeId} · <b className="text-slate-700">{fmtARS(it.priceCash)}</b>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={pickFor(it)}
                        onChange={(e) => setPicks((p) => ({ ...p, [it.id]: e.target.value }))}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-[13px] outline-none focus:border-brand-blue"
                      >
                        <option value="">— Elegí un modelo —</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                            {m.id === it.matchCandidate ? "  (sugerido)" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => decide(it, "confirmed")}
                        disabled={busy === it.id}
                        className="rounded-lg bg-brand-green px-3 py-1.5 text-[13px] font-bold text-white transition hover:brightness-95 disabled:opacity-60"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => decide(it, "rejected")}
                        disabled={busy === it.id}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Rechazar
                      </button>
                      <a
                        href={`/admin/nuevo-modelo?from=${encodeURIComponent(it.id)}`}
                        className="rounded-lg border border-brand-blue px-3 py-1.5 text-[13px] font-bold text-brand-blue transition hover:bg-blue-50"
                        title="Ninguno de los modelos existentes corresponde: creá uno nuevo desde esta publicación"
                      >
                        + Crear modelo
                      </a>
                      {d && (
                        <span
                          className={`text-[12px] font-semibold ${
                            d.action === "confirmed" ? "text-brand-green" : "text-slate-400"
                          }`}
                        >
                          {d.action === "confirmed" ? "✓ Confirmado" : "✕ Rechazado"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length > limit && (
            <button
              onClick={() => setLimit((l) => l + 40)}
              className="mx-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Mostrar más ({filtered.length - limit} restantes)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
