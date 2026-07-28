"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

const GROUPS: {
  param: string;
  title: string;
  options: { value: string; label: string }[];
}[] = [
  {
    param: "brand",
    title: "Marca",
    options: [
      { value: "lenovo", label: "Lenovo" },
      { value: "hp", label: "HP" },
      { value: "asus", label: "Asus" },
      { value: "dell", label: "Dell" },
      { value: "acer", label: "Acer" },
      { value: "apple", label: "Apple" },
      { value: "samsung", label: "Samsung" },
    ],
  },
  {
    param: "cpu",
    title: "Procesador",
    options: [
      { value: "i3", label: "Intel Core i3" },
      { value: "i5", label: "Intel Core i5" },
      { value: "i7", label: "Intel Core i7" },
      { value: "i9", label: "Intel Core i9" },
      { value: "ultra9", label: "Intel Core Ultra" },
      { value: "ryzen7", label: "AMD Ryzen 7" },
      { value: "apple-m", label: "Apple M" },
    ],
  },
  {
    param: "ram",
    title: "Memoria RAM",
    options: [
      { value: "8", label: "8 a 12 GB" },
      { value: "16", label: "16 GB" },
      { value: "32", label: "32 GB o más" },
    ],
  },
  {
    param: "gpu",
    title: "Placa de video",
    options: [
      { value: "integrada", label: "Integrada" },
      { value: "dedicada", label: "Dedicada (gamer)" },
    ],
  },
  {
    param: "price",
    title: "Precio",
    options: [
      { value: "0-1200000", label: "Hasta $1.200.000" },
      { value: "1200000-2500000", label: "$1,2M – $2,5M" },
      { value: "2500000-99999999", label: "Más de $2,5M" },
    ],
  },
  {
    param: "fin",
    title: "Financiación",
    options: [{ value: "sininteres", label: "Cuotas sin interés" }],
  },
];

export default function Filters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);

  // Cantidad de filtros activos (para el botón en mobile)
  const activeCount = GROUPS.reduce((n, g) => n + sp.getAll(g.param).length, 0);

  const toggle = useCallback(
    (param: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      const current = params.getAll(param);
      params.delete(param);
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      next.forEach((v) => params.append(param, v));
      router.push(`/notebooks?${params.toString()}`, { scroll: false });
    },
    [router, sp]
  );

  return (
    <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:sticky md:top-24">
      {/* Mobile: botón que colapsa/expande los filtros */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between md:hidden"
        aria-expanded={open}
      >
        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
          Filtrar{activeCount > 0 ? ` (${activeCount})` : ""}
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      <h3 className="mb-4 hidden text-xs font-extrabold uppercase tracking-widest text-slate-400 md:block">
        Filtrar
      </h3>

      <div className={`${open ? "mt-4 block" : "hidden"} md:mt-0 md:block`}>
      {GROUPS.map((g) => (
        <div key={g.param} className="mb-5">
          <div className="mb-2 text-[13px] font-bold">{g.title}</div>
          {g.options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px] text-slate-600 hover:text-slate-900"
            >
              <input
                type="checkbox"
                className="accent-brand-blue"
                checked={sp.getAll(g.param).includes(o.value)}
                onChange={() => toggle(g.param, o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      ))}
      </div>
    </aside>
  );
}
