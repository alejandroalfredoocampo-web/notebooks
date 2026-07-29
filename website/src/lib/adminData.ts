import { supabaseAdmin } from "./supabaseAdmin";
import type { Store, NotebookModel } from "./types";

/**
 * Capa de datos del admin sobre Supabase (service_role → ve todo, escribe todo).
 * Reemplaza el flujo file-based + overlays: la revisión de matcheos, las
 * publicaciones propias y los modelos creados a mano viven en las tablas.
 */

// --- Lectura de catálogo -----------------------------------------------------

function mapStore(r: Record<string, unknown>): Store {
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
  };
}

function mapModel(r: Record<string, unknown>): NotebookModel {
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

export async function getAdminStores(): Promise<Store[]> {
  const { data, error } = await supabaseAdmin().from("stores").select("*").order("name");
  if (error) throw new Error(`stores: ${error.message}`);
  return (data ?? []).map(mapStore);
}

export async function getAdminModels(): Promise<NotebookModel[]> {
  const { data, error } = await supabaseAdmin().from("models").select("*");
  if (error) throw new Error(`models: ${error.message}`);
  return (data ?? []).map(mapModel).sort((a, b) => `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`));
}

// --- Publicaciones -----------------------------------------------------------

export type AdminListing = {
  id: string;
  storeId: string;
  storeName: string;
  modelId: string | null;
  modelName: string | null;
  titleRaw: string;
  priceCash: number;
  url: string;
  image: string | null;
  matchStatus: "pending" | "confirmed" | "rejected";
  matchConfidence: number;
  matchCandidate: string | null;
  source: string;
};

async function joinListings(rows: Record<string, unknown>[]): Promise<AdminListing[]> {
  const [stores, models] = await Promise.all([getAdminStores(), getAdminModels()]);
  const storeName = new Map(stores.map((s) => [s.id, s.name]));
  const modelName = new Map(models.map((m) => [m.id, `${m.brand} ${m.name}`]));
  return rows.map((l) => ({
    id: l.id as string,
    storeId: l.store_id as string,
    storeName: storeName.get(l.store_id as string) ?? (l.store_id as string),
    modelId: (l.model_id as string) ?? null,
    modelName: l.model_id ? modelName.get(l.model_id as string) ?? null : null,
    titleRaw: l.title_raw as string,
    priceCash: l.price_cash as number,
    url: (l.url as string) ?? "",
    image: (l.image as string) ?? null,
    matchStatus: (l.match_status as AdminListing["matchStatus"]) ?? "pending",
    matchConfidence: (l.match_confidence as number) ?? 0,
    matchCandidate: (l.match_candidate as string) ?? null,
    source: (l.source as string) ?? "scraper",
  }));
}

export async function getReviewQueue(): Promise<AdminListing[]> {
  const { data, error } = await supabaseAdmin()
    .from("listings")
    .select("*")
    .eq("match_status", "pending")
    .order("match_confidence", { ascending: false });
  if (error) throw new Error(`review-queue: ${error.message}`);
  return joinListings(data ?? []);
}

export async function getAllListings(): Promise<AdminListing[]> {
  const { data, error } = await supabaseAdmin()
    .from("listings")
    .select("*")
    .order("last_seen_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(`listings: ${error.message}`);
  return joinListings(data ?? []);
}

export async function getListingById(id: string): Promise<AdminListing | undefined> {
  const { data, error } = await supabaseAdmin().from("listings").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`listing: ${error.message}`);
  if (!data) return undefined;
  return (await joinListings([data]))[0];
}

// --- Escrituras del admin ----------------------------------------------------

export async function confirmMatch(listingId: string, modelId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("listings")
    .update({ model_id: modelId, match_status: "confirmed" })
    .eq("id", listingId);
  if (error) throw new Error(error.message);
}

export async function rejectMatch(listingId: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("listings")
    .update({ match_status: "rejected" })
    .eq("id", listingId);
  if (error) throw new Error(error.message);
}

export async function addManualListing(l: {
  id: string;
  storeId: string;
  modelId: string | null;
  url: string;
  titleRaw: string;
  priceList: number;
  priceCash: number;
  inStock: boolean;
  image: string | null;
}): Promise<void> {
  const { error } = await supabaseAdmin().from("listings").insert({
    id: l.id,
    store_id: l.storeId,
    model_id: l.modelId,
    url: l.url,
    title_raw: l.titleRaw,
    price_list: l.priceList,
    price_cash: l.priceCash,
    in_stock: l.inStock,
    condition: "new",
    image: l.image,
    source: "manual",
    // si ya viene con modelo, queda visible en el sitio; si no, va a revisión
    match_status: l.modelId ? "confirmed" : "pending",
  });
  if (error) throw new Error(error.message);
}

export async function createModel(
  model: Record<string, unknown>,
  fromListingId?: string
): Promise<void> {
  const { error } = await supabaseAdmin().from("models").insert(model);
  if (error) throw new Error(error.message);
  if (fromListingId) {
    await confirmMatch(fromListingId, model.id as string);
  }
}

// --- Solicitudes de tiendas (formulario público) ---------------------------

export type StoreApplication = {
  id: number;
  status: "pending" | "approved" | "rejected";
  commercialName: string;
  legalName: string | null;
  cuit: string | null;
  website: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  province: string | null;
  city: string | null;
  hasPhysicalStore: boolean;
  physicalAddress: string | null;
  shipsNationwide: boolean;
  paymentMethods: string | null;
  interestFreeInstallments: boolean;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  linkedin: string | null;
  mercadolibre: string | null;
  googleRating: number | null;
  googleReviewsCount: number | null;
  googleMapsUrl: string | null;
  catalogUrl: string | null;
  platform: string | null;
  message: string | null;
  createdAt: string;
};

function mapApplication(r: Record<string, unknown>): StoreApplication {
  return {
    id: r.id as number,
    status: (r.status as StoreApplication["status"]) ?? "pending",
    commercialName: r.commercial_name as string,
    legalName: (r.legal_name as string) ?? null,
    cuit: (r.cuit as string) ?? null,
    website: (r.website as string) ?? "",
    contactName: (r.contact_name as string) ?? null,
    contactEmail: (r.contact_email as string) ?? "",
    contactPhone: (r.contact_phone as string) ?? null,
    province: (r.province as string) ?? null,
    city: (r.city as string) ?? null,
    hasPhysicalStore: Boolean(r.has_physical_store),
    physicalAddress: (r.physical_address as string) ?? null,
    shipsNationwide: Boolean(r.ships_nationwide),
    paymentMethods: (r.payment_methods as string) ?? null,
    interestFreeInstallments: Boolean(r.interest_free_installments),
    instagram: (r.instagram as string) ?? null,
    facebook: (r.facebook as string) ?? null,
    tiktok: (r.tiktok as string) ?? null,
    youtube: (r.youtube as string) ?? null,
    linkedin: (r.linkedin as string) ?? null,
    mercadolibre: (r.mercadolibre as string) ?? null,
    googleRating: (r.google_rating as number) ?? null,
    googleReviewsCount: (r.google_reviews_count as number) ?? null,
    googleMapsUrl: (r.google_maps_url as string) ?? null,
    catalogUrl: (r.catalog_url as string) ?? null,
    platform: (r.platform as string) ?? null,
    message: (r.message as string) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function getStoreApplications(): Promise<StoreApplication[]> {
  const { data, error } = await supabaseAdmin()
    .from("store_applications")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`solicitudes: ${error.message}`);
  return (data ?? []).map(mapApplication);
}

/** Aprueba (crea/actualiza la tienda + verified) o rechaza una solicitud. */
export async function reviewApplication(id: number, action: "approved" | "rejected"): Promise<void> {
  const db = supabaseAdmin();

  if (action === "approved") {
    const { data: app, error } = await db.from("store_applications").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!app) throw new Error("Solicitud no encontrada");
    const slug = slugify(app.commercial_name as string);
    // Redes sociales de la solicitud → jsonb `socials` (solo las cargadas)
    const socials: Record<string, string> = {};
    for (const k of ["instagram", "facebook", "tiktok", "youtube", "linkedin", "mercadolibre"] as const) {
      if (app[k]) socials[k] = app[k] as string;
    }
    const { error: sErr } = await db.from("stores").upsert(
      {
        id: slug,
        name: app.commercial_name,
        slug,
        url: app.website,
        type: app.has_physical_store ? "Tienda" : "Tienda online",
        physical_store: Boolean(app.has_physical_store),
        city: (app.city as string) || "—",
        affiliate: null,
        verified: true,
        // Reputación + perfil copiados de la solicitud (spec 04 / migración 0006)
        google_rating: (app.google_rating as number) ?? null,
        google_reviews_count: (app.google_reviews_count as number) ?? null,
        google_maps_url: (app.google_maps_url as string) ?? null,
        rating_updated_at: app.google_rating ? new Date().toISOString() : null,
        payment_methods: (app.payment_methods as string) ?? null,
        ships_nationwide: Boolean(app.ships_nationwide),
        physical_address: (app.physical_address as string) ?? null,
        socials: Object.keys(socials).length ? socials : null,
      },
      { onConflict: "id" }
    );
    if (sErr) throw new Error(`crear tienda: ${sErr.message}`);
  }

  const { error: uErr } = await db
    .from("store_applications")
    .update({ status: action, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (uErr) throw new Error(uErr.message);
}

// --- Solicitudes corporativas (RFQ, spec 08 Fase A) -------------------------

export type BulkRequest = {
  id: string;
  status: "open" | "quoting" | "closed" | "cancelled";
  modelId: string | null;
  specsNote: string | null;
  quantity: number;
  neededBy: string | null;
  companyName: string;
  cuit: string | null;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  province: string | null;
  message: string | null;
  createdAt: string;
};

function mapBulkRequest(r: Record<string, unknown>): BulkRequest {
  return {
    id: r.id as string,
    status: (r.status as BulkRequest["status"]) ?? "open",
    modelId: (r.model_id as string) ?? null,
    specsNote: (r.specs_note as string) ?? null,
    quantity: (r.quantity as number) ?? 0,
    neededBy: (r.needed_by as string) ?? null,
    companyName: r.company_name as string,
    cuit: (r.cuit as string) ?? null,
    contactName: (r.contact_name as string) ?? null,
    contactEmail: r.contact_email as string,
    contactPhone: (r.contact_phone as string) ?? null,
    province: (r.province as string) ?? null,
    message: (r.message as string) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function getBulkRequests(): Promise<BulkRequest[]> {
  const { data, error } = await supabaseAdmin()
    .from("bulk_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`bulk_requests: ${error.message}`);
  return (data ?? []).map(mapBulkRequest);
}

export async function setBulkRequestStatus(
  id: string,
  status: BulkRequest["status"]
): Promise<void> {
  const { error } = await supabaseAdmin().from("bulk_requests").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Helpers puros (parseo / slug) ------------------------------------------

export const slugify = (s: string) =>
  String(s)
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

export function prefillFromListing(l: AdminListing): ModelPrefill {
  const t = l.titleRaw.toUpperCase();
  const ramGb = Number(t.match(/(\d{1,2})\s*GB(?:\s*(?:RAM|DDR))?/)?.[1]) || "";
  const storageGb =
    t.match(/(\d+)\s*TB/) ? Number(t.match(/(\d+)\s*TB/)![1]) * 1000 :
    Number(t.match(/(\d{3,4})\s*GB\s*(?:SSD|NVME)?/)?.[1]) || "";
  const screenSizeIn =
    Number(t.match(/(\d{2}[.,]?\d?)\s*(?:"|”|PULG)/)?.[1]?.replace(",", ".")) || "";
  const cpu =
    t.match(/(?:INTEL\s*)?CORE\s*(?:ULTRA\s*\d|I[3579])[- ]?\w*/)?.[0] ||
    t.match(/RYZEN\s*[3579]\s*\w*/)?.[0] ||
    t.match(/\bM[1-4](?:\s*(?:PRO|MAX))?\b/)?.[0] || "";
  const gpuMatch =
    l.titleRaw.match(/(?:NVIDIA\s*)?(?:GeForce\s*)?(?:RTX|GTX)\s*\d{3,4}(?:\s*\w+)?/i)?.[0] ||
    l.titleRaw.match(/Radeon\s*RX\s*\d{3,4}/i)?.[0] || "";
  return {
    brand: "",
    name: l.titleRaw.replace(/^notebook\s+/i, "").slice(0, 80),
    cpu: String(cpu).trim(),
    cpuFamily: cpuFamilyFrom(l.titleRaw),
    ramGb,
    storageGb,
    gpu: gpuMatch || "Integrada",
    gpuType: gpuMatch ? "dedicada" : "integrada",
    screenSizeIn,
    partNumber: "",
    imageUrl: l.image ?? "",
  };
}
