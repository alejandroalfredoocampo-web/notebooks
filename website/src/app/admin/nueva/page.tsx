import { getAdminStores, getAdminModels } from "@/lib/adminData";
import NewListingForm from "@/components/admin/NewListingForm";

export const dynamic = "force-dynamic";

export default async function NuevaPage() {
  const [allStores, allModels] = await Promise.all([getAdminStores(), getAdminModels()]);
  const stores = allStores.map((s) => ({ id: s.id, name: s.name }));
  const models = allModels.map((m) => ({ id: m.id, label: `${m.brand} ${m.name}` }));

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Nueva publicación</h1>
      <p className="mb-4 text-sm text-slate-500">
        Cargá una publicación propia (por ejemplo, una tienda que todavía no se scrapea). Se guarda
        junto al resto y podés asignarle un modelo canónico.
      </p>
      <NewListingForm stores={stores} models={models} />
    </div>
  );
}
