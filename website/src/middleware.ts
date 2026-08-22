import { NextResponse, type NextRequest } from "next/server";
import { DOMINIO_RAIZ, SITE_HOST } from "@/lib/site";
import {
  COOKIE_CONSENTIMIENTO,
  COOKIE_ORIGEN,
  COOKIE_VISITANTE,
  DIAS_VISITANTE,
  cookieSegura,
  codificar,
  decodificar,
  fusionar,
  segundosRestantes,
  toqueDeParametros,
  type Guardado,
} from "@/lib/atribucion";

/**
 * El middleware hace tres cosas, en este orden:
 *
 *  1. **Host canónico.** El apex y cualquier subdominio propio redirigen a `www` con 301, y
 *     lo que no es el host canónico sale con `X-Robots-Tag: noindex`. Es lo que evita que
 *     un preview de Vercel compita en Google con producción por el mismo contenido.
 *  2. **Puerta del admin.** Lo que ya hacía, con dos arreglos: comparación en tiempo
 *     constante y fallo cerrado si el entorno no tiene credenciales.
 *  3. **Atribución.** Captura de dónde vino el visitante en una cookie propia, para poder
 *     atribuir después el click saliente (ver `lib/atribucion.ts`).
 *
 * Corre en el runtime edge, así que nada de lo que importa puede depender de módulos de
 * Node. Por eso la comparación de tokens usa `crypto.subtle` (Web Crypto) y no `timingSafeEqual`.
 */

/* ---------------------------------------------------------------------------
 * 1. Host canónico
 * ------------------------------------------------------------------------- */

function hostDe(req: NextRequest): string {
  const h = req.headers.get("host") || req.nextUrl.host;
  return h.toLowerCase().split(":")[0];
}

/* ---------------------------------------------------------------------------
 * 2. Puerta del admin
 * ------------------------------------------------------------------------- */

const COOKIE_ADMIN = "admin_session";

/**
 * El token de sesión del admin.
 *
 * **No hay valor por defecto, y eso es el arreglo.** Antes el middleware caía en
 * `"dev-admin-session-token"` cuando la variable faltaba: si un deploy de producción salía
 * sin `ADMIN_SESSION_TOKEN` —que es exactamente el error que uno comete— el admin quedaba
 * abierto para cualquiera que supiera ese string, que estaba en el repo público. Ahora
 * falta la variable y **no entra nadie**, ni siquiera con la contraseña correcta.
 */
const TOKEN_ADMIN = process.env.ADMIN_SESSION_TOKEN ?? "";

/**
 * Comparación en tiempo constante.
 *
 * Un `===` sobre strings corta en el primer byte distinto, así que el tiempo de respuesta
 * filtra cuántos caracteres del token acertó el atacante. Es un canal angosto y ruidoso por
 * la red, pero cerrarlo son seis líneas. Se comparan los **hashes** y no los valores para
 * que la duración tampoco dependa del largo.
 */
async function igualEnTiempoConstante(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let dif = 0;
  for (let i = 0; i < ha.length; i++) dif |= ha[i] ^ hb[i];
  return dif === 0;
}

async function sha256(s: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return new Uint8Array(buf);
}

const RUTA_ADMIN = /^\/(admin|api\/admin)(\/|$)/;
const LIBRES = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

async function puertaDelAdmin(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  if (!RUTA_ADMIN.test(pathname)) return null;
  if (LIBRES.has(pathname)) return null;

  const cookie = req.cookies.get(COOKIE_ADMIN)?.value ?? "";
  if (TOKEN_ADMIN && (await igualEnTiempoConstante(cookie, TOKEN_ADMIN))) return null;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  // Sólo la ruta, nunca la query: un `?next=` que arrastre parámetros es un vector de
  // redirección abierta, y acá no hace falta para nada.
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

/* ---------------------------------------------------------------------------
 * 3. Atribución
 * ------------------------------------------------------------------------- */

type PlanAtribucion = {
  origen?: { valor: string; segundos: number };
  visitante?: string;
  guardado?: Guardado;
};

function planDeAtribucion(req: NextRequest): PlanAtribucion {
  // Opt-out explícito: no se escribe nada. Es la única condición que apaga esto.
  if (req.cookies.get(COOKIE_CONSENTIMIENTO)?.value === "no") return {};

  const plan: PlanAtribucion = {};
  if (!req.cookies.get(COOKIE_VISITANTE)?.value) {
    plan.visitante = crypto.randomUUID();
  }

  const actual = decodificar(req.cookies.get(COOKIE_ORIGEN)?.value);
  const ahora = new Date();
  const toque = toqueDeParametros(
    req.nextUrl.searchParams,
    req.headers.get("referer"),
    hostDe(req),
    ahora,
  );
  const fusionado = fusionar(actual, toque, ahora);
  plan.guardado = fusionado ?? actual;
  if (fusionado) {
    plan.origen = { valor: codificar(fusionado), segundos: segundosRestantes(fusionado, ahora) };
  }
  return plan;
}

function aplicarAtribucion(res: NextResponse, plan: PlanAtribucion, req: NextRequest): NextResponse {
  if (!plan.origen && !plan.visitante) return res;
  const seguro = cookieSegura(req.headers.get("x-forwarded-proto"), hostDe(req));
  // `httpOnly`: ningún script de la página necesita leer esto, y que no lo pueda leer
  // significa que un XSS no se lleva el historial de campañas del visitante.
  const comun = { path: "/", httpOnly: true, secure: seguro, sameSite: "lax" } as const;
  if (plan.visitante) {
    res.cookies.set(COOKIE_VISITANTE, plan.visitante, { ...comun, maxAge: DIAS_VISITANTE * 86400 });
  }
  if (plan.origen) {
    res.cookies.set(COOKIE_ORIGEN, plan.origen.valor, { ...comun, maxAge: plan.origen.segundos });
  }
  return res;
}

/* ---------------------------------------------------------------------------
 * Orquestación
 * ------------------------------------------------------------------------- */

export async function middleware(req: NextRequest) {
  const host = hostDe(req);

  // Redirección al host canónico. Sólo desde dominios propios: un host desconocido que
  // apunte acá no se redirige (sería convertir el sitio en un redirector abierto para el
  // que configure un CNAME), se sirve con `noindex` más abajo.
  if (host !== SITE_HOST && (host === DOMINIO_RAIZ || host.endsWith(`.${DOMINIO_RAIZ}`))) {
    const destino = new URL(req.nextUrl.toString());
    destino.host = SITE_HOST;
    destino.protocol = "https:";
    destino.port = "";
    return NextResponse.redirect(destino, 301);
  }

  const bloqueo = await puertaDelAdmin(req);
  if (bloqueo) return bloqueo;

  const plan = planDeAtribucion(req);
  const res = NextResponse.next();

  /**
   * `noindex` en todo lo que no sea el host canónico.
   *
   * Es la **única** decisión de indexación del sitio y vive en un solo lugar a propósito:
   * mientras sea así, no existe el riesgo de salir a producción en `noindex` por accidente.
   * El chequeo del día del deploy es una línea:
   *
   *     curl -sI https://www.notebooks.com.ar/notebooks | grep -i x-robots-tag
   *
   * No debe devolver nada.
   */
  if (host !== SITE_HOST) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return aplicarAtribucion(res, plan, req);
}

export const config = {
  /**
   * Todo menos los assets del build y los archivos con extensión.
   *
   * Antes el matcher era sólo `/admin` y `/api/admin`; ahora tiene que cubrir el sitio
   * entero porque el host canónico y la atribución aplican a cualquier página. Se excluyen
   * `_next`, el favicon y las rutas con punto (`.png`, `.txt`, `.xml`) para no pagar un
   * middleware por cada imagen.
   *
   * `/api` **no** se excluye: `/api/admin` necesita la puerta. Lo que sí queda afuera es
   * `/api/csp-report`, que recibe volumen de navegadores y no gana nada con pasar por acá.
   */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/csp-report|.*\\.).*)"],
};
