/**
 * Atribución first-party: de dónde vino el visitante, guardado en una cookie propia.
 *
 * ## Por qué un comparador la necesita más que una tienda
 *
 * El producto de este sitio es el **click saliente**: se le manda tráfico a una tienda y
 * eso es lo que se factura. Hoy `/salir/[listingId]` registra el click con el `referer` de
 * la página anterior y nada más — o sea que se sabe que el click salió de `/notebooks`,
 * pero no si esa visita vino de Google, de una campaña paga o de un link en Instagram.
 * Sin eso no se puede responder la única pregunta que decide dónde poner plata: **cuánto
 * cuesta el click que después se cobra**.
 *
 * Y no alcanza con mirar el `referer` en el momento del click: para cuando alguien hace
 * click en "Ir a la tienda" ya navegó tres páginas y el referrer es el propio sitio. El
 * origen hay que capturarlo en la puerta y arrastrarlo.
 *
 * ## Por qué first-party y no un pixel
 *
 * Un pixel de terceros lo bloquea el navegador (ITP, ETP, uBlock) y encima manda el dato a
 * una plataforma antes que a nosotros. Esto es una cookie `HttpOnly` de primera parte
 * escrita en el middleware: sobrevive a los bloqueadores, no sale del dominio, y el dato
 * queda del lado nuestro. El costo es que hay que escribirlo, que es este archivo.
 *
 * ## Modelo: primer toque + último toque
 *
 * Se guardan los dos y no un solo valor. El primero es el que descubrió el sitio; el
 * último es el que cerró la visita. Atribuir todo al último castiga a la campaña de
 * descubrimiento y atribuir todo al primero castiga a la de cierre — con los dos guardados
 * la decisión de cuál pesa se toma al analizar, no al capturar, que es cuando todavía se
 * puede cambiar de opinión.
 */

export const COOKIE_ORIGEN = "nb_origen_90d";
export const COOKIE_VISITANTE = "nb_vid";
/** Opt-out. Si vale `"no"`, el middleware no escribe ninguna de las otras dos. */
export const COOKIE_CONSENTIMIENTO = "nb_atribucion";

export const DIAS_ATRIBUCION = 90;
/**
 * 400 días es el techo que imponen los navegadores basados en Chromium a una cookie puesta
 * por `Set-Cookie`. Pedir más no da más: lo recorta el navegador en silencio.
 */
export const DIAS_VISITANTE = 400;

/**
 * `Secure` sí o sí en producción, y no en `localhost` — donde una cookie `Secure` sobre
 * HTTP simplemente no se guarda y el desarrollo se rompe de una forma difícil de ver.
 */
export function cookieSegura(protoHeader: string | null, host: string | null): boolean {
  if (protoHeader) return protoHeader.split(",")[0].trim().toLowerCase() === "https";
  const h = (host ?? "").toLowerCase().split(":")[0];
  return h !== "localhost" && h !== "127.0.0.1" && h !== "";
}

export type Plataforma = "google" | "meta" | "tiktok" | "microsoft";

/**
 * Identificadores de click de cada plataforma.
 *
 * Van en orden de precedencia: si vienen dos (pasa cuando alguien comparte un link que ya
 * traía un `gclid`), gana el primero de la lista.
 */
const CLICK_IDS: ReadonlyArray<readonly [string, Plataforma]> = [
  ["gclid", "google"],
  ["gbraid", "google"],
  ["wbraid", "google"],
  ["fbclid", "meta"],
  ["ttclid", "tiktok"],
  ["msclkid", "microsoft"],
];

export type Toque = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  click_id?: string;
  click_plataforma?: Plataforma;
  referrer?: string;
  /** Cuándo ocurrió este toque, en ISO. */
  contacto?: string;
};

export type Guardado = { primero?: Toque; ultimo?: Toque };

/**
 * Claves cortas para la cookie.
 *
 * No es microoptimización: el techo de una cookie son 4 KB y los navegadores descartan la
 * que se pasa **sin avisar**. Con nombres largos, dos toques con `utm_campaign` y
 * `utm_content` reales pasan holgado los 600 bytes; el margen se agradece el día que
 * alguien arme una URL de campaña de 300 caracteres.
 */
const CORTA: Record<keyof Toque, string> = {
  utm_source: "s",
  utm_medium: "m",
  utm_campaign: "c",
  utm_content: "ct",
  utm_term: "t",
  click_id: "ci",
  click_plataforma: "cp",
  referrer: "r",
  contacto: "ts",
};

const LARGA: Record<string, keyof Toque> = Object.fromEntries(
  Object.entries(CORTA).map(([l, c]) => [c, l as keyof Toque]),
) as Record<string, keyof Toque>;

/**
 * Topes por campo.
 *
 * Los valores vienen de la query string, o sea de cualquiera. Sin topes, una URL armada a
 * mano con un `utm_campaign` de 3 KB llena la cookie sola y desaloja el resto.
 */
const TOPES: Partial<Record<keyof Toque, number>> = {
  utm_source: 80,
  utm_medium: 80,
  utm_campaign: 120,
  utm_content: 120,
  utm_term: 120,
  click_id: 200,
  referrer: 120,
};

/**
 * Descarta valores vacíos y **plantillas sin resolver**.
 *
 * El caso real: una campaña mal configurada manda `utm_campaign={{campaign.name}}` literal.
 * Guardarlo contamina el reporte con una fila que parece una campaña y no es ninguna, y esa
 * fila después hay que explicarla cada vez que alguien mira el tablero.
 */
export function limpio(v: string | null | undefined): string | undefined {
  if (!v) return undefined;
  const t = v.trim();
  if (!t) return undefined;
  if (/^[[{]|[\]}]$/.test(t) || t.includes("{{")) return undefined;
  return t;
}

export function clickDeParametros(
  q: URLSearchParams,
): { click_id: string; click_plataforma: Plataforma } | null {
  for (const [nombre, plataforma] of CLICK_IDS) {
    const v = limpio(q.get(nombre));
    if (v) return { click_id: v, click_plataforma: plataforma };
  }
  return null;
}

/**
 * Del referrer se guarda **sólo el origen**, nunca la URL completa.
 *
 * Una URL de referrer entera puede traer la consulta que la persona escribió en otro sitio,
 * o un token en la query. El origen (`https://www.google.com`) es todo lo que hace falta
 * para saber de dónde vino y no arrastra nada de eso. Y si el referrer es este mismo sitio,
 * no es un toque: es navegación interna.
 */
function referrerExterno(referer: string | null, hostPropio: string): string | undefined {
  if (!referer) return undefined;
  try {
    const u = new URL(referer);
    if (u.hostname.toLowerCase() === hostPropio.toLowerCase()) return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}

export function toqueDeParametros(
  q: URLSearchParams,
  referer: string | null,
  hostPropio: string,
  ahora: Date,
): Toque | null {
  const click = clickDeParametros(q);
  const t: Toque = {
    utm_source: limpio(q.get("utm_source")),
    utm_medium: limpio(q.get("utm_medium")),
    utm_campaign: limpio(q.get("utm_campaign")),
    utm_content: limpio(q.get("utm_content")),
    utm_term: limpio(q.get("utm_term")),
    ...(click ?? {}),
    referrer: referrerExterno(referer, hostPropio),
  };
  const recortado = recortar(t);
  if (!Object.keys(recortado).length) return null;
  return { ...recortado, contacto: ahora.toISOString() };
}

function recortar(t: Toque): Toque {
  const salida: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) {
    if (v === undefined || v === null || v === "") continue;
    const tope = TOPES[k as keyof Toque];
    salida[k] = tope ? String(v).slice(0, tope) : String(v);
  }
  return salida as Toque;
}

/* ---------- codificación ---------- */

function aBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function aCorto(t: Toque): Record<string, string> {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) {
    if (v === undefined || v === null || v === "") continue;
    o[CORTA[k as keyof Toque] ?? k] = String(v);
  }
  return o;
}

function aLargo(o: Record<string, unknown>): Toque {
  const t: Record<string, string> = {};
  for (const [k, v] of Object.entries(o ?? {})) {
    if (v === undefined || v === null || v === "") continue;
    const largo = LARGA[k] ?? (k as keyof Toque);
    // Una clave que no conocemos se ignora en vez de propagarse: la cookie la puede
    // editar el visitante, y lo que entra por acá termina en la base.
    if (!(largo in CORTA)) continue;
    t[largo] = String(v);
  }
  return t as Toque;
}

export function codificar(g: Guardado): string {
  const o: Record<string, unknown> = {};
  if (g.primero) o.p = aCorto(g.primero);
  if (g.ultimo) o.u = aCorto(g.ultimo);
  return aBase64Url(JSON.stringify(o));
}

export function decodificar(raw: string | undefined | null): Guardado {
  if (!raw) return {};
  const crudo =
    intentar(() => JSON.parse(deBase64Url(raw))) ??
    intentar(() => JSON.parse(decodeURIComponent(raw)));
  if (!crudo || typeof crudo !== "object") return {};
  const o = crudo as Record<string, unknown>;
  const g: Guardado = {};
  const p = aLargo((o.p ?? {}) as Record<string, unknown>);
  const u = aLargo((o.u ?? {}) as Record<string, unknown>);
  if (Object.keys(p).length) g.primero = p;
  if (Object.keys(u).length) g.ultimo = u;
  return g;
}

function intentar<T>(f: () => T): T | null {
  try {
    return f();
  } catch {
    return null;
  }
}

export function ultimoToque(g: Guardado): Toque | undefined {
  return g.ultimo ?? g.primero;
}

/**
 * Firma de un toque **sin la fecha**, para comparar si dos toques son el mismo origen.
 *
 * Sin esto, cada recarga de una página que todavía tiene los `utm_` en la URL contaría como
 * un toque nuevo y reescribiría la cookie — y el "último toque" terminaría siendo siempre
 * el mismo que el primero, con otra fecha.
 */
function firma(t: Toque | undefined): string {
  if (!t) return "";
  const { contacto: _contacto, ...resto } = t;
  return JSON.stringify(
    Object.keys(resto)
      .sort()
      .map((k) => [k, (resto as Record<string, string>)[k]]),
  );
}

/**
 * Segundos que le quedan a la ventana de atribución.
 *
 * Se cuenta desde el **primer** contacto y no se renueva con cada visita: una ventana que
 * se renueva sola no vence nunca, y entonces una campaña de hace ocho meses se sigue
 * llevando el crédito de una compra de hoy.
 */
export function segundosRestantes(g: Guardado, ahora: Date): number {
  const desde = g.primero?.contacto ? Date.parse(g.primero.contacto) : NaN;
  const total = DIAS_ATRIBUCION * 86400;
  if (!Number.isFinite(desde)) return total; // cookie sin fecha: ventana completa
  const usados = Math.floor((ahora.getTime() - desde) / 1000);
  return Math.max(0, total - usados);
}

/**
 * Decide qué guardar. Devuelve `null` cuando no hay nada que escribir — que es el caso
 * normal, porque la enorme mayoría de los requests no traen parámetros de campaña.
 */
export function fusionar(actual: Guardado, nuevo: Toque | null, ahora: Date): Guardado | null {
  if (!nuevo) return null;
  // Ventana vencida, o primera visita: el toque nuevo pasa a ser el primero.
  if (!actual.primero || segundosRestantes(actual, ahora) <= 0) {
    return { primero: nuevo };
  }
  if (firma(nuevo) === firma(ultimoToque(actual))) return null;
  return { primero: actual.primero, ultimo: nuevo };
}

/** Forma plana, para guardar junto al click saliente. */
export type Atribucion = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  click_id?: string;
  click_plataforma?: Plataforma;
  referrer?: string;
  primer_contacto?: string;
  ultimo?: Toque;
  visitante?: string;
};

export function aAtribucion(
  g: Guardado,
  extra: { visitante?: string } = {},
): Atribucion | null {
  const base = g.primero;
  if (!base || !Object.keys(base).length) {
    return extra.visitante ? { visitante: extra.visitante } : null;
  }
  const { contacto, ...chato } = base;
  const salida: Atribucion = { ...chato };
  if (contacto) salida.primer_contacto = contacto;
  if (g.ultimo && Object.keys(g.ultimo).length) salida.ultimo = g.ultimo;
  if (extra.visitante) salida.visitante = extra.visitante;
  return salida;
}
