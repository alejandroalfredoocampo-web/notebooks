import storesJson from "../../data/stores.json";
import modelsJson from "../../data/models.json";
import listingsJson from "../../data/listings.json";
import historyJson from "../../data/price-history.json";
// Overlay horneado por el pipeline (scrapers/publish.mjs). Siempre existen con
// defaults vacíos, así el import estático funciona y el sitio queda edge-safe.
import generatedListingsJson from "../../data/generated-listings.json";
import generatedImagesJson from "../../data/generated-images.json";
import generatedHistoryJson from "../../data/generated-history.json";
import generatedModelsJson from "../../data/generated-models.json";
import type {
  Store,
  NotebookModel,
  Listing,
  PricePoint,
  ModelWithOffers,
  InstallmentOffer,
} from "./types";

const stores = storesJson as Store[];
const history = historyJson as Record<string, PricePoint[]>;

// Modelos del seed curado + los creados por el operador y publicados (dedupe por id)
const models: NotebookModel[] = (() => {
  const byId = new Map<string, NotebookModel>();
  for (const m of modelsJson as NotebookModel[]) byId.set(m.id, m);
  for (const m of generatedModelsJson as NotebookModel[]) byId.set(m.id, m);
  return [...byId.values()];
})();

const generatedImages = generatedImagesJson as Record<string, string>;
const generatedHistory = generatedHistoryJson as Record<string, PricePoint[]>;

// Ofertas del seed curado + las publicadas por el pipeline (dedupe por id)
const listings: Listing[] = (() => {
  const byId = new Map<string, Listing>();
  for (const l of listingsJson as Listing[]) byId.set(l.id, l);
  for (const l of generatedListingsJson as Listing[]) byId.set(l.id, l);
  return [...byId.values()];
})();

// Umbral para considerar una baja de precio como "oferta real"
const REAL_DEAL_THRESHOLD_PCT = 5;

// Una financiación es "sin interés" si el total en cuotas no supera al contado
// por más de ~2% (margen para redondeos de la tienda).
function isInterestFree(count: number, amount: number, priceCash: number): boolean {
  return count * amount <= priceCash * 1.02;
}

/**
 * Elige la mejor financiación entre las ofertas de un modelo.
 * Prioridad: sin interés > más cuotas > cuota más baja.
 */
function pickBestInstallment(
  listings: (Listing & { store: Store })[]
): { best: InstallmentOffer | null; maxInstallments: number; hasInterestFree: boolean } {
  const offers: InstallmentOffer[] = [];
  for (const l of listings) {
    if (!l.installments) continue;
    const { count, amount } = l.installments;
    if (!count || !amount) continue;
    offers.push({
      count,
      amount,
      interestFree: isInterestFree(count, amount, l.priceCash),
      storeName: l.store.name,
    });
  }
  if (!offers.length) return { best: null, maxInstallments: 0, hasInterestFree: false };

  const best = [...offers].sort(
    (a, b) =>
      Number(b.interestFree) - Number(a.interestFree) ||
      b.count - a.count ||
      a.amount - b.amount
  )[0];
  return {
    best,
    maxInstallments: Math.max(...offers.map((o) => o.count)),
    hasInterestFree: offers.some((o) => o.interestFree),
  };
}

export function getStores(): Store[] {
  return stores;
}

export function getStore(id: string): Store | undefined {
  return stores.find((s) => s.id === id);
}

export function getStoreBySlug(slug: string): Store | undefined {
  return stores.find((s) => s.slug === slug);
}

export function getListing(id: string): Listing | undefined {
  return listings.find((l) => l.id === id);
}

export function getHistory(modelId: string): PricePoint[] {
  // Historial real del pipeline si aporta datos; si no, el del seed.
  const real = generatedHistory[modelId];
  if (real && real.length >= 2) return real;
  return history[modelId] ?? real ?? [];
}

function enrich(model: NotebookModel): ModelWithOffers {
  const modelListings = listings
    .filter((l) => l.modelId === model.id)
    .map((l) => ({ ...l, store: getStore(l.storeId) }))
    .filter((l): l is Listing & { store: Store } => Boolean(l.store)) // descarta tienda desconocida
    .sort((a, b) => a.priceCash - b.priceCash);

  const inStock = modelListings.filter((l) => l.inStock);
  const bestListing = inStock[0] ?? modelListings[0] ?? null;
  const bestPrice = bestListing?.priceCash ?? 0;

  const h = getHistory(model.id);
  const avg90 = h.length
    ? Math.round(h.reduce((s, p) => s + p.bestPrice, 0) / h.length)
    : null;
  const minHistoric = h.length ? Math.min(...h.map((p) => p.bestPrice)) : null;
  const dropPct =
    avg90 && bestPrice ? Math.round(((avg90 - bestPrice) / avg90) * 100) : 0;

  const { best: bestInstallment, maxInstallments, hasInterestFree } =
    pickBestInstallment(modelListings);

  return {
    ...model,
    imageUrl: model.imageUrl ?? generatedImages[model.id], // seed curado gana; si no, la del pipeline
    listings: modelListings,
    bestPrice,
    bestListing,
    avg90,
    minHistoric,
    dropPct: Math.max(0, dropPct),
    isRealDeal: dropPct >= REAL_DEAL_THRESHOLD_PCT,
    bestInstallment,
    maxInstallments,
    hasInterestFree,
  };
}

export function getModels(): ModelWithOffers[] {
  return models.map(enrich);
}

export function getModelBySlug(
  brandSlug: string,
  slug: string
): ModelWithOffers | undefined {
  const m = models.find((x) => x.brandSlug === brandSlug && x.slug === slug);
  return m ? enrich(m) : undefined;
}

export function getDeals(): ModelWithOffers[] {
  return getModels()
    .filter((m) => m.isRealDeal)
    .sort((a, b) => b.dropPct - a.dropPct);
}

export function getBrands(): { name: string; slug: string; count: number }[] {
  const map = new Map<string, { name: string; slug: string; count: number }>();
  for (const m of models) {
    const e = map.get(m.brandSlug);
    if (e) e.count++;
    else map.set(m.brandSlug, { name: m.brand, slug: m.brandSlug, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface Filters {
  q?: string;
  brands?: string[];
  cpus?: string[];
  rams?: string[]; // "8" | "16" | "32"
  gpu?: string[]; // "integrada" | "dedicada"
  price?: string[]; // "0-1200000" etc.
  fin?: string; // "sininteres" → solo modelos con cuotas sin interés
  use?: string;
  sort?: string;
}

export function filterModels(f: Filters): ModelWithOffers[] {
  let list = getModels();

  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter((m) =>
      [m.brand, m.name, m.cpu, m.gpu, `${m.ramGb}gb`, `${m.storageGb}gb`]
        .join(" ")
        .toLowerCase()
        .includes(q) ||
      q.split(/\s+/).every((w) =>
        [m.brand, m.name, m.cpu, m.gpu, `${m.ramGb}`, `${m.storageGb}`]
          .join(" ")
          .toLowerCase()
          .includes(w)
      )
    );
  }
  if (f.brands?.length) list = list.filter((m) => f.brands!.includes(m.brandSlug));
  if (f.cpus?.length) list = list.filter((m) => f.cpus!.includes(m.cpuFamily));
  if (f.rams?.length) {
    list = list.filter((m) =>
      f.rams!.some((r) => {
        if (r === "8") return m.ramGb >= 8 && m.ramGb < 16;
        if (r === "16") return m.ramGb >= 16 && m.ramGb < 32;
        return m.ramGb >= 32;
      })
    );
  }
  if (f.gpu?.length) list = list.filter((m) => f.gpu!.includes(m.gpuType));
  if (f.price?.length) {
    list = list.filter((m) =>
      f.price!.some((p) => {
        const [min, max] = p.split("-").map(Number);
        return m.bestPrice >= min && m.bestPrice <= max;
      })
    );
  }
  if (f.fin === "sininteres") list = list.filter((m) => m.hasInterestFree);
  if (f.use) list = list.filter((m) => m.useCases.includes(f.use!));

  switch (f.sort) {
    case "price-asc":
      list.sort((a, b) => a.bestPrice - b.bestPrice);
      break;
    case "price-desc":
      list.sort((a, b) => b.bestPrice - a.bestPrice);
      break;
    case "drop":
      list.sort((a, b) => b.dropPct - a.dropPct);
      break;
    case "cuotas":
      // más financiación: sin interés primero, después más cuotas
      list.sort(
        (a, b) =>
          Number(b.hasInterestFree) - Number(a.hasInterestFree) ||
          b.maxInstallments - a.maxInstallments
      );
      break;
    default:
      // relevancia: más ofertas primero, después mayor baja
      list.sort(
        (a, b) => b.listings.length - a.listings.length || b.dropPct - a.dropPct
      );
  }
  return list;
}

export function countListings(): number {
  return listings.length;
}
