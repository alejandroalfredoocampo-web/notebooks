"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtARS } from "@/lib/format";
import ModelImage from "./ModelImage";

type Summary = {
  id: string;
  brand: string;
  brandSlug: string;
  name: string;
  slug: string;
  cpu: string;
  ramGb: number;
  gpuType: string;
  os: string;
  imageUrl: string | null;
  bestPrice: number;
};

/** Strip "Vistos recientemente" (client, lee localStorage). No renderiza si no hay. */
export default function RecentlyViewed() {
  const [models, setModels] = useState<Summary[]>([]);

  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem("recent_models") || "[]");
    } catch {
      ids = [];
    }
    if (!ids.length) return;
    fetch(`/api/models/summary?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d) => {
        const byId: Record<string, Summary> = {};
        for (const m of d.models ?? []) byId[m.id] = m;
        // respetar el orden de vistos
        setModels(ids.map((id) => byId[id]).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  if (!models.length) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <h2 className="mb-4 text-xl font-extrabold tracking-tight">Vistos recientemente</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {models.map((m) => (
          <Link
            key={m.id}
            href={`/notebooks/${m.brandSlug}/${m.slug}`}
            className="flex w-44 shrink-0 flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-white">
              <ModelImage
                src={m.imageUrl ?? undefined}
                alt={`${m.brand} ${m.name}`}
                emoji={m.gpuType === "dedicada" ? "🎮" : m.os === "macOS" ? "🍎" : "💻"}
                className="h-full w-full p-1"
                sizes="176px"
              />
            </div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{m.brand}</div>
            <div className="line-clamp-2 text-[13px] font-bold leading-snug">{m.name}</div>
            {m.bestPrice > 0 && <div className="mt-1 text-sm font-extrabold">{fmtARS(m.bestPrice)}</div>}
          </Link>
        ))}
      </div>
    </section>
  );
}
