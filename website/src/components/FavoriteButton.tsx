"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import { authConfigured } from "@/lib/supabaseBrowser";
import { loadFavoriteIds, setFavorite } from "@/lib/favorites";

/**
 * Botón ♥ para marcar un modelo como favorito (spec 07).
 * - Sin login → lleva a /ingresar.
 * - Se oculta si Auth no está configurado todavía (degrada con gracia).
 * Pensado para ir dentro de una card que es <Link>: frena la navegación al clickear.
 */
export default function FavoriteButton({
  modelId,
  className = "",
  size = "md",
}: {
  modelId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const { user } = useUser();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (user) loadFavoriteIds().then((set) => alive && setActive(set.has(modelId)));
    else setActive(false);
    return () => {
      alive = false;
    };
  }, [user, modelId]);

  if (!authConfigured()) return null;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/ingresar");
      return;
    }
    const next = !active;
    setActive(next);
    setBusy(true);
    try {
      await setFavorite(modelId, next);
    } catch {
      setActive(!next); // revertir si falla
    } finally {
      setBusy(false);
    }
  }

  const dim = size === "sm" ? "h-8 w-8 text-base" : "h-9 w-9 text-lg";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? "Quitar de favoritos" : "Guardar en favoritos"}
      title={active ? "Quitar de favoritos" : "Guardar en favoritos"}
      className={`flex items-center justify-center rounded-full border bg-white/90 shadow-sm backdrop-blur transition ${dim} ${
        active ? "border-red-200 text-red-500" : "border-slate-200 text-slate-400 hover:text-red-500"
      } ${className}`}
    >
      {active ? "♥" : "♡"}
    </button>
  );
}
