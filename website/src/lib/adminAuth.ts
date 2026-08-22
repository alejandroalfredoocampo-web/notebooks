/**
 * Auth de la consola de admin.
 *
 * ## Lo que cambió, y por qué
 *
 * Antes esto tenía valores por defecto: `ADMIN_PASSWORD` caía en `"notebooks-admin"` y
 * `ADMIN_SESSION_TOKEN` en `"dev-admin-session-token"`. Los dos estaban escritos en el
 * repositorio. O sea que un deploy de producción al que le faltara una de las dos variables
 * —el error más común que existe— **quedaba con una contraseña pública**, y no fallaba de
 * ninguna forma visible: el admin andaba perfecto.
 *
 * Ahora falta la variable y no entra nadie. Es peor de usar y es la única postura
 * defendible: la falla tiene que ser ruidosa del lado del que despliega, no silenciosa del
 * lado del que ataca.
 *
 * ## Lo que sigue pendiente
 *
 * Es una contraseña única compartida por todo el equipo, sin usuarios ni roles ni registro
 * de quién hizo qué. Alcanza mientras el admin lo use una persona; el día que lo usen tres,
 * hay que pasar a cuentas de Supabase con RLS. Queda anotado acá y no en un backlog porque
 * es acá donde lo va a leer el que toque esto.
 */

export const ADMIN_COOKIE = "admin_session";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
export const ADMIN_SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN ?? "";

/**
 * `true` cuando el admin **no se puede usar** porque falta configuración.
 *
 * La consola lo muestra como un cartel explícito en vez de un "contraseña incorrecta", que
 * es lo que confundiría a quien acaba de desplegar.
 */
export const adminSinConfigurar = !ADMIN_PASSWORD || !ADMIN_SESSION_TOKEN;

/**
 * Comparación en tiempo constante, con Web Crypto para que sirva igual en el runtime edge
 * y en Node. Ver el comentario equivalente en `middleware.ts`.
 */
export async function igualEnTiempoConstante(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let dif = 0;
  for (let i = 0; i < va.length; i++) dif |= va[i] ^ vb[i];
  return dif === 0;
}

/**
 * Contraseña corta o previsible.
 *
 * Reemplaza al aviso viejo de "estás usando credenciales por defecto", que ya no puede
 * ocurrir (sin `ADMIN_PASSWORD` no se entra). Lo que sí puede ocurrir —y es igual de
 * grave— es que alguien setee la variable con `admin` y se quede tranquilo porque la
 * configuró. El aviso vive en el panel, que es donde lo ve quien puede arreglarlo.
 */
const PREVISIBLES = new Set([
  "admin", "administrador", "password", "contrasena", "contraseña",
  "notebooks", "notebooks-admin", "123456", "cambiame", "changeme", "test",
]);

export const contrasenaDebil =
  !!ADMIN_PASSWORD &&
  (ADMIN_PASSWORD.length < 16 || PREVISIBLES.has(ADMIN_PASSWORD.toLowerCase()));
