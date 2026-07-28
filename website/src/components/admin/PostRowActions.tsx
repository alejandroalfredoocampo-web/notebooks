"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostRowActions({
  id,
  status,
}: {
  id: string;
  status: "draft" | "published";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    await fetch("/api/admin/post", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: status === "published" ? "draft" : "published" }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove() {
    if (!confirm("¿Borrar este artículo? No se puede deshacer.")) return;
    setBusy(true);
    await fetch("/api/admin/post", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex justify-end gap-2">
      <a
        href={`/admin/blog/editor?id=${id}`}
        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
      >
        Editar
      </a>
      <button
        onClick={toggle}
        disabled={busy}
        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-brand-blue hover:bg-blue-50 disabled:opacity-50"
      >
        {status === "published" ? "Pasar a borrador" : "Publicar"}
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Borrar
      </button>
    </div>
  );
}
