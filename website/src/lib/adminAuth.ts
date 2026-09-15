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

/* ---------------------------------------------------------------------------
 * La cookie de sesión
 * ------------------------------------------------------------------------- */

/** Ocho horas: una jornada. Pasado eso, se vuelve a pedir la contraseña. */
export const DURACION_SESION_ADMIN = 60 * 60 * 8;

/**
 * El valor de la cookie: `<vence>.<hmac>`.
 *
 * ## Por qué ya no es el `ADMIN_SESSION_TOKEN` a secas
 *
 * Hasta el 15-sep la cookie **era** la variable: el mismo string para todas las sesiones y
 * para siempre. Las 8 horas de `maxAge` las respetaba sólo el navegador; una cookie copiada
 * —de un log, de una extensión, de una máquina compartida— entraba hasta que alguien rotara la
 * variable, y el logout la borraba del navegador sin invalidarla en ningún lado.
 *
 * Ahora cada sesión lleva su vencimiento firmado. El servidor verifica firma y fecha, así que
 * las 8 horas son del servidor y no del navegador. Rotar `ADMIN_SESSION_TOKEN` sigue siendo el
 * botón para cerrar todas las sesiones de golpe.
 *
 * Es la mitad sin costo de lo que Córdoba Notebooks hizo con la sesión del admin (doc 77 §3):
 * vencimiento del lado del servidor. No hay revocación por sesión porque no hay usuarios; eso
 * llega con las cuentas de Supabase que se anotan arriba.
 *
 * Web Crypto y no `node:crypto`, porque lo verifica el middleware en el runtime edge.
 */
export async function firmarSesionAdmin(
  secreto: string,
  ahora = Date.now(),
  duracion = DURACION_SESION_ADMIN,
): Promise<string> {
  const vence = Math.floor(ahora / 1000) + duracion;
  return `${vence}.${await hmacHex(secreto, `admin:${vence}`)}`;
}

export async function sesionAdminValida(
  cookie: string | undefined,
  secreto: string,
  ahora = Date.now(),
): Promise<boolean> {
  if (!cookie || !secreto) return false;
  const m = /^(\d{1,12})\.([0-9a-f]{64})$/.exec(cookie);
  if (!m) return false;
  const vence = Number(m[1]);
  const seg = Math.floor(ahora / 1000);
  // Vencida, o con un vencimiento más lejos de lo que el login emite (una firma robada del
  // secreto no alcanza para fabricar una sesión eterna sin que se note acá).
  if (vence <= seg || vence > seg + DURACION_SESION_ADMIN + 60) return false;
  return igualEnTiempoConstante(m[2], await hmacHex(secreto, `admin:${vence}`));
}

async function hmacHex(secreto: string, dato: string): Promise<string> {
  const enc = new TextEncoder();
  const clave = await crypto.subtle.importKey(
    "raw",
    enc.encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firma = new Uint8Array(await crypto.subtle.sign("HMAC", clave, enc.encode(dato)));
  return Array.from(firma, (b) => b.toString(16).padStart(2, "0")).join("");
}
