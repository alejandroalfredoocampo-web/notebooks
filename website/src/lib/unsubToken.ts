import crypto from "crypto";

/**
 * Token de baja de alerta: HMAC del id con la service_role como secreto.
 * Debe coincidir con el cálculo del worker (scrapers/notify.mjs → unsubToken).
 * Server-only (usa la service_role).
 *
 * ## Falla cerrado
 *
 * Hasta el 15-sep, sin `SUPABASE_SERVICE_ROLE_KEY` el secreto era `""`: un HMAC con clave
 * vacía, que cualquiera calcula. O sea que un deploy al que le faltara la variable —el error
 * más común que hay, y el que tuvo este proyecto al migrar de cuenta el 8-sep— dejaba dar de
 * baja las alertas de cualquiera recorriendo ids. Es la misma forma que el
 * `ADMIN_PASSWORD` con valor por defecto del doc 06. Ahora sin secreto no valida nada.
 *
 * El secreto sigue siendo la service_role y no una variable aparte (`.env.example` anunciaba un
 * `UNSUB_SECRET` que el código nunca leyó):
 * cambiarlo invalidaría todos los links de baja ya enviados.
 */
export function unsubToken(id: string | number): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`alert:${id}`).digest("hex").slice(0, 16);
}

/** Compara en tiempo constante. `false` si falta el secreto, el id o el token. */
export function tokenDeBajaValido(id: string | undefined, t: string | undefined): boolean {
  if (!id || !t) return false;
  const esperado = unsubToken(id);
  if (!esperado) {
    console.error("[baja] falta SUPABASE_SERVICE_ROLE_KEY: no se puede validar ningún link de baja");
    return false;
  }
  const a = Buffer.from(esperado);
  const b = Buffer.from(t);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
