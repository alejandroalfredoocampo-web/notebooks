import Link from "next/link";
import { getAdminPosts, KIND_LABEL } from "@/lib/blog";
import { fmtDate } from "@/lib/format";
import PostRowActions from "@/components/admin/PostRowActions";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  let posts;
  try {
    posts = await getAdminPosts();
  } catch (e) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        No se pudo leer el blog. ¿Corriste la migración <code>0004_blog.sql</code> en Supabase?
        <div className="mt-2 text-[12px] text-amber-700">{e instanceof Error ? e.message : String(e)}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">Blog ({posts.length})</h1>
        <Link
          href="/admin/blog/editor"
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-darker"
        >
          + Nuevo artículo
        </Link>
      </div>

      {posts.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Actualizado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-semibold">{p.title}</td>
                  <td className="px-4 py-3 text-slate-500">{KIND_LABEL[p.kind]}</td>
                  <td className="px-4 py-3">
                    {p.status === "published" ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        Publicado
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                        Borrador
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-400">
                    {p.updatedAt ? fmtDate(p.updatedAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <PostRowActions id={p.id} status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Todavía no hay artículos.{" "}
          <Link href="/admin/blog/editor" className="font-semibold text-brand-blue">
            Creá el primero
          </Link>
          .
        </p>
      )}
    </div>
  );
}
