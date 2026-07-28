"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/useUser";
import { authConfigured } from "@/lib/supabaseBrowser";
import { loadFavoriteIds } from "@/lib/favorites";
import { fmtARS } from "@/lib/format";
import ModelImage from "@/components/ModelImage";
import FavoriteButton from "@/components/FavoriteButton";

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
  listingsCount: number;
};

export default function FavoritosPage() {
  const { user, loading } = useUser();
  const [models, setModels] = useState<Summary[] | null>(null);

  useEffect(() => {
    if (!user) {
      setModels([]);
      return;
    }
    (async () => {
      const ids = [...(await loadFavoriteIds())];
      if (!ids.length) {
        setModels([]);
        return;
      }
      const res = await fetch(`/api/models/summary?ids=${ids.join(",")}`);
      const data = await res.json();
      setModels(data.models ?? []);
    })();
  }, [user]);

  if (!authConfigured()) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-slate-500">
        El login todavía no está disponible.
      </div>
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-400">Cargando…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">Tus favoritos</h1>
        <p className="mt-2 text-sm text-slate-500">Ingresá para guardar y ver tus notebooks favoritas.</p>
        <Link
          href="/ingresar"
          className="mt-5 inline-block rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-darker"
        >
          Ingresar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">Tus favoritos</h1>

      {models === null ? (
        <p className="mt-6 text-slate-400">Cargando…</p>
      ) : models.length === 0 ? (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Todavía no guardaste ninguna. Tocá el ♥ en cualquier notebook para sumarla acá.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => (
            <div key={m.id} className="relative flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <FavoriteButton modelId={m.id} size="sm" className="absolute right-2 top-2" />
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                <ModelImage
                  src={m.imageUrl ?? undefined}
                  alt={`${m.brand} ${m.name}`}
                  emoji={m.gpuType === "dedicada" ? "🎮" : m.os === "macOS" ? "🍎" : "💻"}
                  className="h-full w-full p-1"
                  sizes="64px"
                />
              </div>
              <div className="min-w-0 flex-1 pr-8">
                <Link
                  href={`/notebooks/${m.brandSlug}/${m.slug}`}
                  className="block text-[13px] font-bold leading-snug hover:text-brand-blue"
                >
                  {m.brand} {m.name}
                </Link>
                <div className="mt-0.5 text-[11px] text-slate-400">{m.cpu} · {m.ramGb} GB</div>
                {m.bestPrice > 0 ? (
                  <div className="mt-1 text-base font-extrabold tracking-tight">{fmtARS(m.bestPrice)}</div>
                ) : (
                  <div className="mt-1 text-[12px] text-slate-400">Sin ofertas por ahora</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
