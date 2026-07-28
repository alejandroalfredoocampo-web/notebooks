"use client";

import { useState } from "react";

export default function PriceAlertForm({ modelName }: { modelName: string }) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        ✓ Listo. Te avisamos a {email} cuando baje el precio de {modelName}.
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.includes("@")) setSent(true);
      }}
      className="flex flex-wrap items-center gap-2.5 rounded-xl border border-brand-sky bg-blue-50 p-4"
    >
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
        className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-darker"
      >
        Crear alerta
      </button>
    </form>
  );
}
