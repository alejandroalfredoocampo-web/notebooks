import { getStoreApplications } from "@/lib/adminData";
import ApplicationsList from "@/components/admin/ApplicationsList";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage() {
  const apps = await getStoreApplications();
  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Solicitudes de tiendas</h1>
      <p className="mb-4 text-sm text-slate-500">
        Tiendas que se postularon desde el formulario público. Al aprobar, se crea la tienda
        (verificada) en el índice. Después hay que sumarla al scraper (<code>sources.mjs</code>) para
        indexar sus precios.
      </p>
      {apps.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Todavía no hay solicitudes.
        </div>
      ) : (
        <ApplicationsList apps={apps} />
      )}
    </div>
  );
}
