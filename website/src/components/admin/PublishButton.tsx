"use client";

import { useState } from "react";

type Summary = {
  listings: number;
  modelsCovered: number;
  newModels: number;
  images: number;
  history: number;
};

export default function PublishButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function publish() {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/admin/publish", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      const s: Summary = j.summary;
      setResult({
        ok: true,
        msg: `Publicado: ${s.listings} ofertas en ${s.modelsCovered} modelos${s.newModels ? `, ${s.newModels} modelos nuevos` : ""}. Reconstruí/redeployá el sitio para verlo online (en desarrollo se ve al instante).`,
      });
    } else {
      setResult({ ok: false, msg: j.error || "No se pudo publicar." });
    }
  }

  return (
    <div>
      <button
        onClick={publish}
        disabled={loading}
        className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Publicando…" : "Publicar al sitio ↑"}
      </button>
      {result && (
        <p className={`mt-2 text-[13px] font-semibold ${result.ok ? "text-brand-green" : "text-red-600"}`}>
          {result.msg}
        </p>
      )}
    </div>
  );
}
