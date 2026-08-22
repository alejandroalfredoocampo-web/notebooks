import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Verificación del token de un miembro de tienda, del lado del servidor.
 *
 * ## Por qué hacía falta
 *
 * `/api/portal/insights` estaba abierto: pasabas un `storeId` en la query y te devolvía la
 * posición competitiva de esa tienda — su precio contra el mejor del mercado, en cuántos
 * modelos gana y en cuántos pierde, y por cuánto. El comentario del archivo decía "MVP:
 * abierto sobre data pública", y la premisa es cierta a medias: **cada precio suelto es
 * público, el análisis no**. Enumerar los `storeId` es trivial (están en `/tiendas`), así
 * que cualquier competidor bajaba el informe de inteligencia de precios de todas las
 * tiendas del comparador en un `for`. Ese informe es, además, el producto que la spec 11
 * pensaba **cobrar**.
 *
 * ## Cómo se verifica
 *
 * El portal ya usa Supabase Auth en el navegador. El cliente manda su `access_token` en
 * `Authorization: Bearer`, acá se valida contra Supabase (que chequea firma y vencimiento —
 * decodificar el JWT por nuestra cuenta sería confiar en lo que trae el propio token) y
 * después se confirma la pertenencia contra `store_members` con la service key.
 *
 * La pertenencia se chequea del lado del servidor **aunque la tabla tenga RLS**: el
 * `storeId` lo elige quien llama, así que sin este paso un miembro legítimo de una tienda
 * podría pedir el informe de otra.
 */

export type Sesion = { userId: string };

/** El cliente que valida tokens. No persiste sesión: se usa una vez por request. */
function verificador() {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Faltan SUPABASE_URL / SUPABASE_ANON_KEY");
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function tokenDelRequest(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

/** Devuelve el usuario si el token es válido, o `null`. Nunca tira. */
export async function usuarioDelToken(token: string | null): Promise<Sesion | null> {
  if (!token || token.length > 4096) return null;
  try {
    const { data, error } = await verificador().auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return { userId: data.user.id };
  } catch (e) {
    console.error("[sesion-tienda] no se pudo validar el token", e);
    return null;
  }
}

/** `true` si el usuario está vinculado a esa tienda. */
export async function esMiembroDe(userId: string, storeId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("store_members")
    .select("store_id")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[sesion-tienda] no se pudo leer store_members", error);
    // Falla cerrado: no poder verificar la pertenencia no es lo mismo que tenerla.
    return false;
  }
  return !!data;
}

/**
 * Autoriza el acceso al informe de una tienda.
 *
 * Devuelve la respuesta de error ya armada cuando no corresponde, o `null` cuando sí.
 *
 * **401 y 403 dicen lo mismo hacia afuera** (`"No autorizado"`) a propósito: distinguir
 * "no estás logueado" de "estás logueado pero esta tienda no es tuya" le confirma a un
 * atacante que el `storeId` que probó existe y tiene dueño.
 */
export async function autorizarTienda(req: Request, storeId: string): Promise<Response | null> {
  const sesion = await usuarioDelToken(tokenDelRequest(req));
  if (!sesion) return noAutorizado();
  if (!(await esMiembroDe(sesion.userId, storeId))) return noAutorizado();
  return null;
}

function noAutorizado(): Response {
  return new Response(JSON.stringify({ error: "No autorizado" }), {
    status: 401,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
