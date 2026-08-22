/**
 * Rate limiting de los endpoints públicos.
 *
 * ## Por qué hacía falta
 *
 * El sitio tiene cinco endpoints `POST` abiertos sin ninguna credencial: alta de alerta de
 * precio, aviso de disponibilidad, solicitud corporativa, alta de tienda y login del admin.
 * Ninguno tenía techo. Tres consecuencias concretas, no hipotéticas:
 *
 *  - **Bomba de mails a terceros.** `/api/alertas` guarda un email que después recibe
 *    correo del sitio. Un script que mete 50.000 direcciones ajenas convierte el sistema de
 *    alertas en un remitente de spam, y lo que se quema es la reputación del dominio: los
 *    mails que sí importan dejan de entregarse.
 *  - **Fuerza bruta contra el admin.** Una sola contraseña compartida, sin límite de
 *    intentos, es cuestión de tiempo.
 *  - **Factura de Supabase.** Cada request es un insert. El plan cobra por eso.
 *
 * ## Modo de falla: se deja pasar
 *
 * Si la base falla, se permite y se loguea como error. La alternativa —rechazar formularios
 * porque no pudimos contar— apaga funciones reales por un problema de infraestructura
 * ajeno. Es una condición que hay que arreglar, no un modo de operación, y por eso sale por
 * `console.error` y no por un aviso silencioso.
 *
 * La excepción es el login del admin: ahí el modo de falla es **cerrado**. Ver `LIMITES`.
 */

export type Limite = {
  /** Requests permitidos en la ventana. */
  cuota: number;
  /** Largo de la ventana, en segundos. */
  ventana: number;
  /**
   * Si la base no está disponible, ¿se deja pasar?
   *
   * `true` para los formularios: un lector que no puede crear una alerta porque Supabase
   * tuvo un hipo es peor que un spammer que pasa. `false` para el login del admin: ahí
   * "no pude contar los intentos" y "dejá intentar infinito" no pueden ser lo mismo.
   */
  abrirSiFalla: boolean;
};

export const LIMITES = {
  /** Formularios que generan un email o una fila que después alguien lee a mano. */
  formulario: { cuota: 5, ventana: 3600, abrirSiFalla: true },
  /** Login del admin. Cinco intentos por hora y por IP; falla cerrado. */
  login: { cuota: 5, ventana: 3600, abrirSiFalla: false },
  /** Endpoints de lectura que igual cuestan una consulta (autocomplete). */
  lectura: { cuota: 120, ventana: 60, abrirSiFalla: true },
} as const satisfies Record<string, Limite>;

export type Veredicto =
  | { permitido: true }
  | { permitido: false; reintentarEn: number };

/**
 * IP del visitante.
 *
 * Detrás de un CDN, `cf-connecting-ip` (Cloudflare) y `x-real-ip` (Vercel/Nginx) los pone
 * el borde y **el cliente no los puede falsificar**. `x-forwarded-for` sí lo puede escribir
 * cualquiera: se toma el **primer** salto, que es lo mejor disponible, sabiendo que no es
 * una garantía. Sin ninguno de los tres, todos los requests caen en la misma clave — que es
 * conservador y está bien: en un entorno sin proxy no hay tráfico real que castigar.
 */
export function ipDelRequest(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "sin-ip";
}

/**
 * Clave de la ventana en curso.
 *
 * La ventana va adentro de la clave (`alerta:1.2.3.4:481234`), así que cada ventana es una
 * fila nueva y no hay que resetear nada. El número es el índice de la ventana desde epoch:
 * cambia solo cuando pasa el tiempo.
 */
export function clave(alcance: string, ip: string, ventana: number, ahora = Date.now()): string {
  const indice = Math.floor(ahora / 1000 / ventana);
  return `${alcance}:${ip}:${indice}`;
}

/** Segundos que faltan para que se abra la ventana siguiente. */
export function reintentarEn(ventana: number, ahora = Date.now()): number {
  const seg = Math.floor(ahora / 1000);
  return Math.max(1, ventana - (seg % ventana));
}

/**
 * Consume una unidad del cupo y dice si el request pasa.
 *
 * `alcance` separa los contadores: gastar el cupo de alertas no tiene por qué dejar a la
 * misma IP sin poder pedir un presupuesto corporativo.
 */
export async function chequearLimite(
  alcance: string,
  req: Request,
  limite: Limite,
): Promise<Veredicto> {
  const ip = ipDelRequest(req);
  const ahora = Date.now();
  const k = clave(alcance, ip, limite.ventana, ahora);

  try {
    // Import diferido a propósito: `supabaseServer` tira al importarse si faltan las
    // variables de entorno, y eso volvía imposible testear las funciones puras de este
    // módulo (`clave`, `ipDelRequest`, `reintentarEn`) sin levantar medio entorno.
    const { supabase } = await import("./supabaseServer");
    const { data, error } = await supabase.rpc("bump_rate_limit", {
      p_clave: k,
      p_segundos: limite.ventana + 60,
    });
    if (error) throw error;
    const cuenta = Number(data);
    if (!Number.isFinite(cuenta)) throw new Error(`bump_rate_limit devolvió ${data}`);
    if (cuenta > limite.cuota) {
      return { permitido: false, reintentarEn: reintentarEn(limite.ventana, ahora) };
    }
    return { permitido: true };
  } catch (e) {
    console.error(`[limites] no se pudo contar "${alcance}"`, e);
    return limite.abrirSiFalla
      ? { permitido: true }
      : { permitido: false, reintentarEn: reintentarEn(limite.ventana, ahora) };
  }
}

/**
 * La respuesta 429, con `Retry-After`.
 *
 * El header no es decorativo: es lo que le dice a un cliente legítimo cuándo volver, y lo
 * que evita que un formulario reintente en bucle contra una puerta cerrada.
 */
export function respuesta429(reintentarEn: number): Response {
  return new Response(
    JSON.stringify({
      error:
        "Demasiados intentos desde esta conexión. Probá de nuevo en un rato.",
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(reintentarEn),
        "cache-control": "no-store",
      },
    },
  );
}
