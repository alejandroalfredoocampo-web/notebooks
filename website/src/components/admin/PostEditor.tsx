"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "@/components/Markdown";
import type { Post, PostKind } from "@/lib/blog";

type ModelOption = { id: string; label: string };

export default function PostEditor({
  post,
  models,
}: {
  post: Post | null;
  models: ModelOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [kind, setKind] = useState<PostKind>(post?.kind ?? "opinion");
  const [author, setAuthor] = useState(post?.author ?? "Redacción");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [bodyMd, setBodyMd] = useState(post?.bodyMd ?? "");
  const [modelIds, setModelIds] = useState<string[]>(post?.modelIds ?? []);
  const [filter, setFilter] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => models.filter((m) => m.label.toLowerCase().includes(filter.toLowerCase())),
    [models, filter]
  );

  function toggleModel(id: string) {
    setModelIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function save(status: "draft" | "published") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post?.id,
          title,
          slug,
          kind,
          author,
          excerpt,
          coverImage,
          bodyMd,
          modelIds,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      router.push("/admin/blog");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[13px] font-bold">Título</label>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[13px] font-bold">
              Slug <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              className={field}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="se genera del título"
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-bold">Tipo</label>
            <select className={field} value={kind} onChange={(e) => setKind(e.target.value as PostKind)}>
              <option value="opinion">Opinión</option>
              <option value="review">Reseña</option>
              <option value="guia">Guía</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[13px] font-bold">Autor</label>
            <input className={field} value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-bold">Imagen de portada (URL)</label>
            <input className={field} value={coverImage} onChange={(e) => setCoverImage(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-bold">Resumen (excerpt)</label>
          <textarea
            className={field}
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="1–2 frases para las cards y la meta description"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[13px] font-bold">Cuerpo (Markdown)</label>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="text-[12px] font-semibold text-brand-blue hover:underline"
            >
              {preview ? "Editar" : "Vista previa"}
            </button>
          </div>
          {preview ? (
            <div className="min-h-[280px] rounded-lg border border-slate-200 bg-white p-4">
              <Markdown>{bodyMd || "_(vacío)_"}</Markdown>
            </div>
          ) : (
            <textarea
              className={`${field} font-mono`}
              rows={16}
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              placeholder={"## Subtítulo\n\nEscribí en **Markdown**. Podés usar listas, links, tablas…"}
            />
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => save("published")}
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-darker disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Publicar"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save("draft")}
            className="rounded-lg border-[1.5px] border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Guardar borrador
          </button>
        </div>
      </div>

      {/* Modelos mencionados */}
      <div className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
        <div className="mb-2 text-[13px] font-bold">
          Modelos mencionados{" "}
          <span className="font-normal text-slate-400">({modelIds.length})</span>
        </div>
        <input
          className={`${field} mb-2`}
          placeholder="Filtrar modelos…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="max-h-[360px] space-y-0.5 overflow-y-auto">
          {filtered.map((m) => (
            <label
              key={m.id}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-[13px] text-slate-600 hover:bg-slate-50"
            >
              <input
                type="checkbox"
                className="accent-brand-blue"
                checked={modelIds.includes(m.id)}
                onChange={() => toggleModel(m.id)}
              />
              {m.label}
            </label>
          ))}
          {!filtered.length && <div className="text-[12px] text-slate-400">Sin resultados.</div>}
        </div>
      </div>
    </div>
  );
}
