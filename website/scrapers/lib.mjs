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

/**
 * Valida que las credenciales del entorno sirvan para ESCRIBIR en Supabase.
 * Aborta con un mensaje claro si falta la key o si pasaron la anon/publishable
 * (que respeta RLS → los INSERT fallan y los DELETE borran 0 filas EN SILENCIO).
 * Llamarla al inicio de todo script que escriba.
 */
export function requireServiceRole() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("\n❌ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.\n");
    process.exit(1);
  }
  if (/^sb_publishable_/.test(key) || key === process.env.SUPABASE_ANON_KEY) {
    console.error(`
❌ La key de SUPABASE_SERVICE_ROLE_KEY es la ANON/PUBLISHABLE, no la service_role.

   Con esta key el script NO puede escribir: los INSERT fallan con
   "violates row-level security policy" y los DELETE borran 0 filas sin avisar.

   Copiá la correcta en:  Supabase → Project Settings → API Keys → "service_role" (secret)
   Empieza con  sb_secret_...  o es un JWT largo  eyJ...
   (la que empieza con sb_publishable_ es la pública, va en el navegador)
`);
    process.exit(1);
  }
  // Devuelve las claves con el MISMO nombre que usan los scripts, para que
  // `const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = requireServiceRole()`
  // funcione sin renombrar nada.
  return { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, url, key };
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
