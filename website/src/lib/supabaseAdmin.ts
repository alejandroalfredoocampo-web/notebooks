import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de Supabase para el ADMIN (server-only). Usa la service_role key →
 * bypassea RLS (puede leer publicaciones pendientes y escribir en el catálogo).
 *
 * Lazy: el cliente se crea recién en la primera query, así el build no falla si
 * la key no está en el entorno de build. En runtime (Render/Vercel/local) debe
 * estar SUPABASE_SERVICE_ROLE_KEY seteada, o el admin tira un error claro.
 */
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_URL) para el admin. Seteala en el entorno."
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return client;
}
