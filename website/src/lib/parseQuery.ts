/**
 * Parser de búsqueda por necesidad + presupuesto en lenguaje natural.
 *   "notebook para editar video hasta 1.5 millones"  → { use:"diseno", priceMax:1500000 }
 *   "algo para la facu, liviana"                      → { use:"estudiar" }
 *   "lenovo para programar hasta $1.200.000"          → { brand:"lenovo", use:"programar", priceMax:1200000 }
 *
 * Se apoya en el catálogo de usos (mismo vocabulario que la recomendación por specs).
 */

export interface ParsedQuery {
  priceMax?: number;
  use?: string; // gaming | diseno | programar | estudiar | oficina
  brand?: string; // brandSlug
  understood: boolean;
  summary: string;
}

const USE_KEYWORDS: [string, RegExp][] = [
  ["gaming", /\b(gaming|gamer|juegos?|jugar|videojuegos?)\b/],
  ["diseno", /\b(dise[nñ]o|editar|edici[oó]n|video|render|3d|arquitectura|photoshop|premiere|autocad|modelado)\b/],
  ["programar", /\b(program|desarroll|c[oó]digo|coding|dev\b|ingenier[ií]a)/],
  ["estudiar", /\b(estudi|facu|facultad|universidad|colegio|clases?|secundaria)\b/],
  ["oficina", /\b(oficina|trabajo|trabajar|office|excel|home\s*office|planilla|administrativ)/],
];

const BRAND_KEYWORDS: [string, RegExp][] = [
  ["lenovo", /\blenovo\b/],
  ["hp", /\bhp\b/],
  ["asus", /\basus\b/],
  ["dell", /\bdell\b/],
  ["acer", /\bacer\b/],
  ["apple", /\b(apple|mac|macbook)\b/],
  ["samsung", /\bsamsung\b/],
];

const USE_LABEL: Record<string, string> = {
  gaming: "gaming",
  diseno: "diseño/edición",
  programar: "programación",
  estudiar: "estudio",
  oficina: "oficina",
};

function extractBudget(t: string): number | undefined {
  let m = t.match(/(\d+(?:[.,]\d+)?)\s*(millones?|palos?|m)\b/);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 1_000_000);
  m = t.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (m) return Math.round(parseFloat(m[1].replace(",", ".")) * 1_000);
  m = t.match(/\$?\s*(\d[\d.]{4,})/); // ≥5 dígitos con posibles puntos de miles
  if (m) {
    const n = parseInt(m[1].replace(/\./g, ""), 10);
    if (n >= 100_000) return n;
  }
  return undefined;
}

export function parseQuery(raw: string): ParsedQuery {
  const t = raw.toLowerCase();
  const priceMax = extractBudget(t);
  const use = USE_KEYWORDS.find(([, re]) => re.test(t))?.[0];
  const brand = BRAND_KEYWORDS.find(([, re]) => re.test(t))?.[0];

  const understood = Boolean(priceMax || use || brand);
  const parts: string[] = [];
  if (use) parts.push(`para ${USE_LABEL[use]}`);
  if (brand) parts.push(brand.charAt(0).toUpperCase() + brand.slice(1));
  if (priceMax) parts.push(`hasta $${priceMax.toLocaleString("es-AR")}`);

  return { priceMax, use, brand, understood, summary: parts.join(" · ") };
}
