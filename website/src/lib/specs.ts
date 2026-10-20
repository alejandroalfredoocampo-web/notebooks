import type { NotebookModel } from "./types";

/**
 * Specs que se muestran y se declaran: sólo las que se saben.
 *
 * ## El problema
 *
 * `scrapers/bulk-review.mjs` crea los modelos que arma a partir de títulos de publicaciones
 * (`source = 'auto'`). Del título saca marca, procesador, RAM, disco y placa. **El resto lo
 * inventaba** con valores fijos: DDR4, 15,6", 1920x1080 (FHD), IPS, 60 Hz, Windows 11 Home,
 * 0 kg, 0 Wh y el año en curso. Esos valores llegaban a:
 *
 *  - el JSON-LD (`additionalProperty`), que declaraba una pantalla de 15,6" FHD a Google y a
 *    cualquier asistente que cite la ficha;
 *  - la tabla de la ficha, que mostraba "Peso 0 kg" y "Batería 0 Wh";
 *  - la guía de diseño, que exige panel IPS u OLED: un modelo automático entraba por un IPS
 *    que nadie verificó.
 *
 * Es la lección de Córdoba Notebooks con las fichas de comerciantes y los feeds (9da385be,
 * doc 118): el dato estructurado no puede afirmar lo que la página no sostiene.
 *
 * ## El arreglo, en dos mitades
 *
 * El script ya no inventa (escribe `null`). Y para los modelos que **ya** están en la base
 * con esos valores, `sinInventar` los borra al leer cuando el modelo es automático y el valor
 * es exactamente el de relleno. Un modelo automático que alguien corrigió a mano con otro
 * valor lo conserva.
 */
export const RELLENO_AUTO = {
  ram_type: "DDR4",
  storage_type: "SSD",
  screen_size_in: 15.6,
  screen_resolution: "1920x1080 (FHD)",
  screen_panel: "IPS",
  screen_refresh_hz: 60,
  os: "Windows 11 Home",
  weight_kg: 0,
  battery_wh: 0,
} as const;

type Fila = Record<string, unknown>;

/** Devuelve la fila sin los valores que `bulk-review` inventaba, si el modelo es automático. */
export function sinInventar<T extends Fila>(r: T): T {
  if (r.source !== "auto") return r;
  const limpio: Fila = { ...r };
  for (const [col, relleno] of Object.entries(RELLENO_AUTO)) {
    const v = limpio[col];
    if (v == null) continue;
    const igual = typeof relleno === "number" ? Number(v) === relleno : String(v) === relleno;
    if (igual) limpio[col] = null;
  }
  // El año no tiene un valor fijo (era "el año en que corrió el script"), así que en un
  // modelo automático no se puede distinguir del real. No se usa en ninguna parte pública;
  // se descarta igual para que nadie lo empiece a mostrar.
  limpio.release_year = null;
  return limpio as T;
}

const tamanioDisco = (gb: number) => (gb >= 1000 ? `${gb / 1000 >= 2 ? gb / 1000 : 1} TB` : `${gb} GB`);

/** Las filas de la tabla de especificaciones, sin las que no tienen dato. */
export function filasDeSpecs(m: NotebookModel): [string, string][] {
  const pantalla = [
    m.screenSizeIn ? `${m.screenSizeIn}"` : "",
    m.screenResolution,
    m.screenPanel,
    m.screenRefreshHz ? `${m.screenRefreshHz} Hz` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const filas: [string, string][] = [
    ["Procesador", m.cpu],
    ["Memoria RAM", m.ramGb ? `${m.ramGb} GB ${m.ramType}`.trim() : ""],
    ["Almacenamiento", m.storageGb ? `${tamanioDisco(m.storageGb)} ${m.storageType}`.trim() : ""],
    ["Pantalla", pantalla],
    ["Placa de video", m.gpu],
    ["Sistema operativo", m.os],
    ["Peso", m.weightKg ? `${m.weightKg} kg` : ""],
    ["Batería", m.batteryWh ? `${m.batteryWh} Wh` : ""],
    ["Part number", m.partNumber],
  ];
  return filas.filter(([, v]) => !!v && v.trim() !== "");
}

/** Resumen corto de specs para metas y textos: "Core i5 1335U, 16 GB RAM, 512 GB SSD". */
export function resumenDeSpecs(m: NotebookModel): string {
  return [
    m.cpu,
    m.ramGb ? `${m.ramGb} GB RAM` : "",
    m.storageGb ? `${tamanioDisco(m.storageGb)} ${m.storageType}`.trim() : "",
  ]
    .filter(Boolean)
    .join(", ");
}

/* ---------------------------------------------------------------------------
 * Identificadores y vigencia de ofertas, para el JSON-LD
 * ------------------------------------------------------------------------- */

const normalizar = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/**
 * El part number, sólo si se puede sostener como `mpn` del producto.
 *
 * Un modelo de este sitio agrupa configuraciones: "Omen Max 16" junta varias variantes, y el
 * part number cargado a veces es de una serie (`16T-AH000`) o de la variante de otro país
 * (`15-eg3077nr`, `MRXN3LL/A`). Declararlo como `mpn` le dice a Google que **ese** es el
 * equipo que venden las tiendas, y un buscador que cruce por MPN lo empareja con otro producto.
 *
 * Dos condiciones, que son la versión de comparador de lo que Córdoba Notebooks hizo en
 * `lib/mpn.ts` (f42bb379):
 *
 *  1. que **parezca** un número de parte (4 a 40 caracteres, sin espacios, con algún dígito);
 *  2. que al menos una publicación de una tienda lo muestre en el título. Eso es lo que lo
 *     vuelve un dato observado y no uno cargado.
 */
export function mpnVerificable(partNumber: string | undefined, titulos: string[]): string | null {
  const pn = String(partNumber ?? "").trim();
  if (pn.length < 4 || pn.length > 40 || /\s/.test(pn) || !/\d/.test(pn)) return null;
  const clave = normalizar(pn);
  if (clave.length < 4) return null;
  return titulos.some((t) => normalizar(t).includes(clave)) ? pn : null;
}

/** Cuántos días sin ver una publicación antes de dejar de declararla como oferta. */
export const DIAS_OFERTA_VIGENTE = 7;

/**
 * Si una publicación todavía se puede declarar como oferta.
 *
 * El JSON-LD declara `priceValidUntil = lastSeenAt + 7 días`. Una publicación que el scraper
 * no ve hace más de eso salía igual como `InStock`, con una validez ya vencida, mientras la
 * página mostraba "Precio desactualizado". Y sin fecha (`last_seen_at` nulo) `mapListing` pone
 * 1970. Es lo que Córdoba Notebooks resolvió con `validFrom` (8819b2af): la oferta dice desde
 * y hasta cuándo es cierta.
 */
export function ofertaVigente(lastSeenAt: string, ahora = Date.now()): boolean {
  const t = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(t) || t <= 0) return false;
  return ahora - t <= DIAS_OFERTA_VIGENTE * 24 * 60 * 60 * 1000;
}
