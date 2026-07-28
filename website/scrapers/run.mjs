/**
 * Runner del pipeline de ingesta → Supabase.
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scrapers/run.mjs [storeId]
 *
 * Etapas:
 *   1. Scrape        (tolerante a fallos por tienda)
 *   2. Matching      contra el catálogo de modelos de la DB
 *   3. Upsert listings en Supabase:
 *        - nuevas: match_status = confirmed (auto-match) | pending (a revisión)
 *        - ya vistas: solo actualiza precio/stock/last_seen (PRESERVA las
 *          decisiones del operador — no pisa confirmed/rejected)
 *   4. Snapshot price_history: mejor precio por modelo (de las confirmadas), 1/día
 *
 * Escribe también data/listings.raw.json para inspección/debug.
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { SOURCES } from "./sources.mjs";
import { matchListings, CONFIDENCE_THRESHOLD } from "./matching.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "..", "data", "listings.raw.json");
const intv = (x) => (x == null || x === "" ? null : Math.round(Number(x)));
const today = new Date().toISOString().slice(0, 10);

async function main() {
  const only = process.argv[2];
  const toRun = only ? SOURCES.filter((s) => s.storeId === only) : SOURCES;
  if (!toRun.length) {
    console.error(`No hay fuente para "${only}". Disponibles: ${SOURCES.map((s) => s.storeId).join(", ")}`);
    process.exit(1);
  }

  // --- 1. Scrape ------------------------------------------------------------
  const results = new Map();
  for (const scraper of toRun) {
    const t0 = Date.now();
    try {
      const listings = await scraper.fetchListings();
      results.set(scraper.storeId, listings);
      console.log(`✅ ${scraper.storeId}: ${listings.length} publicaciones (${Date.now() - t0} ms)`);
    } catch (e) {
      console.error(`❌ ${scraper.storeId}: ${e.message} — se conservan los datos anteriores en la DB`);
    }
  }
  const raw = [...results.values()].flat();
  await writeFile(RAW, JSON.stringify(raw, null, 2));
  console.log(`\n${raw.length} publicaciones scrapeadas`);
  if (!raw.length) return;

  // --- 2. Matching contra los modelos de la DB -----------------------------
  const { data: modelRows, error: mErr } = await sb
    .from("models")
    .select("id,brand,name,part_number,cpu_family,ram_gb,storage_gb,gpu_type,gpu");
  if (mErr) throw new Error(`models: ${mErr.message}`);
  const models = (modelRows ?? []).map((r) => ({
    id: r.id, brand: r.brand, name: r.name, partNumber: r.part_number,
    cpuFamily: r.cpu_family, ramGb: r.ram_gb, storageGb: r.storage_gb,
    gpuType: r.gpu_type, gpu: r.gpu,
  }));
  const { matched, review } = matchListings(raw, models);
  console.log(`Matching: ${matched.length} auto-asignadas · ${review.length} a revisión`);

  const matchOf = new Map();
  for (const l of matched)
    matchOf.set(l.id, { model_id: l.modelId, match_status: "confirmed", match_confidence: l.matchConfidence ?? 1, match_candidate: null });
  for (const l of review)
    matchOf.set(l.id, { model_id: null, match_status: "pending", match_confidence: l.matchConfidence ?? 0, match_candidate: l.matchCandidate ?? null });

  const base = (l) => ({
    id: l.id, store_id: l.storeId, url: l.url, title_raw: l.titleRaw,
    price_list: intv(l.priceList) ?? intv(l.priceCash), price_cash: intv(l.priceCash),
    installments: l.installments ?? null, in_stock: l.inStock !== false,
    condition: l.condition ?? "new", image: l.image ?? null, source: "scraper",
    last_seen_at: l.lastSeenAt ?? new Date().toISOString(),
  });

  // --- 3. Upsert (preservando decisiones del operador) ---------------------
  const storeIds = [...new Set(raw.map((l) => l.storeId))];
  const { data: existRows, error: eErr } = await sb.from("listings").select("id").in("store_id", storeIds);
  if (eErr) throw new Error(`listings existentes: ${eErr.message}`);
  const existingIds = new Set((existRows ?? []).map((r) => r.id));

  const newRows = raw.filter((l) => !existingIds.has(l.id)).map((l) => ({ ...base(l), ...matchOf.get(l.id) }));
  const seenRows = raw.filter((l) => existingIds.has(l.id)).map(base); // sin campos de match → preservados

  if (newRows.length) {
    const { error } = await sb.from("listings").insert(newRows);
    if (error) throw new Error(`insert nuevas: ${error.message}`);
  }
  if (seenRows.length) {
    const { error } = await sb.from("listings").upsert(seenRows, { onConflict: "id" });
    if (error) throw new Error(`update vistas: ${error.message}`);
  }
  console.log(`Upsert: ${newRows.length} nuevas · ${seenRows.length} actualizadas (precio/stock)`);

  // --- 4. Snapshot de historial (mejor precio por modelo, 1 punto/día) -----
  const { data: confirmed, error: cErr } = await sb
    .from("listings").select("model_id,price_cash,in_stock").eq("match_status", "confirmed");
  if (cErr) throw new Error(`confirmadas: ${cErr.message}`);
  const bestByModel = new Map();
  for (const l of confirmed ?? []) {
    if (!l.model_id || l.in_stock === false) continue;
    const c = bestByModel.get(l.model_id);
    if (c == null || l.price_cash < c) bestByModel.set(l.model_id, l.price_cash);
  }
  const histRows = [...bestByModel].map(([model_id, best_price]) => ({ model_id, captured_on: today, best_price }));
  if (histRows.length) {
    const { error } = await sb.from("price_history").upsert(histRows, { onConflict: "model_id,captured_on" });
    if (error) throw new Error(`price_history: ${error.message}`);
  }
  console.log(`Snapshot: ${histRows.length} modelos con precio de hoy`);

  if (review.length) {
    console.log(`\n⚠️  ${review.length} publicaciones quedaron pendientes (confianza < ${CONFIDENCE_THRESHOLD}). Revisalas en /admin/revision.`);
  }
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
