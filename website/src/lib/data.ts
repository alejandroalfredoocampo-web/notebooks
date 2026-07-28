import { cache } from "react";
import { supabase } from "./supabaseServer";
import type {
  Store,
  NotebookModel,
  Listing,
  PricePoint,
  ModelWithOffers,
  InstallmentOffer,
} from "./types";

// Umbral para considerar una baja de precio como "oferta real"
const REAL_DEAL_THRESHOLD_PCT = 5;

// ---------------------------------------------------------------------------
// Mapeo DB (snake_case) → tipos de la app (camelCase)
// ---------------------------------------------------------------------------
type Row = Record<string, unknown>;

function mapStore(r: Row): Store {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    url: r.url as string,
    type: r.type as string,
    physicalStore: Boolean(r.physical_store),
    city: r.city as string,
    affiliate: (r.affiliate as Store["affiliate"]) ?? null,
  };
}

function mapModel(r: Row): NotebookModel {
  return {
    id: r.id as string,
    brand: r.brand as string,
    brandSlug: r.brand_slug as string,
    name: r.name as string,
    slug: r.slug as string,
    partNumber: (r.part_number as string) ?? "",
    cpu: (r.cpu as string) ?? "",
    cpuFamily: (r.cpu_family as string) ?? "",
    ramGb: (r.ram_gb as number) ?? 0,
    ramType: (r.ram_type as string) ?? "",
    storageGb: (r.storage_gb as number) ?? 0,
    storageType: (r.storage_type as string) ?? "",
    screenSizeIn: Number(r.screen_size_in ?? 0),
    screenResolution: (r.screen_resolution as string) ?? "",
    screenPanel: (r.screen_panel as string) ?? "",
    screenRefreshHz: (r.screen_refresh_hz as number) ?? 0,
    gpu: (r.gpu as string) ?? "",
    gpuType: (r.gpu_type as NotebookModel["gpuType"]) ?? "integrada",
    os: (r.os as string) ?? "",
    weightKg: Number(r.weight_kg ?? 0),
    batteryWh: (r.battery_wh as number) ?? 0,
    releaseYear: (r.release_year as number) ?? 0,
    useCases: (r.use_cases as string[]) ?? [],
    imageUrl: (r.image_url as string) ?? undefined,
  };
}

function mapListing(r: Row): Listing {
  return {
    id: r.id as string,
    storeId: r.store_id as string,
    modelId: (r.model_id as string) ?? null,
    url: (r.url as string) ?? "",
    titleRaw: (r.title_raw as string) ?? "",
    priceList: (r.price_list as number) ?? (r.price_cash as number),
    priceCash: r.price_cash as number,
    installments: (r.installments as Listing["installments"]) ?? null,
    inStock: r.in_stock !== false,
    condition: (r.condition as Listing["condition"]) ?? "new",
    lastSeenAt: (r.last_seen_at as string) ?? new Date(0).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Carga única por request (React cache dedupe). RLS deja ver solo el catálogo
// público y las publicaciones confirmadas.
// ---------------------------------------------------------------------------
const loadAll = cache(async () => {
  const [storesR, modelsR, listingsR, historyR] = await Promise.all([
    supabase.from("stores").select("*"),
    supabase.from("models").select("*"),
    supabase.from("listings").select("*"),
    supabase
      .from("price_history")
      .select("model_id,captured_on,best_price")
      .order("captured_on", { ascending: true }),
  ]);

  const firstErr = storesR.error || modelsR.error || listingsR.error || historyR.error;
  if (firstErr) throw new Error(`Supabase: ${firstErr.message}`);

  const stores = (storesR.data ?? []).map(mapStore);
  const models = (modelsR.data ?? []).map(mapModel);
  const listings = (listingsR.data ?? []).map(mapListing);

  const storesById = new Map(stores.map((s) => [s.id, s]));
  const historyByModel: Record<string, PricePoint[]> = {};
  for (const r of historyR.data ?? []) {
    (historyByModel[r.model_id as string] ??= []).push({
      date: r.captured_on as string,
      bestPrice: r.best_price as number,
    });
  }
  return { stores, models, listings, storesById, historyByModel };
});

// ---------------------------------------------------------------------------
// Financiación (cuotas)
// ---------------------------------------------------------------------------
function isInterestFree(count: number, amount: number, priceCash: number): boolean {
  return count * amount <= priceCash * 1.02;
}

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

// ---------------------------------------------------------------------------
// Enriquecimiento de un modelo con sus ofertas / precio / historial
// ---------------------------------------------------------------------------
type Loaded = Awaited<ReturnType<typeof loadAll>>;

function enrich(model: NotebookModel, data: Loaded): ModelWithOffers {
  const modelListings = data.listings
    .filter((l) => l.modelId === model.id)
    .map((l) => ({ ...l, store: data.storesById.get(l.storeId) }))
    .filter((l): l is Listing & { store: Store } => Boolean(l.store))
    .sort((a, b) => a.priceCash - b.priceCash);

  const inStock = modelListings.filter((l) => l.inStock);
  const bestListing = inStock[0] ?? modelListings[0] ?? null;
  const bestPrice = bestListing?.priceCash ?? 0;

  const h = data.historyByModel[model.id] ?? [];
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

// ---------------------------------------------------------------------------
// API pública de datos (ahora async)
// ---------------------------------------------------------------------------
export async function getStores(): Promise<Store[]> {
  return (await loadAll()).stores;
}

export async function getStore(id: string): Promise<Store | undefined> {
  return (await loadAll()).storesById.get(id);
}

export async function getStoreBySlug(slug: string): Promise<Store | undefined> {
  return (await loadAll()).stores.find((s) => s.slug === slug);
}

export async function getListing(id: string): Promise<Listing | undefined> {
  return (await loadAll()).listings.find((l) => l.id === id);
}

export async function getHistory(modelId: string): Promise<PricePoint[]> {
  return (await loadAll()).historyByModel[modelId] ?? [];
}

export async function getModels(): Promise<ModelWithOffers[]> {
  const data = await loadAll();
  return data.models.map((m) => enrich(m, data));
}

export async function getModelBySlug(
  brandSlug: string,
  slug: string
): Promise<ModelWithOffers | undefined> {
  const data = await loadAll();
  const m = data.models.find((x) => x.brandSlug === brandSlug && x.slug === slug);
  return m ? enrich(m, data) : undefined;
}

export async function getDeals(): Promise<ModelWithOffers[]> {
  return (await getModels())
    .filter((m) => m.isRealDeal)
    .sort((a, b) => b.dropPct - a.dropPct);
}

export async function getBrands(): Promise<{ name: string; slug: string; count: number }[]> {
  const { models } = await loadAll();
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
  rams?: string[];
  gpu?: string[];
  price?: string[];
  fin?: string;
  use?: string;
  sort?: string;
}

export async function filterModels(f: Filters): Promise<ModelWithOffers[]> {
  let list = await getModels();

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
      list.sort(
        (a, b) =>
          Number(b.hasInterestFree) - Number(a.hasInterestFree) ||
          b.maxInstallments - a.maxInstallments
      );
      break;
    default:
      list.sort(
        (a, b) => b.listings.length - a.listings.length || b.dropPct - a.dropPct
      );
  }
  return list;
}

export async function countListings(): Promise<number> {
  return (await loadAll()).listings.length;
}
