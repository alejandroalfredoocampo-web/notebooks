import { getAdminStores, getSetting, getClickCounts } from "@/lib/adminData";
import MonetizationManager from "@/components/admin/MonetizationManager";

export const dynamic = "force-dynamic";

export default async function AdminMonetizacionPage() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let stores, defaultCpc, clicks;
  try {
    [stores, defaultCpc, clicks] = await Promise.all([
      getAdminStores(),
      getSetting("default_cpc_ars"),
      getClickCounts(since),
    ]);
  } catch (e) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        No se pudo cargar monetización. ¿Corriste la migración <code>0011_store_tiers.sql</code>?
        <div className="mt-2 text-[12px] text-amber-700">{e instanceof Error ? e.message : String(e)}</div>
      </div>
    );
  }

  const rows = stores.map((s) => ({
    id: s.id,
    name: s.name,
    tier: s.tier ?? "free",
    featured: Boolean(s.featured),
    featuredUntil: s.featuredUntil ?? null,
    cpcArs: s.cpcArs ?? null,
    clicks: clicks.get(s.id) ?? 0,
  }));
  // Orden: más clicks primero (donde hay más a facturar)
  rows.sort((a, b) => b.clicks - a.clicks);

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Monetización</h1>
      <p className="mb-4 text-[13px] text-slate-500">
        Tiers y destacados de tienda + reporte de facturación por CPC (últimos 30 días). El slot
        "Patrocinado" no altera el orden por precio del sitio.
      </p>
      <MonetizationManager rows={rows} defaultCpc={Number(defaultCpc ?? 0)} rangeLabel="(30d)" />
    </div>
  );
}
