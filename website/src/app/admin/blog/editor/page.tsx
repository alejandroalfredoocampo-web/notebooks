import Link from "next/link";
import { getAdminModels } from "@/lib/adminData";
import { getAdminPost } from "@/lib/blog";
import PostEditor from "@/components/admin/PostEditor";

export const dynamic = "force-dynamic";

export default async function AdminPostEditorPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const id = searchParams.id;
  const [models, post] = await Promise.all([
    getAdminModels(),
    id ? getAdminPost(id) : Promise.resolve(null),
  ]);

  const modelOptions = models.map((m) => ({ id: m.id, label: `${m.brand} ${m.name}` }));

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/admin/blog" className="text-sm font-semibold text-brand-blue hover:underline">
          ← Blog
        </Link>
        <h1 className="text-xl font-extrabold tracking-tight">
          {id ? "Editar artículo" : "Nuevo artículo"}
        </h1>
      </div>
      <PostEditor post={post} models={modelOptions} />
    </div>
  );
}
