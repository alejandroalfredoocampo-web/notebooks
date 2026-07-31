import crypto from "crypto";

/**
 * Token de baja de alerta: HMAC del id con la service_role como secreto.
 * Debe coincidir con el cálculo del worker (scrapers/notify.mjs → unsubToken).
 * Server-only (usa la service_role).
 */
export function unsubToken(id: string | number): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return crypto.createHmac("sha256", secret).update(`alert:${id}`).digest("hex").slice(0, 16);
}
