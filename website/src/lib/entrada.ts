/**
 * Saneamiento de lo que llega por los formularios públicos.
 *
 * ## El problema que resuelve
 *
 * Los cinco endpoints públicos leían el cuerpo con `String(b?.campo ?? "").trim()` y lo
 * insertaban. Eso deja tres puertas abiertas que no se ven leyendo el código de a un
 * endpoint por vez:
 *
 *  1. **Sin tope de largo.** Un `message` de 5 MB entra a la base tal cual. No es un
 *     exploit, es una factura y una tabla que después nadie puede abrir.
 *  2. **Sin tope de cuerpo.** `req.json()` parsea lo que le manden antes de que el código
 *     mire nada.
 *  3. **Validación de email por `includes("@")`.** `"@"` sola pasa. Y `"a@b"` también, que
 *     es peor: entra a la base, el worker de mails intenta enviarle y el rebote va contra
 *     la reputación del dominio.
 *
 * ## Lo que NO hace, a propósito
 *
 * No escapa HTML ni SQL. Supabase parametriza las consultas, así que no hay inyección que
 * escapar, y escapar HTML **en la entrada** es el error clásico: guarda `&amp;` en la base
 * y después alguien lo muestra en un mail de texto plano. El escape va donde se renderiza,
 * que en React ya es automático.
 */

/** 64 KB. El formulario más grande del sitio (alta de tienda) son ~2 KB. */
export const MAX_CUERPO = 64 * 1024;

export class EntradaInvalida extends Error {}

/**
 * Lee el cuerpo JSON con tope de tamaño.
 *
 * Devuelve `null` si no es JSON válido o si se pasa del tope, para que quien llama conteste
 * 400 sin distinguir los dos casos — un atacante que ve qué límite tocó aprende dónde está.
 */
export async function leerJson(req: Request): Promise<Record<string, unknown> | null> {
  const declarado = Number(req.headers.get("content-length") ?? "0");
  if (declarado > MAX_CUERPO) return null;
  try {
    const texto = await req.text();
    // Se vuelve a medir: `content-length` puede faltar (chunked) o mentir.
    if (texto.length > MAX_CUERPO) return null;
    const v = JSON.parse(texto);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Texto normalizado y recortado.
 *
 * El `replace` de caracteres de control saca `\u0000` y compañía: PostgreSQL rechaza el
 * byte nulo en una columna `text` con un error que llega al cliente como un 500 sin
 * explicación, y el resto son invisibles que sirven para disfrazar contenido.
 */
export function texto(v: unknown, max: number): string {
  if (v === null || v === undefined) return "";
  return String(v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

/** Igual que `texto`, pero `null` en vez de string vacío (para columnas nullable). */
export function textoOpcional(v: unknown, max: number): string | null {
  const t = texto(v, max);
  return t || null;
}

/**
 * Validación de email.
 *
 * Deliberadamente no es la expresión de la RFC 5322: esa acepta cosas que ningún proveedor
 * entrega y es imposible de leer. Esto pide lo que hace falta para que el mail salga —
 * usuario, arroba, dominio con punto y un TLD de al menos dos letras— y rechaza el resto.
 * El tope de 254 es el máximo que define la RFC 5321 para una dirección.
 */
const RE_EMAIL = /^[^\s@,;:<>"'\\]{1,64}@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export function esEmail(v: unknown): boolean {
  const t = texto(v, 255);
  return t.length <= 254 && RE_EMAIL.test(t);
}

export function email(v: unknown): string {
  // Se guarda en minúsculas: es lo que hace que el `unique(email, model_id)` de
  // `model_notify` funcione de verdad. Sin esto, `Ana@x.com` y `ana@x.com` son dos filas y
  // la persona recibe el aviso dos veces.
  return texto(v, 254).toLowerCase();
}

/**
 * URL http(s) válida, o `null`.
 *
 * El chequeo de protocolo es el que importa: un `javascript:` o un `data:` guardado en una
 * columna que después se renderiza como `href` es XSS almacenado, y en este sitio hay
 * varias — el sitio de la tienda, su catálogo, sus redes.
 */
export function urlHttp(v: unknown, max = 500): string | null {
  const t = texto(v, max);
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Entero dentro de un rango, o `null`. */
export function entero(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= min && r <= max ? r : null;
}

/**
 * Mensaje de error para el cliente cuando la escritura en la base falla.
 *
 * **Nunca el `error.message` de Supabase.** Ese texto trae el nombre de la tabla, el de la
 * columna, el de la constraint y a veces el valor que la violó. Es un mapa del esquema
 * servido a cualquiera que mande un formulario mal a propósito, y era lo que devolvían los
 * cinco endpoints. El detalle va al log del servidor, donde sirve.
 */
export function errorGuardando(contexto: string, e: unknown): Response {
  console.error(`[${contexto}] error guardando`, e);
  return new Response(
    JSON.stringify({ error: "No se pudo guardar. Probá de nuevo en unos minutos." }),
    { status: 500, headers: { "content-type": "application/json", "cache-control": "no-store" } },
  );
}
