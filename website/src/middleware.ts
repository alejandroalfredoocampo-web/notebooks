import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nota: middleware corre en edge, así que no importa el módulo Node de auth;
// lee la env directamente. Debe coincidir con ADMIN_SESSION_TOKEN.
const TOKEN = process.env.ADMIN_SESSION_TOKEN ?? "dev-admin-session-token";
const COOKIE = "admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // El login siempre es accesible (si no, no habría cómo autenticarse)
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const authed = req.cookies.get(COOKIE)?.value === TOKEN;
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
