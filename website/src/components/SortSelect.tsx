"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function SortSelect() {
  const router = useRouter();
  const sp = useSearchParams();

  return (
    <select
      value={sp.get("sort") ?? "relevance"}
      onChange={(e) => {
        const params = new URLSearchParams(sp.toString());
        params.set("sort", e.target.value);
        router.push(`/notebooks?${params.toString()}`, { scroll: false });
      }}
      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600"
    >
      <option value="relevance">Más relevantes</option>
      <option value="price-asc">Menor precio</option>
      <option value="price-desc">Mayor precio</option>
      <option value="drop">Mayor % de baja</option>
      <option value="cuotas">Más cuotas</option>
    </select>
  );
}
