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

/**
 * El cliente con el que escriben las rutas **públicas** (formularios, `/salir`, rate limit).
 *
 * Desde la migración 0016, `anon` ya no puede insertar en esas tablas: el único camino de
 * escritura es la API del sitio, que es donde viven el rate limit, el honeypot y la
 * validación. Antes cualquiera con la anon key —que es pública— los salteaba con un `curl`.
 *
 * Devuelve `null` en vez de tirar si falta la key, para que cada ruta decida su modo de
 * falla: un formulario contesta el error genérico, y `/salir` redirige igual y pierde el
 * registro. Tirar convertía un problema de configuración en un 500 del redirect que se
 * factura.
 */
export function clienteDeEscritura(contexto: string): SupabaseClient | null {
  try {
    return supabaseAdmin();
  } catch (e) {
    console.error(`[${contexto}] sin cliente de escritura`, e);
    return null;
  }
}
