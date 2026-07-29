"use client";

import { useMemo, useState } from "react";
import { fmtARS } from "@/lib/format";

type ModelOpt = { id: string; label: string; bestPrice: number };

/**
 * Estimador de compra por volumen + formulario de solicitud (RFQ) — spec 08 Fase A.
 * El estimador usa el mejor precio actual como PISO de referencia (las tiendas
 * pueden mejorarlo por volumen). El form postea a /api/corporativo.
 */
export default function CorporateForm({ models }: { models: ModelOpt[] }) {
  const [modelId, setModelId] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [specsNote, setSpecsNote] = useState("");
  const [company, setCompany] = useState("");
  const [cuit, setCuit] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  const selected = useMemo(() => models.find((m) => m.id === modelId), [models, modelId]);
  const estimate = selected && qty ? selected.bestPrice * qty : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/corporativo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId: modelId || null,
        specsNote,
        quantity: qty,
        companyName: company,
        cuit,
        contactName,
        contactEmail: email,
        contactPhone: phone,
        province,
        neededBy: neededBy || null,
        message,
        website,
      }),
    });
    setBusy(false);
    if (res.ok) setSent(true);
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "No se pudo enviar. Probá de nuevo.");
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
        <div className="text-lg font-extrabold">✓ Recibimos tu solicitud</div>
        <p className="mt-1 text-sm">
          Vamos a acercarte propuestas de las tiendas a <b>{email}</b>. Te escribimos a la brevedad.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      {/* Estimador */}
      <div className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
        <h3 className="text-sm font-extrabold">Estimá tu compra</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          Elegí un modelo y una cantidad para ver un piso de referencia. Con volumen, las tiendas
          suelen mejorarlo.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-[13px] font-bold">Modelo</label>
            <select className={field} value={modelId} onChange={(e) => setModelId(e.target.value)}>
              <option value="">Elegir un modelo…</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {fmtARS(m.bestPrice)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-bold">Cantidad de equipos</label>
            <input
              type="number"
              min={1}
              className={field}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>
        {estimate > 0 && (
          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <div className="text-[12px] font-semibold text-slate-500">Piso estimado ({qty} equipos)</div>
            <div className="text-2xl font-extrabold tracking-tight text-brand-darker">{fmtARS(estimate)}</div>
            <div className="text-[12px] text-slate-500">
              {fmtARS(selected!.bestPrice)} × {qty} — precio de referencia, sin descuento por volumen.
            </div>
          </div>
        )}
      </div>

      {/* Formulario RFQ */}
      <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-extrabold">Pedí presupuesto</h3>
        <p className="mt-1 text-[13px] text-slate-500">
          Contanos qué necesitás y las tiendas te acercan una propuesta con precio diferencial.
        </p>

        <div className="mt-4 space-y-3">
          {!modelId && (
            <div>
              <label className="mb-1 block text-[13px] font-bold">¿Qué equipos buscás?</label>
              <textarea
                className={field}
                rows={2}
                value={specsNote}
                onChange={(e) => setSpecsNote(e.target.value)}
                placeholder="Ej: notebooks i5 / 16 GB / 512 GB para oficina. (O elegí un modelo en el estimador)"
              />
            </div>
          )}
          {modelId && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[13px] text-slate-600">
              Modelo: <b>{selected?.label}</b> · Cantidad: <b>{qty}</b>{" "}
              <button type="button" onClick={() => setModelId("")} className="ml-1 text-brand-blue hover:underline">
                cambiar
              </button>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Empresa *" value={company} onChange={(e) => setCompany(e.target.value)} required />
            <input className={field} placeholder="CUIT" value={cuit} onChange={(e) => setCuit(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Nombre de contacto" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            <input className={field} type="email" placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className={field} placeholder="Provincia" value={province} onChange={(e) => setProvince(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-slate-500">Cantidad</label>
              <input type="number" min={1} className={field} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-slate-500">La necesitás para</label>
              <input type="date" className={field} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
            </div>
          </div>
          <textarea
            className={field}
            rows={2}
            placeholder="Comentarios (opcional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {/* honeypot */}
          <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        {error && <p className="mt-3 text-[13px] font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Solicitar presupuesto"}
        </button>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Somos el punto de encuentro: no vendemos ni intermediamos pagos.
        </p>
      </form>
    </div>
  );
}
