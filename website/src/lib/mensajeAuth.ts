/**
 * Lo que ve la persona cuando falla el ingreso o el alta.
 *
 * Antes se mostraba `error.message` de Supabase Auth tal cual: en inglés ("Invalid login
 * credentials", "Email rate limit exceeded") y, en los casos de configuración, contándole a
 * cualquiera cómo está armado el proyecto ("Signups not allowed for this instance", "Unsupported
 * provider: provider is not enabled"). Es la lección de Córdoba Notebooks con el asistente
 * (248c6921): al cliente, un mensaje neutro; el motivo, al log.
 *
 * Se decide por `code`, que es estable, y no por el texto, que Supabase cambia entre versiones.
 */
const MENSAJES: Record<string, string> = {
  invalid_credentials: "El email o la contraseña no coinciden.",
  email_not_confirmed: "Todavía no confirmaste tu email. Revisá tu casilla (y la de spam).",
  user_already_exists: "Ya hay una cuenta con ese email. Probá ingresar.",
  email_exists: "Ya hay una cuenta con ese email. Probá ingresar.",
  weak_password: "La contraseña es muy débil. Usá al menos 8 caracteres, con letras y números.",
  email_address_invalid: "El email no es válido.",
  validation_failed: "Revisá el email y la contraseña.",
  over_email_send_rate_limit: "Mandamos demasiados emails a esa dirección. Probá de nuevo en un rato.",
  over_request_rate_limit: "Demasiados intentos. Probá de nuevo en un rato.",
};

export const MENSAJE_GENERICO = "No se pudo completar. Probá de nuevo en unos minutos.";

export function mensajeDeAuth(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string" && MENSAJES[code]) return MENSAJES[code];
  return MENSAJE_GENERICO;
}
