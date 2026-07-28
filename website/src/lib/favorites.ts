"use client";

import { getSupabaseBrowser } from "./supabaseBrowser";

/**
 * Favoritos del usuario (client-side, spec 07). RLS garantiza aislamiento por
 * usuario. Cacheamos el set de ids una sola vez por carga para que muchos
 * botones ♥ no disparen una query cada uno.
 */
let cache: Promise<Set<string>> | null = null;

export function loadFavoriteIds(): Promise<Set<string>> {
  if (cache) return cache;
  const sb = getSupabaseBrowser();
  if (!sb) return Promise.resolve(new Set());
  cache = (async () => {
    const { data, error } = await sb.from("favorites").select("model_id");
    if (error) return new Set<string>();
    return new Set((data ?? []).map((r) => r.model_id as string));
  })();
  return cache;
}

export function invalidateFavorites() {
  cache = null;
}

export async function setFavorite(modelId: string, on: boolean): Promise<void> {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  const { data: userData } = await sb.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return;
  if (on) {
    await sb.from("favorites").upsert({ user_id: uid, model_id: modelId }, { onConflict: "user_id,model_id" });
  } else {
    await sb.from("favorites").delete().eq("user_id", uid).eq("model_id", modelId);
  }
  // mantener la caché en sync
  const set = await loadFavoriteIds();
  if (on) set.add(modelId);
  else set.delete(modelId);
}
