"use client";

import { useMemo, useState } from "react";

type Row = {
  id: string;
  storeId: string;
  title: string;
  priceCash: number;
  url: string;
  source: string;
  model: string | null;
  rejected: boolean;
};

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export default function PublicationsTable({
  items,
  storeNames,
}: {
  items: Row[];
  storeNames: Record<string, string>;
}) {
  const [q, setQ] = useState("");
  const [store, setStore] = useState("");
  const [limit, setLimit] = useState(50);

  const stores = useMemo(
    () => [...new Set(items.map((i) => i.storeId))].sort((a, b) => (storeNames[a] ?? a).localeCompare(storeNames[b] ?? b)),
    [items, storeNames]
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (!store || i.storeId === store) &&
        (!query || i.title.toLowerCase().includes(query))
    );
  }, [items, q, store]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setLimit(50); }}
          placeholder="Buscar por título…"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <select
          value={store}
          onChange={(e) => { setStore(e.target.value); setLimit(50); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
        >
          <option value="">Todas las tiendas</option>
          {stores.map((s) => (
            <option key={s} value={s}>{storeNames[s] ?? s}</option>
          ))}
        </select>
      </div>

      <div className="text-[13px] text-slate-500">{filtered.length} resultados</div>

      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Publicación</th>
              <th className="px-4 py-3">Tienda</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Origen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, limit).map((r) => (
              <tr key={r.id} className={`border-b border-slate-100 last:border-0 ${r.rejected ? "opacity-50" : ""}`}>
                <td className="max-w-[320px] px-4 py-3 font-semibold">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="hover:text-brand-blue">
                      {r.title}
                    </a>
                  ) : (
                    r.title
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{storeNames[r.storeId] ?? r.storeId}</td>
                <td className="whitespace-nowrap px-4 py-3 font-bold">{fmtARS(r.priceCash)}</td>
                <td className="px-4 py-3">
                  {r.model ? (
                    <span className="text-slate-700">{r.model}</span>
                  ) : (
                    <span className="text-slate-400">{r.rejected ? "rechazada" : "— sin asignar"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      r.source === "propia" ? "bg-blue-50 text-brand-blue" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {r.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > limit && (
        <button
          onClick={() => setLimit((l) => l + 50)}
          className="mx-auto mt-3 block rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Mostrar más ({filtered.length - limit} restantes)
        </button>
      )}
    </div>
  );
}
