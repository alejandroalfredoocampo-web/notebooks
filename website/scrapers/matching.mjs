/**
 * Matching publicación → modelo canónico.
 * Orden: 1) part number exacto  2) huella de specs (marca + CPU + RAM + storage + GPU).
 * Los matches con confianza < THRESHOLD van a la cola de revisión manual.
 */
import { parseSpecsFromTitle } from "./lib.mjs";

export const CONFIDENCE_THRESHOLD = 0.8;

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

// Familia de CPU a partir de texto libre (título o atributo)
function cpuFamily(text) {
  const t = String(text).toLowerCase();
  if (/ultra\s*9/.test(t)) return "ultra9";
  if (/\bi9\b|core\s*i9/.test(t)) return "i9";
  if (/\bi7\b|core\s*i7/.test(t)) return "i7";
  if (/\bi5\b|core\s*i5|core\s*5\b/.test(t)) return "i5";
  if (/\bi3\b|core\s*i3/.test(t)) return "i3";
  if (/ryzen\s*9/.test(t)) return "ryzen9";
  if (/ryzen\s*7/.test(t)) return "ryzen7";
  if (/ryzen\s*5/.test(t)) return "ryzen5";
  if (/\bm[1-4]\b|apple\s*m/.test(t)) return "apple-m";
  return null;
}

// Detecta GPU dedicada (RTX/GTX/Radeon RX) para distinguir gamer vs oficina
function gpuKey(text) {
  const t = String(text).toLowerCase();
  const m = t.match(/(rtx|gtx)\s*(\d{3,4})/);
  if (m) return `${m[1]}${m[2]}`;
  if (/radeon\s*rx\s*\d{3,4}/.test(t)) return t.match(/rx\s*(\d{3,4})/)[1];
  return null;
}

function fingerprint(text, attrs = {}) {
  const blob = [text, ...Object.values(attrs)].join(" ");
  const specs = parseSpecsFromTitle(blob);
  return {
    cpu: cpuFamily(blob),
    ramGb: specs.ramGb,
    storageGb: specs.storageGb,
    gpu: gpuKey(blob),
  };
}

// Tokens distintivos de la LÍNEA del modelo (ej. "IdeaPad Slim 3 15IRH8" →
// ["ideapad","slim","15irh8"]), ignorando ruido genérico. Se usa para no
// confundir un "V15" con un "Slim 3" cuando el resto de las specs coinciden.
const NAME_STOPWORDS = new Set([
  "notebook", "laptop", "gaming", "gamer", "portatil", "core", "ryzen", "intel",
  "amd", "apple", "ssd", "nvme", "ram", "gb", "tb", "windows", "w11", "pulgadas",
]);
function lineTokens(name) {
  return String(name)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !NAME_STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * @param {object[]} rawListings  publicaciones de los scrapers (con .titleRaw, .attrs)
 * @param {object[]} models       modelos canónicos (data/models.json)
 * @returns {{ matched: object[], review: object[] }}
 */
export function matchListings(rawListings, models) {
  // Índice de part numbers normalizados
  const byPart = new Map();
  for (const m of models) {
    if (m.partNumber) byPart.set(norm(m.partNumber), m);
  }

  const matched = [];
  const review = [];

  for (const l of rawListings) {
    const blob = [l.titleRaw, ...Object.values(l.attrs ?? {})].join(" ");
    const normBlob = norm(blob);

    // 1) Part number exacto
    let model = null;
    let confidence = 0;
    let reason = "";
    for (const [pn, m] of byPart) {
      if (pn.length >= 5 && normBlob.includes(pn)) {
        model = m;
        confidence = 1;
        reason = "part-number";
        break;
      }
    }

    // 2) Huella de specs + nombre de línea
    if (!model) {
      const fp = fingerprint(l.titleRaw, l.attrs);
      let best = null;
      let bestScore = 0;
      for (const m of models) {
        if (norm(m.brand) && !normBlob.includes(norm(m.brand))) continue; // marca requerida

        // Coincidencia de la línea del modelo por nombre (peso alto): evita
        // confundir modelos distintos de la misma marca con specs parecidas.
        const toks = lineTokens(m.name);
        const hits = toks.filter((t) => normBlob.includes(norm(t))).length;
        const nameScore = toks.length ? hits / toks.length : 0;

        let score = 0.2; // marca ok
        let denom = 0.2;
        const add = (ok, w) => { denom += w; if (ok) score += w; };
        add(true, 0); // (marca ya sumada)
        score += 0.45 * nameScore; denom += 0.45; // nombre de línea
        add(fp.cpu && fp.cpu === m.cpuFamily, 0.2);
        add(fp.ramGb && fp.ramGb === m.ramGb, 0.08);
        add(fp.storageGb && fp.storageGb === m.storageGb, 0.07);
        if (m.gpuType === "dedicada") add(fp.gpu && norm(m.gpu).includes(norm(fp.gpu)), 0.1);

        const normScore = score / denom;
        if (normScore > bestScore) { bestScore = normScore; best = m; }
      }
      if (best) { model = best; confidence = Number(bestScore.toFixed(2)); reason = "specs"; }
    }

    const record = {
      ...l,
      modelId: confidence >= CONFIDENCE_THRESHOLD ? model?.id ?? null : null,
      matchConfidence: confidence,
      matchReason: reason,
      matchCandidate: model?.id ?? null,
    };

    if (confidence >= CONFIDENCE_THRESHOLD) matched.push(record);
    else review.push(record);
  }

  return { matched, review };
}
