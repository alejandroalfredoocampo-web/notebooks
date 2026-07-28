/**
 * Utilidades comunes para scrapers.
 */
export const USER_AGENT =
  "NotebooksComArBot/1.0 (+https://www.notebooks.com.ar/bot)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastRequest = 0;
/** GET con rate-limit global de 1 req/seg y user-agent identificable. */
export async function politeFetch(url, options = {}) {
  const wait = Math.max(0, lastRequest + 1000 - Date.now());
  if (wait) await sleep(wait);
  lastRequest = Date.now();
  const res = await fetch(url, {
    ...options,
    headers: { "User-Agent": USER_AGENT, ...(options.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return res;
}

/** Normaliza un precio argentino ("$1.234.567,89" | 1234567) a entero ARS. */
export function parsePriceARS(raw) {
  if (typeof raw === "number") return Math.round(raw);
  const clean = String(raw)
    .replace(/[^\d.,]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Parseo básico de specs desde el título de una publicación.
 * Devuelve { cpu, ramGb, storageGb, screenSizeIn } con null donde no matchea.
 * El matching real usa esto + diccionarios; ver README.
 */
export function parseSpecsFromTitle(title) {
  const t = title.toUpperCase();
  const cpu =
    t.match(/(?:INTEL\s*)?CORE\s*(?:ULTRA\s*\d|I[3579])[- ]?\w*/)?.[0] ??
    t.match(/RYZEN\s*[3579]\s*\w*/)?.[0] ??
    t.match(/\bM[1-4](?:\s*(?:PRO|MAX))?\b/)?.[0] ??
    null;
  const ramGb = Number(t.match(/(\d{1,2})\s*GB(?:\s*(?:RAM|DDR))?/)?.[1]) || null;
  const storage =
    t.match(/(\d+)\s*TB/) ? Number(t.match(/(\d+)\s*TB/)[1]) * 1000 :
    Number(t.match(/(\d{3,4})\s*GB\s*(?:SSD|NVME)?/)?.[1]) || null;
  const screenSizeIn = Number(t.match(/(\d{2}[.,]?\d?)\s*(?:"|”|PULG)/)?.[1]?.replace(",", ".")) || null;
  return { cpu, ramGb, storageGb: storage, screenSizeIn };
}
