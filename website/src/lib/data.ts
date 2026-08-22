import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabase } from "./supabaseServer";
import { ramBucket, storageBucket, screenBucket } from "./specFilters";
import { cleanModelName } from "./format";
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
    verified: Boolean(r.verified),
    // Perfil + reputación (columnas de la migración 0006; ausentes → undefined)
    logoUrl: (r.logo_url as string) ?? undefined,
    description: (r.description as string) ?? undefined,
    googleRating: (r.google_rating as number) ?? null,
    googleReviewsCount: (r.google_reviews_count as number) ?? null,
    googleMapsUrl: (r.google_maps_url as string) ?? null,
    ratingUpdatedAt: (r.rating_updated_at as string) ?? null,
    socials: (r.socials as Record<string, string>) ?? null,
    paymentMethods: (r.payment_methods as string) ?? null,
    shipsNationwide: r.ships_nationwide == null ? undefined : Boolean(r.ships_nationwide),
    physicalAddress: (r.physical_address as string) ?? null,
    // Monetización (spec 10). El público NO recibe cpc_ars (info comercial).
    tier: (r.tier as Store["tier"]) ?? "free",
    featured: Boolean(r.featured),
    featuredUntil: (r.featured_until as string) ?? null,
  };
}

function mapModel(r: Row): NotebookModel {
  return {
    id: r.id as string,
    brand: r.brand as string,
    brandSlug: r.brand_slug as string,
    name: cleanModelName(r.brand as string, r.name as string),
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

/**
 * Ventana del historial de precios, en días.
 *
 * ## Por qué existe, y el error que arregla
 *
 * `price_history` se traía **entera**, sin filtro de fecha, y de ahí salía `avg90`. O sea
 * que el promedio que el sitio llama "de los últimos 90 días" era en realidad el promedio
 * de **todo** el historial — y esa cifra es la que sostiene la afirmación central del
 * producto: la insignia de "oferta verificada", el termómetro de precio, y lo que
 * `llms.txt` le declara a un modelo como definición de oferta real. Hoy la diferencia es
 * chica porque el historial es corto; dentro de un año el "promedio de 90 días" sería el
 * promedio de cuatro trimestres y las ofertas dejarían de detectarse.
 *
 * El mismo filtro arregla un problema de escala: la consulta crecía sin techo. Con 3.000
 * modelos y un punto por día, al año son ~1.000.000 de filas traídas **en cada request**.
 */
const DIAS_HISTORIAL = 90;

function desdeCuando(dias = DIAS_HISTORIAL): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Carga única por request (React cache dedupe). RLS deja ver solo el catálogo
// público y las publicaciones confirmadas.
// ---------------------------------------------------------------------------
/**
 * Etiqueta de caché del catálogo.
 *
 * Todo lo público sale de una sola consulta, así que hay una sola etiqueta. La invalidan
 * el scraper (por `POST /api/revalidar`) y las escrituras del admin, que es lo que permite
 * que el sitio esté cacheado **y** al día: no se espera a que venza un TTL, se avisa cuando
 * el dato cambió.
 */
export const TAG_CATALOGO = "catalogo";

/**
 * Techo de frescura, en segundos.
 *
 * Es la red por si la invalidación no llega — un scraper que falla, un deploy que se lleva
 * el secreto, una escritura por fuera de la app (alguien tocando la tabla en el panel de
 * Supabase). Sin este techo, un aviso perdido deja el sitio con precios viejos hasta el
 * próximo deploy, y en un comparador eso no es un cache viejo: es un precio equivocado.
 *
 * Cinco minutos es corto para lo que cambia "varias veces por día" y suficiente para que
 * una ráfaga de visitas no se traduzca en una ráfaga de consultas.
 */
const SEGUNDOS_CATALOGO = 300;

/**
 * La consulta cruda. Devuelve **sólo estructuras planas**, a propósito.
 *
 * `unstable_cache` serializa lo que devuelve la función, y un `Map` no sobrevive esa vuelta:
 * entra como `Map` y sale como `{}`, sin error y sin ruido. Por eso los índices (`storesById`)
 * se arman afuera, sobre lo que salió del caché.
 */
const traerCatalogo = unstable_cache(
  async () => {
    const [storesR, modelsR, listingsR, historyR] = await Promise.all([
      // select('*') es resiliente (solo trae columnas existentes → no rompe si una
      // migración no corrió). `cpc_ars` (info comercial) NO se mapea al Store público
      // — ver mapStore — y como las páginas públicas son server components, nunca llega
      // al navegador.
      supabase.from("stores").select("*"),
      supabase.from("models").select("*"),
      supabase.from("listings").select("*"),
      supabase
        .from("price_history")
        .select("model_id,captured_on,best_price")
        // Acotado a la ventana que el sitio dice usar. Ver `DIAS_HISTORIAL`.
        .gte("captured_on", desdeCuando())
        .order("captured_on", { ascending: true }),
    ]);

    const firstErr = storesR.error || modelsR.error || listingsR.error || historyR.error;
    if (firstErr) throw new Error(`Supabase: ${firstErr.message}`);

    return {
      stores: (storesR.data ?? []).map(mapStore),
      models: (modelsR.data ?? []).map(mapModel),
      listings: (listingsR.data ?? []).map(mapListing),
      historial: (historyR.data ?? []) as Row[],
    };
  },
  ["catalogo-publico"],
  { tags: [TAG_CATALOGO], revalidate: SEGUNDOS_CATALOGO },
);

/**
 * Catálogo listo para usar: una vez por request (`cache` de React) sobre el resultado
 * cacheado entre requests (`unstable_cache`).
 *
 * ## Por qué se cachea, si la decisión anterior era "siempre en vivo"
 *
 * La decisión era correcta en su motivo —un comparador no puede mostrar un precio de ayer—
 * y cara en su implementación: cada visita a cualquier página disparaba cuatro consultas de
 * tabla completa. La home sola son cinco llamadas al catálogo entero.
 *
 * Cachear **por etiqueta** en vez de por tiempo conserva el motivo y saca el costo: el dato
 * se sirve del caché hasta que alguien avisa que cambió, y quien lo cambia es siempre el
 * mismo par de lugares (el scraper y el admin), que ahora avisan. El techo de cinco minutos
 * cubre el caso en que el aviso no llegue.
 */
const loadAll = cache(async () => {
  const { stores, models, listings, historial } = await traerCatalogo();

  const storesById = new Map(stores.map((s) => [s.id, s]));
  const historyByModel: Record<string, PricePoint[]> = {};
  for (const r of historial) {
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
  // Es el mínimo **de la ventana**, no de todo el tiempo. El nombre del campo quedó por
  // compatibilidad; el texto que lo muestra dice "en 90 días", que es lo que se puede
  // afirmar. Decir "mínimo histórico" sobre una ventana de 90 días es la clase de
  // afirmación que un lector puede desmentir mirando el gráfico de al lado.
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

/** ¿La tienda tiene el slot "Patrocinado" activo hoy? (featured + vigencia) */
export function isStoreFeatured(s: Store): boolean {
  if (!s.featured) return false;
  if (!s.featuredUntil) return true;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return s.featuredUntil >= today;
}

/** Tiendas con destacado activo (para el módulo "Patrocinado"). */
export async function getFeaturedStores(): Promise<Store[]> {
  return (await loadAll()).stores.filter(isStoreFeatured);
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

/** Ofertas de una tienda: cada modelo que vende + su precio en esa tienda (spec 04). */
export async function getStoreListings(
  storeId: string
): Promise<{ model: ModelWithOffers; listing: Listing & { store: Store } }[]> {
  const models = await getModels();
  const out: { model: ModelWithOffers; listing: Listing & { store: Store } }[] = [];
  for (const m of models) {
    const l = m.listings.find((x) => x.storeId === storeId);
    if (l) out.push({ model: m, listing: l });
  }
  return out.sort((a, b) => a.listing.priceCash - b.listing.priceCash);
}

// ---------------------------------------------------------------------------
// Inteligencia de precios por tienda (spec 11). Todo derivado de datos públicos.
// ---------------------------------------------------------------------------
export interface StoreInsightRow {
  modelId: string;
  brand: string;
  name: string;
  brandSlug: string;
  slug: string;
  storePrice: number;
  bestPrice: number;
  marketAvg: number;
  rank: number;
  totalStores: number;
  gapToBestPct: number; // % por encima del más barato (0 si es la más barata)
  isCheapest: boolean;
}
export interface StoreInsights {
  kpis: { modelsSold: number; wins: number; avgGapPct: number };
  rows: StoreInsightRow[];
}

export async function getStoreInsights(storeId: string): Promise<StoreInsights> {
  const models = await getModels();
  const rows: StoreInsightRow[] = [];
  for (const m of models) {
    const own = m.listings.find((l) => l.storeId === storeId);
    if (!own) continue;
    const prices = m.listings.map((l) => l.priceCash).filter((p) => p > 0);
    if (!prices.length) continue;
    const bestPrice = Math.min(...prices);
    const marketAvg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);
    const storePrice = own.priceCash;
    const rank = 1 + prices.filter((p) => p < storePrice).length;
    const gapToBestPct = bestPrice > 0 ? Math.round(((storePrice - bestPrice) / bestPrice) * 100) : 0;
    rows.push({
      modelId: m.id,
      brand: m.brand,
      name: m.name,
      brandSlug: m.brandSlug,
      slug: m.slug,
      storePrice,
      bestPrice,
      marketAvg,
      rank,
      totalStores: m.listings.length,
      gapToBestPct: Math.max(0, gapToBestPct),
      isCheapest: rank === 1,
    });
  }
  rows.sort((a, b) => b.gapToBestPct - a.gapToBestPct);
  const wins = rows.filter((r) => r.isCheapest).length;
  const avgGapPct = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.gapToBestPct, 0) / rows.length)
    : 0;
  return { kpis: { modelsSold: rows.length, wins, avgGapPct }, rows };
}

export async function getDeals(): Promise<ModelWithOffers[]> {
  return (await getModels())
    .filter((m) => m.isRealDeal)
    .sort((a, b) => b.dropPct - a.dropPct);
}

export interface BrandInfo {
  slug: string;
  name: string;
  logoUrl?: string;
  introMd?: string;
  heroImage?: string;
  seoTitle?: string;
  seoDesc?: string;
}

/**
 * Contenido editorial de una marca (tabla `brands`, migración 0005 opcional).
 * Resiliente: si la tabla no existe todavía o no hay fila, devuelve null y la
 * landing usa copy de fallback.
 */
export async function getBrandInfo(slug: string): Promise<BrandInfo | null> {
  try {
    const { data, error } = await supabase.from("brands").select("*").eq("slug", slug).maybeSingle();
    if (error || !data) return null;
    const r = data as Row;
    return {
      slug: r.slug as string,
      name: r.name as string,
      logoUrl: (r.logo_url as string) ?? undefined,
      introMd: (r.intro_md as string) ?? undefined,
      heroImage: (r.hero_image as string) ?? undefined,
      seoTitle: (r.seo_title as string) ?? undefined,
      seoDesc: (r.seo_desc as string) ?? undefined,
    };
  } catch {
    return null;
  }
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
  storage?: string[];
  screen?: string[];
  gpu?: string[];
  os?: string[];
  cond?: string[];
  stock?: string[];
  peso?: string[];
  price?: string[];
  fin?: string;
  use?: string;
  sort?: string;
}

export async function filterModels(f: Filters): Promise<ModelWithOffers[]> {
  // Excluimos modelos sin ofertas (catálogo "próximamente", spec 06): no se
  // muestran en listado/home para no aparecer a $0. Su ficha sí es accesible.
  let list = (await getModels()).filter((m) => m.listings.length > 0);

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
  if (f.rams?.length) list = list.filter((m) => f.rams!.includes(ramBucket(m.ramGb)));
  if (f.storage?.length)
    list = list.filter((m) => f.storage!.includes(storageBucket(m.storageGb)));
  if (f.screen?.length)
    list = list.filter((m) => f.screen!.includes(screenBucket(m.screenSizeIn)));
  if (f.gpu?.length) list = list.filter((m) => f.gpu!.includes(m.gpuType));
  if (f.os?.length)
    list = list.filter((m) => f.os!.includes(/mac/i.test(m.os) ? "macos" : "windows"));
  if (f.cond?.length)
    list = list.filter((m) => m.listings.some((l) => f.cond!.includes(l.condition)));
  if (f.stock?.length) list = list.filter((m) => m.listings.some((l) => l.inStock));
  if (f.peso?.length) list = list.filter((m) => m.weightKg > 0 && m.weightKg <= 1.5);
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
