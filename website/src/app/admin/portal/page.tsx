import { getStoreMembers, getAdminStores } from "@/lib/adminData";
import StoreMemberManager from "@/components/admin/StoreMemberManager";

export const dynamic = "force-dynamic";

export default async function AdminPortalPage() {
  let members, stores;
  try {
    [members, stores] = await Promise.all([getStoreMembers(), getAdminStores()]);
  } catch (e) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        No se pudo cargar el portal de tiendas. ¿Corriste la migración <code>0010_store_portal.sql</code>?
        <div className="mt-2 text-[12px] text-amber-700">{e instanceof Error ? e.message : String(e)}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-extrabold tracking-tight">Portal para tiendas</h1>
      <p className="mb-4 text-[13px] text-slate-500">
        Vinculá la cuenta de una tienda (debe registrarse primero en <code>/ingresar</code>) para que
        pueda ver las solicitudes corporativas y cotizar en <code>/portal</code>.
      </p>
      <StoreMemberManager
        members={members}
        stores={stores.map((s) => ({ id: s.id, name: s.name }))}
      />
    </div>
  );
}
