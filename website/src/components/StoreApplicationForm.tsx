"use client";

import { useState } from "react";

const EMPTY = {
  commercialName: "", legalName: "", cuit: "", website: "",
  contactName: "", contactEmail: "", contactPhone: "",
  province: "", city: "", hasPhysicalStore: false, physicalAddress: "",
  shipsNationwide: false, paymentMethods: "", interestFreeInstallments: false,
  instagram: "", facebook: "", tiktok: "", youtube: "", linkedin: "", mercadolibre: "",
  googleRating: "", googleReviewsCount: "", googleMapsUrl: "",
  catalogUrl: "", platform: "", message: "",
};

const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";
const label = "mb-1 block text-[13px] font-semibold text-slate-700";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-brand-blue">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function StoreApplicationForm() {
  const [f, setF] = useState({ ...EMPTY });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/tiendas/solicitud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setLoading(false);
    if (res.ok) setSent(true);
    else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "No se pudo enviar la solicitud. Probá de nuevo.");
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
        <b>✓ ¡Recibimos tu solicitud!</b> Vamos a revisar los datos de <b>{f.commercialName}</b> y te
        escribimos a {f.contactEmail}. Gracias por querer sumarte.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-extrabold tracking-tight">Sumá tu tienda</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">
        Completá tus datos y los revisamos. La indexación es gratuita. Los campos con * son obligatorios.
      </p>

      <div className="flex flex-col gap-5">
        <Section title="Datos comerciales">
          <div>
            <label className={label}>Nombre comercial *</label>
            <input className={field} value={f.commercialName} onChange={(e) => set("commercialName", e.target.value)} placeholder="Córdoba Notebooks" />
          </div>
          <div>
            <label className={label}>Razón social</label>
            <input className={field} value={f.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="Mi Empresa S.R.L." />
          </div>
          <div>
            <label className={label}>CUIT</label>
            <input className={field} value={f.cuit} onChange={(e) => set("cuit", e.target.value)} placeholder="30-12345678-9" />
          </div>
          <div>
            <label className={label}>Sitio web *</label>
            <input className={field} value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://mitienda.com.ar" />
          </div>
        </Section>

        <Section title="Contacto">
          <div>
            <label className={label}>Nombre y apellido</label>
            <input className={field} value={f.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </div>
          <div>
            <label className={label}>Email *</label>
            <input className={field} type="email" value={f.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="ventas@mitienda.com.ar" />
          </div>
          <div>
            <label className={label}>Teléfono / WhatsApp</label>
            <input className={field} value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+54 9 351 ..." />
          </div>
        </Section>

        <Section title="Ubicación y operación">
          <div>
            <label className={label}>Provincia</label>
            <input className={field} value={f.province} onChange={(e) => set("province", e.target.value)} />
          </div>
          <div>
            <label className={label}>Ciudad</label>
            <input className={field} value={f.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              <input type="checkbox" className="accent-brand-blue" checked={f.hasPhysicalStore} onChange={(e) => set("hasPhysicalStore", e.target.checked)} />
              Tenemos local físico
            </label>
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              <input type="checkbox" className="accent-brand-blue" checked={f.shipsNationwide} onChange={(e) => set("shipsNationwide", e.target.checked)} />
              Envíos a todo el país
            </label>
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              <input type="checkbox" className="accent-brand-blue" checked={f.interestFreeInstallments} onChange={(e) => set("interestFreeInstallments", e.target.checked)} />
              Ofrecemos cuotas sin interés
            </label>
          </div>
          <div>
            <label className={label}>Dirección del local</label>
            <input className={field} value={f.physicalAddress} onChange={(e) => set("physicalAddress", e.target.value)} />
          </div>
          <div>
            <label className={label}>Medios de pago</label>
            <input className={field} value={f.paymentMethods} onChange={(e) => set("paymentMethods", e.target.value)} placeholder="Tarjetas, transferencia, MercadoPago" />
          </div>
        </Section>

        <Section title="Redes sociales">
          <div><label className={label}>Instagram</label><input className={field} value={f.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@mitienda" /></div>
          <div><label className={label}>Facebook</label><input className={field} value={f.facebook} onChange={(e) => set("facebook", e.target.value)} /></div>
          <div><label className={label}>TikTok</label><input className={field} value={f.tiktok} onChange={(e) => set("tiktok", e.target.value)} /></div>
          <div><label className={label}>YouTube</label><input className={field} value={f.youtube} onChange={(e) => set("youtube", e.target.value)} /></div>
          <div><label className={label}>LinkedIn</label><input className={field} value={f.linkedin} onChange={(e) => set("linkedin", e.target.value)} /></div>
          <div><label className={label}>Mercado Libre (link)</label><input className={field} value={f.mercadolibre} onChange={(e) => set("mercadolibre", e.target.value)} /></div>
        </Section>

        <Section title="Reputación (Google)">
          <div><label className={label}>Calificación (0 a 5)</label><input className={field} inputMode="decimal" value={f.googleRating} onChange={(e) => set("googleRating", e.target.value)} placeholder="4.6" /></div>
          <div><label className={label}>Cantidad de reseñas</label><input className={field} inputMode="numeric" value={f.googleReviewsCount} onChange={(e) => set("googleReviewsCount", e.target.value)} placeholder="1250" /></div>
          <div className="sm:col-span-2"><label className={label}>Link de Google Maps / Reseñas</label><input className={field} value={f.googleMapsUrl} onChange={(e) => set("googleMapsUrl", e.target.value)} /></div>
        </Section>

        <Section title="Catálogo (para indexar tus precios)">
          <div>
            <label className={label}>Plataforma del ecommerce</label>
            <select className={field} value={f.platform} onChange={(e) => set("platform", e.target.value)}>
              <option value="">— Elegí —</option>
              <option>WooCommerce</option>
              <option>VTEX</option>
              <option>Tiendanube</option>
              <option>Magento</option>
              <option>Shopify</option>
              <option>Otra / No sé</option>
            </select>
          </div>
          <div>
            <label className={label}>URL del listado de notebooks</label>
            <input className={field} value={f.catalogUrl} onChange={(e) => set("catalogUrl", e.target.value)} placeholder="https://mitienda.com.ar/notebooks" />
          </div>
        </Section>

        <div className="border-t border-slate-100 pt-4">
          <label className={label}>Mensaje (opcional)</label>
          <textarea className={`${field} min-h-[80px]`} value={f.message} onChange={(e) => set("message", e.target.value)} placeholder="Contanos lo que quieras: stock, marcas que trabajan, etc." />
        </div>
      </div>

      {error && <p className="mt-4 text-[13px] font-semibold text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 rounded-lg bg-brand-blue px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-60"
      >
        {loading ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
