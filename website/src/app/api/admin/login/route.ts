import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_PASSWORD,
  ADMIN_SESSION_TOKEN,
  adminSinConfigurar,
  igualEnTiempoConstante,
} from "@/lib/adminAuth";
import { LIMITES, chequearLimite, respuesta429 } from "@/lib/limites";
import { leerJson, texto } from "@/lib/entrada";

export const dynamic = "force-dynamic";

/**
 * Login del admin.
 *
 * Tres cosas que antes no hacía:
 *
 *  - **Rate limit.** Cinco intentos por hora y por IP, y falla **cerrado**: si no se puede
 *    contar, no se deja intentar. Es el único endpoint del sitio con esa postura, porque es
 *    el único donde "no sé cuántas veces probaste" no puede resolverse a favor del que
 *    prueba.
 *  - **Comparación en tiempo constante**, para no filtrar por la duración de la respuesta
 *    cuántos caracteres acertó.
 *  - **`secure` en la cookie.** Faltaba, así que la cookie de sesión del admin viajaba
 *    también por HTTP si algo forzaba el downgrade.
 */
export async function POST(req: Request) {
  const limite = await chequearLimite("admin-login", req, LIMITES.login);
  if (!limite.permitido) return respuesta429(limite.reintentarEn);

  if (adminSinConfigurar) {
    console.error("[admin] falta ADMIN_PASSWORD o ADMIN_SESSION_TOKEN: el admin queda cerrado");
    return NextResponse.json(
      { error: "El admin no está configurado en este entorno." },
      { status: 503 },
    );
  }

  const body = await leerJson(req);
  const password = texto(body?.password, 200);

  if (!(await igualEnTiempoConstante(password, ADMIN_PASSWORD))) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    // En desarrollo sobre HTTP una cookie `secure` no se guarda y el login "no anda" sin
    // ningún error visible. Por eso se ata al entorno y no a un literal.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 h
  });
  return res;
}
