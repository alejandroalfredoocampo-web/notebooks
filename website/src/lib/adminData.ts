import { promises as fs } from "fs";
import path from "path";
import storesJson from "../../data/stores.json";
import modelsJson from "../../data/models.json";
import type { Store, NotebookModel, Listing } from "./types";

/**
 * Capa de datos del admin. Lee los archivos generados por el pipeline
 * (review-queue.json, listings.raw.json) y persiste las decisiones del operador
 * a disco. Es Node-only (filesystem): la consola de admin corre en el server
 * Node autohospedado, no en el edge público. Cuando migremos a PostgreSQL, esta
 * capa es lo único que cambia.
 */

const DATA = path.join(process.cwd(), "data");
const f = (name: string) => path.join(DATA, name);

async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(f(name), "utf8")) as T;
  } catch {
    return fallback;
  }
}
async function writeJson(name: string, data: unknown): Promise<void> {
  await fs.writeFile(f(name), JSON.stringify(data, null, 2));
}

// Curados (seed) — se importan estáticos porque siempre existen
export const adminModels = modelsJson as NotebookModel[];
export const adminStores = storesJson as Store[];
export const storeName = (id: string) =>
  adminStores.find((s) => s.id === id)?.name ?? id;
export const modelName = (id: string | null) => {
  const m = adminModels.find((x) => x.id === id);
  return m ? `${m.brand} ${m.name}` : null;
};

export type ScrapedListing = Listing & {
  attrs?: Record<string, string>;
  image?: string | null;
  matchConfidence?: number;
  matchReason?: string;
  matchCandidate?: string | null;
  source?: string;
};

export type MatchDecision = {
  action: "confirmed" | "rejected";
  modelId: string | null;
  decidedAt: string;
  title: string;
};

export const getReviewQueue = () => readJson<ScrapedListing[]>("review-queue.json", []);
export const getRawListings = () => readJson<ScrapedListing[]>("listings.raw.json", []);
export const getManualListings = () => readJson<ScrapedListing[]>("manual-listings.json", []);
export const getMatchDecisions = () =>
  readJson<Record<string, MatchDecision>>("match-decisions.json", {});

export async function saveMatchDecision(id: string, decision: MatchDecision): Promise<void> {
  const all = await getMatchDecisions();
  all[id] = decision;
  await writeJson("match-decisions.json", all);
}

export async function addManualListing(listing: ScrapedListing): Promise<void> {
  const all = await getManualListings();
  all.push(listing);
  await writeJson("manual-listings.json", all);
}

// --- Modelos canónicos creados por el operador -----------------------------

export const getManualModels = () => readJson<NotebookModel[]>("manual-models.json", []);

export async function addManualModel(model: NotebookModel): Promise<void> {
  const all = await getManualModels();
  all.push(model);
  await writeJson("manual-models.json", all);
}

/** Todos los modelos conocidos (seed + creados a mano). */
export async function allModels(): Promise<NotebookModel[]> {
  const manual = await getManualModels();
  const byId = new Map<string, NotebookModel>();
  for (const m of adminModels) byId.set(m.id, m);
  for (const m of manual) byId.set(m.id, m);
  return [...byId.values()];
}

/** Busca una publicación por id entre raw, matched y manuales. */
export async function getListingById(id: string): Promise<ScrapedListing | undefined> {
  const [raw, matched, manual] = await Promise.all([
    getRawListings(),
    readJson<ScrapedListing[]>("listings.matched.json", []),
    getManualListings(),
  ]);
  return [...raw, ...matched, ...manual].find((l) => l.id === id);
}

// --- Prefill de specs desde una publicación --------------------------------

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function cpuFamilyFrom(text: string): string {
  const t = text.toLowerCase();
  if (/ultra\s*9/.test(t)) return "ultra9";
  if (/\bi9\b|core\s*i9/.test(t)) return "i9";
  if (/\bi7\b|core\s*i7/.test(t)) return "i7";
  if (/\bi5\b|core\s*i5|core\s*5\b/.test(t)) return "i5";
  if (/\bi3\b|core\s*i3/.test(t)) return "i3";
  if (/ryzen\s*9/.test(t)) return "ryzen9";
  if (/ryzen\s*7/.test(t)) return "ryzen7";
  if (/ryzen\s*5/.test(t)) return "ryzen5";
  if (/\bm[1-4]\b|apple\s*m/.test(t)) return "apple-m";
  return "";
}

export type ModelPrefill = {
  brand: string;
  name: string;
  cpu: string;
  cpuFamily: string;
  ramGb: number | "";
  storageGb: number | "";
  gpu: string;
  gpuType: "integrada" | "dedicada";
  screenSizeIn: number | "";
  partNumber: string;
  imageUrl: string;
};

/** Extrae specs aproximadas de una publicación para prefilltear el form. */
export function prefillFromListing(l: ScrapedListing): ModelPrefill {
  const attrs = l.attrs ?? {};
  const blob = [l.titleRaw, ...Object.values(attrs)].join(" ");
  const t = blob.toUpperCase();

  const ramGb = Number(t.match(/(\d{1,2})\s*GB(?:\s*(?:RAM|DDR))?/)?.[1]) || "";
  const storageGb =
    t.match(/(\d+)\s*TB/) ? Number(t.match(/(\d+)\s*TB/)![1]) * 1000 :
    Number(t.match(/(\d{3,4})\s*GB\s*(?:SSD|NVME)?/)?.[1]) || "";
  const screenSizeIn =
    Number(t.match(/(\d{2}[.,]?\d?)\s*(?:"|”|PULG)/)?.[1]?.replace(",", ".")) || "";
  const cpu =
    attrs["procesador"] || attrs["modelo procesador"] ||
    t.match(/(?:INTEL\s*)?CORE\s*(?:ULTRA\s*\d|I[3579])[- ]?\w*/)?.[0] ||
    t.match(/RYZEN\s*[3579]\s*\w*/)?.[0] ||
    t.match(/\bM[1-4](?:\s*(?:PRO|MAX))?\b/)?.[0] || "";
  const gpuMatch =
    blob.match(/(?:NVIDIA\s*)?(?:GeForce\s*)?(?:RTX|GTX)\s*\d{3,4}(?:\s*\w+)?/i)?.[0] ||
    blob.match(/Radeon\s*RX\s*\d{3,4}/i)?.[0] || "";

  return {
    brand: attrs["marca"] || "",
    name: l.titleRaw.replace(/^notebook\s+/i, "").slice(0, 80),
    cpu: String(cpu).trim(),
    cpuFamily: cpuFamilyFrom(blob),
    ramGb,
    storageGb,
    gpu: gpuMatch || "Integrada",
    gpuType: gpuMatch ? "dedicada" : "integrada",
    screenSizeIn,
    partNumber: attrs["numero de parte"] || attrs["número de parte"] || "",
    imageUrl: l.image ?? "",
  };
}

export { slugify };
