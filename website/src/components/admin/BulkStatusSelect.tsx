"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPTS = [
  { v: "open", l: "Abierta" },
  { v: "quoting", l: "Cotizando" },
  { v: "closed", l: "Cerrada" },
  { v: "cancelled", l: "Cancelada" },
];

export default function BulkStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    setValue(next);
    setBusy(true);
    await fetch("/api/admin/corporativo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] font-semibold text-slate-600"
    >
      {OPTS.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
