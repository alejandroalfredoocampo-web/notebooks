import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para lecturas públicas (server-side).
 * Usa la anon/publishable key → respeta RLS (solo publicaciones confirmadas,
 * catálogo público). Las escrituras públicas permitidas por RLS (alertas,
 * click-outs) también pasan por acá.
 */
const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY. Seteralas en .env.local (dev) o en el entorno (Render)."
  );
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
  // Evita que el Data Cache de Next sirva filas viejas: siempre lee de la DB.
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, cache: "no-store" }),
  },
});
