"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtARS } from "@/lib/format";

type CM = {
  id: string;
  brand: string;
  name: string;
  brandSlug: string;
  slug: string;
  imageUrl: string | null;
  cpu: string;
  ramGb: number;
  storageGb: number;
  storageType: string;
  gpu: string;
  gpuType: string;
  screenSizeIn: number;
  screenResolution: string;
  os: string;
  bestPrice: number;
  storeCount: number;
  bestInstallment: { count: number; amount: number; interestFree: boolean } | null;
  maxInstallments: number;
  useLabel: string;
};

const storage = (gb: number, type: string) => `${gb >= 1000 ? gb / 1000 + " TB" : gb + " GB"} ${type}`;
const cuotasLabel = (m: CM) =>
  m.bestInstallment
    ? m.bestInstallment.interestFree
      ? `${m.bestInstallment.count}x sin interés`
      : `hasta ${m.maxInstallments} cuotas`
    : "—";

export default function CompareTool({ models, initialIds }: { models: CM[]; initialIds: string[] }) {
  const [ids, setIds] = useState<string[]>(initialIds);
  const byId = new Map(models.map((m) => [m.id, m]));
  const selected = ids.map((id) => byId.get(id)).filter(Boolean) as CM[];
  const canAdd = selected.length < 3;

  const add = (id: string) => { if (id && !ids.includes(id) && canAdd) setIds([...ids, id]); };
  const remove = (id: string) => setIds(ids.filter((x) => x !== id));

  const cheapest = selected.length > 1 ? Math.min(...selected.map((m) => m.bestPrice)) : -1;

  const ROWS: { label: string; render: (m: CM) => React.ReactNode; highlightCheapest?: boolean }[] = [
    { label: "Mejor precio", render: (m) => fmtARS(m.bestPrice), highlightCheapest: true },
    { label: "Cuotas", render: (m) => cuotasLabel(m) },
    { label: "Tiendas", render: (m) => `${m.storeCount}` },
    { label: "Procesador", render: (m) => m.cpu },
    { label: "Memoria RAM", render: (m) => `${m.ramGb} GB` },
    { label: "Almacenamiento", render: (m) => storage(m.storageGb, m.storageType) },
    { label: "Placa de video", render: (m) => m.gpu },
    { label: "Pantalla", render: (m) => `${m.screenSizeIn}" ${m.screenResolution}` },
    { label: "Sistema operativo", render: (m) => m.os },
    { label: "Recomendada para", render: (m) => m.useLabel },
  ];

  return (
    <div>
      {/* Selector para agregar modelos */}
      {canAdd && (
        <div className="mb-4">
          <select
            value=""
            onChange={(e) => add(e.target.value)}
            className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue"
          >
            <option value="">+ Agregar una notebook para comparar…</option>
            {models
              .filter((m) => !ids.includes(m.id))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.brand} {m.name} — {fmtARS(m.bestPrice)}
                </option>
              ))}
          </select>
        </div>
      )}

      {selected.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Agregá al menos 2 notebooks para compararlas.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="w-36 border-b border-slate-200 p-2" />
                {selected.map((m) => (
                  <th key={m.id} className="border-b border-slate-200 p-3 align-top">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-1 flex h-16 w-full items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {m.imageUrl ? <img src={m.imageUrl} alt="" className="h-full object-contain" /> : <span className="text-3xl">💻</span>}
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{m.brand}</div>
                      <Link href={`/notebooks/${m.brandSlug}/${m.slug}`} className="text-[13px] font-bold leading-snug hover:text-brand-blue">
                        {m.name}
                      </Link>
                      <button
                        onClick={() => remove(m.id)}
                        className="mt-1 text-[11px] font-semibold text-slate-400 hover:text-red-600"
                      >
                        ✕ quitar
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <td className="border-b border-slate-100 p-3 text-[12px] font-semibold text-slate-500">
                    {row.label}
                  </td>
                  {selected.map((m) => {
                    const isCheapest = row.highlightCheapest && m.bestPrice === cheapest && selected.length > 1;
                    return (
                      <td
                        key={m.id}
                        className={`border-b border-slate-100 p-3 text-center text-[13px] ${
                          isCheapest ? "font-extrabold text-brand-green" : "text-slate-700"
                        }`}
                      >
                        {row.render(m)}
                        {isCheapest && <span className="ml-1 align-middle text-[10px]">✓ más barata</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td />
                {selected.map((m) => (
                  <td key={m.id} className="p-3 text-center">
                    <Link
                      href={`/notebooks/${m.brandSlug}/${m.slug}`}
                      className="inline-block rounded-lg bg-brand-blue px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-darker"
                    >
                      Ver ofertas
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
