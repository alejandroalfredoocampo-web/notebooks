import { getListingById, prefillFromListing, storeName } from "@/lib/adminData";
import NewModelForm from "@/components/admin/NewModelForm";

export const dynamic = "force-dynamic";

export default async function NuevoModeloPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const from = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const listing = from ? await getListingById(from) : undefined;
  const prefill = listing ? prefillFromListing(listing) : undefined;
  const source = listing
    ? {
        id: listing.id,
        title: listing.titleRaw,
        store: storeName(listing.storeId),
        price: listing.priceCash,
      }
    : undefined;

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Crear modelo canónico</h1>
      <p className="mb-4 max-w-2xl text-sm text-slate-500">
        {source
          ? "Los campos vienen precargados desde la publicación scrapeada; revisá y ajustá antes de guardar. Al crear el modelo, esa publicación queda matcheada automáticamente."
          : "Definí un modelo nuevo. Después vas a poder asignarle publicaciones desde la revisión de matcheos."}
      </p>
      {source && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] text-slate-600">
          Desde: <b className="text-slate-800">{source.title}</b> · {source.store}
        </div>
      )}
      <NewModelForm prefill={prefill} source={source} />
    </div>
  );
}
