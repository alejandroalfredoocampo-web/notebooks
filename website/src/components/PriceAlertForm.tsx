"use client";

import { useState } from "react";
import Honeypot from "./Honeypot";

export default function PriceAlertForm({
  modelId,
  modelName,
}: {
  modelId: string;
  modelName: string;
}) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hp, setHp] = useState(""); // honeypot

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/alertas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, modelId, website: hp }),
    });
    setLoading(false);
    if (res.ok) setSent(true);
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "No se pudo crear la alerta. Probá de nuevo.");
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        ✓ Listo. Te avisamos a {email} cuando baje el precio de {modelName}.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="relative flex flex-wrap items-center gap-2.5 rounded-xl border border-brand-sky bg-blue-50 p-4"
    >
      <Honeypot name="website" value={hp} onChange={setHp} />
      <div className="w-full text-sm font-bold text-brand-darker">
        🔔 Avisame si baja de precio
      </div>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="min-w-[180px] flex-1 rounded-lg border border-brand-sky px-3 py-2 text-sm outline-none focus:border-brand-blue"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
      >
        {loading ? "Creando…" : "Crear alerta"}
      </button>
      {error && <p className="w-full text-[13px] font-semibold text-red-600">{error}</p>}
    </form>
  );
}
