"use client";

import { useMemo, useState } from "react";

type App = {
  id: number;
  status: "pending" | "approved" | "rejected";
  commercialName: string;
  legalName: string | null;
  cuit: string | null;
  website: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  province: string | null;
  city: string | null;
  hasPhysicalStore: boolean;
  physicalAddress: string | null;
  shipsNationwide: boolean;
  paymentMethods: string | null;
  interestFreeInstallments: boolean;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  linkedin: string | null;
  mercadolibre: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  googleMapsUrl: string | null;
  catalogUrl: string | null;
  platform: string | null;
  message: string | null;
  createdAt: string;
};

function Row({ label, value, href }: { label: string; value?: string | null; href?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[13px]">
      <span className="w-40 shrink-0 text-slate-400">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-brand-blue hover:underline">
          {value}
        </a>
      ) : (
        <span className="break-all font-medium text-slate-700">{value}</span>
      )}
    </div>
  );
}

export default function ApplicationsList({ apps }: { apps: App[] }) {
  const [status, setStatus] = useState<Record<number, App["status"]>>(
    Object.fromEntries(apps.map((a) => [a.id, a.status]))
  );
  const [busy, setBusy] = useState<number | null>(null);
  const [tab, setTab] = useState<App["status"]>("pending");

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    for (const a of apps) c[status[a.id]]++;
    return c;
  }, [apps, status]);

  const list = apps.filter((a) => status[a.id] === tab);

  async function review(id: number, action: "approved" | "rejected") {
    setBusy(id);
    const res = await fetch("/api/admin/solicitud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setBusy(null);
    if (res.ok) setStatus((s) => ({ ...s, [id]: action }));
    else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "No se pudo procesar la solicitud");
    }
  }

  const TABS = [
    { key: "pending", label: `Pendientes (${counts.pending})` },
    { key: "approved", label: `Aprobadas (${counts.approved})` },
    { key: "rejected", label: `Rechazadas (${counts.rejected})` },
  ] as const;

  const url = (v: string | null, prefix = "") => (v ? (v.startsWith("http") ? v : prefix + v) : null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition ${
              tab === t.key ? "bg-brand-blue text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          No hay solicitudes en esta pestaña.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-extrabold">{a.commercialName}</div>
                  <div className="text-[12px] text-slate-400">
                    Recibida {new Date(a.createdAt).toLocaleDateString("es-AR")}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                    status[a.id] === "approved" ? "bg-emerald-50 text-emerald-700"
                    : status[a.id] === "rejected" ? "bg-slate-100 text-slate-500"
                    : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {status[a.id] === "approved" ? "Aprobada" : status[a.id] === "rejected" ? "Rechazada" : "Pendiente"}
                </span>
              </div>

              <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                <Row label="Razón social" value={a.legalName} />
                <Row label="CUIT" value={a.cuit} />
                <Row label="Sitio web" value={a.website} href={a.website} />
                <Row label="Plataforma" value={a.platform} />
                <Row label="Contacto" value={[a.contactName, a.contactPhone].filter(Boolean).join(" · ") || null} />
                <Row label="Email" value={a.contactEmail} href={`mailto:${a.contactEmail}`} />
                <Row label="Ubicación" value={[a.city, a.province].filter(Boolean).join(", ") || null} />
                <Row label="Local físico" value={a.hasPhysicalStore ? (a.physicalAddress || "Sí") : "No"} />
                <Row label="Envíos" value={a.shipsNationwide ? "A todo el país" : null} />
                <Row label="Medios de pago" value={a.paymentMethods} />
                <Row label="Cuotas sin interés" value={a.interestFreeInstallments ? "Sí" : null} />
                <Row label="Catálogo (URL)" value={a.catalogUrl} href={a.catalogUrl} />
                <Row
                  label="Google"
                  value={a.googleRating != null ? `${a.googleRating} ★${a.googleReviewsCount ? ` (${a.googleReviewsCount} reseñas)` : ""}` : null}
                  href={a.googleMapsUrl}
                />
                <Row label="Instagram" value={a.instagram} href={url(a.instagram, "https://instagram.com/")} />
                <Row label="Facebook" value={a.facebook} href={url(a.facebook)} />
                <Row label="TikTok" value={a.tiktok} href={url(a.tiktok)} />
                <Row label="YouTube" value={a.youtube} href={url(a.youtube)} />
                <Row label="LinkedIn" value={a.linkedin} href={url(a.linkedin)} />
                <Row label="Mercado Libre" value={a.mercadolibre} href={url(a.mercadolibre)} />
              </div>
              {a.message && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[13px] text-slate-600">“{a.message}”</p>
              )}

              {status[a.id] === "pending" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => review(a.id, "approved")}
                    disabled={busy === a.id}
                    className="rounded-lg bg-brand-green px-4 py-2 text-[13px] font-bold text-white transition hover:brightness-95 disabled:opacity-60"
                  >
                    Aprobar y crear tienda
                  </button>
                  <button
                    onClick={() => review(a.id, "rejected")}
                    disabled={busy === a.id}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
