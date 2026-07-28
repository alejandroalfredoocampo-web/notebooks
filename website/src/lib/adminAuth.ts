/**
 * Auth mínima para la consola de admin (MVP). El operador entra con una
 * contraseña (ADMIN_PASSWORD) y se guarda un token opaco en una cookie httpOnly
 * (ADMIN_SESSION_TOKEN). Auth real con usuarios/roles está en el backlog.
 *
 * En local, si no se setean las envs, usa valores por defecto (con aviso).
 */
export const ADMIN_COOKIE = "admin_session";

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "notebooks-admin";
export const ADMIN_SESSION_TOKEN =
  process.env.ADMIN_SESSION_TOKEN ?? "dev-admin-session-token";

export const usingDefaultCreds =
  !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_TOKEN;
