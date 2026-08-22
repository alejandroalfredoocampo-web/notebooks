"use client";

import { useState } from "react";

/**
 * Captura de email para avisar cuando un modelo sin ofertas se publique (spec 06).
 * Hermano de PriceAlertForm. Incluye honeypot antispam (campo "company" oculto).
 */
export default function NotifyAvailabilityForm({
  modelId,
  modelName,
}: {
  modelId: string;
  modelName: string;
}) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/notificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, modelId, company }),
    });
    setLoading(false);
    if (res.ok) setSent(true);
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "No se pudo registrar el aviso. Probá de nuevo.");
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        ✓ Listo. Te avisamos a {email} apenas alguna tienda publique el {modelName}.
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-brand-sky bg-blue-50 p-4"
    >
      <div className="text-sm font-bold text-brand-darker">
        🔔 Avisame cuando esté disponible
      </div>
      <p className="mt-1 text-[13px] text-slate-500">
        Te mandamos un mail apenas una tienda publique este modelo. Sin spam.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <input
          type="email" autoComplete="email" inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="min-w-[180px] flex-1 rounded-lg border border-brand-sky px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        {/* honeypot: oculto para humanos, tentador para bots */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="hidden"
          aria-hidden="true"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
        >
          {loading ? "Registrando…" : "Avisarme"}
        </button>
      </div>
      {/* `role="alert"` + `aria-live`: sin esto, un lector de pantalla no anuncia el error
          y la persona se queda esperando frente a un formulario que ya falló. */}
      {error && <p role="alert" aria-live="assertive" className="mt-2 text-[13px] font-semibold text-red-600">{error}</p>}
    </form>
  );
}
