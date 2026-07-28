"use client";

import { useState } from "react";

type Opt = { id: string; name?: string; label?: string };

export default function NewListingForm({ stores, models }: { stores: Opt[]; models: Opt[] }) {
  const [form, setForm] = useState({
    storeId: "",
    modelId: "",
    titleRaw: "",
    url: "",
    priceCash: "",
    priceList: "",
    image: "",
    inStock: true,
  });
  const [state, setState] = useState<{ kind: "idle" | "ok" | "error"; msg?: string }>({ kind: "idle" });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setState({ kind: "idle" });
    const res = await fetch("/api/admin/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priceCash: Number(form.priceCash),
        priceList: form.priceList ? Number(form.priceList) : undefined,
      }),
    });
    setLoading(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setState({ kind: "ok", msg: "Publicación guardada." });
      setForm({ storeId: "", modelId: "", titleRaw: "", url: "", priceCash: "", priceList: "", image: "", inStock: true });
    } else {
      setState({ kind: "error", msg: j.error || "No se pudo guardar." });
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
  const label = "mb-1 block text-[13px] font-bold";

  return (
    <form onSubmit={submit} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Tienda *</label>
          <select className={field} value={form.storeId} onChange={(e) => set("storeId", e.target.value)}>
            <option value="">— Elegí una tienda —</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Modelo canónico (opcional)</label>
          <select className={field} value={form.modelId} onChange={(e) => set("modelId", e.target.value)}>
            <option value="">— Sin asignar —</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className={label}>Título de la publicación *</label>
        <input className={field} value={form.titleRaw} onChange={(e) => set("titleRaw", e.target.value)} placeholder="Notebook Lenovo IdeaPad Slim 3 i5 16GB 512GB" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Precio contado (ARS) *</label>
          <input className={field} inputMode="numeric" value={form.priceCash} onChange={(e) => set("priceCash", e.target.value)} placeholder="1189999" />
        </div>
        <div>
          <label className={label}>Precio de lista (opcional)</label>
          <input className={field} inputMode="numeric" value={form.priceList} onChange={(e) => set("priceList", e.target.value)} placeholder="1294214" />
        </div>
      </div>

      <div className="mt-4">
        <label className={label}>URL de la publicación (opcional)</label>
        <input className={field} value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://tienda.com.ar/producto/..." />
      </div>

      <div className="mt-4">
        <label className={label}>URL de imagen (opcional)</label>
        <input className={field} value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://…/foto.jpg" />
      </div>

      <label className="mt-4 flex items-center gap-2 text-[13px] text-slate-600">
        <input type="checkbox" className="accent-brand-blue" checked={form.inStock} onChange={(e) => set("inStock", e.target.checked)} />
        En stock
      </label>

      {state.kind !== "idle" && (
        <p className={`mt-4 text-[13px] font-semibold ${state.kind === "ok" ? "text-brand-green" : "text-red-600"}`}>
          {state.msg}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 rounded-lg bg-brand-blue px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
      >
        {loading ? "Guardando…" : "Guardar publicación"}
      </button>
    </form>
  );
}
