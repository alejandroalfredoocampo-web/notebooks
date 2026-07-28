/**
 * Carga el seed curado + overlays a Supabase.
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scrapers/seed-supabase.mjs
 *
 * Idempotente (upsert por id). Usa la service_role key (bypassea RLS).
 * Corré la migración 0001_init.sql antes.
 */
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const read = async (f, fb) => {
  try { return JSON.parse(await readFile(path.join(DATA, f), "utf8")); } catch { return fb; }
};

// Entero seguro para columnas int (redondea decimales, respeta null)
const intv = (x) => (x === null || x === undefined || x === "" ? null : Math.round(Number(x)));

async function upsert(table, rows) {
  if (!rows.length) return;
  const { error } = await db.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ✓ ${table}: ${rows.length} filas`);
}

async function main() {
  const [stores, seedModels, genModels, seedListings, genListings, history] = await Promise.all([
    read("stores.json", []),
    read("models.json", []),
    read("generated-models.json", []),
    read("listings.json", []),
    read("generated-listings.json", []),
    read("price-history.json", {}),
  ]);

  // Tiendas
  await upsert("stores", stores.map((s) => ({
    id: s.id, name: s.name, slug: s.slug, url: s.url, type: s.type,
    physical_store: s.physicalStore, city: s.city, affiliate: s.affiliate,
  })));

  // Modelos (seed + creados a mano)
  const models = [...seedModels, ...genModels];
  await upsert("models", models.map((m) => ({
    id: m.id, brand: m.brand, brand_slug: m.brandSlug, name: m.name, slug: m.slug,
    part_number: m.partNumber, cpu: m.cpu, cpu_family: m.cpuFamily,
    ram_gb: intv(m.ramGb), ram_type: m.ramType, storage_gb: intv(m.storageGb), storage_type: m.storageType,
    screen_size_in: m.screenSizeIn, screen_resolution: m.screenResolution,
    screen_panel: m.screenPanel, screen_refresh_hz: intv(m.screenRefreshHz),
    gpu: m.gpu, gpu_type: m.gpuType, os: m.os, weight_kg: m.weightKg, battery_wh: intv(m.batteryWh),
    release_year: intv(m.releaseYear), use_cases: m.useCases ?? [], image_url: m.imageUrl ?? null,
    source: m.source ?? "seed",
  })));

  // Publicaciones (el seed ya está matcheado → confirmed)
  const listings = [...seedListings, ...genListings];
  await upsert("listings", listings.map((l) => ({
    id: l.id, store_id: l.storeId, model_id: l.modelId ?? null, url: l.url,
    title_raw: l.titleRaw, price_list: intv(l.priceList), price_cash: intv(l.priceCash),
    installments: l.installments ?? null, in_stock: l.inStock, condition: l.condition,
    image: l.image ?? null, source: l.source ?? "scraper",
    match_status: l.modelId ? "confirmed" : "pending",
    last_seen_at: l.lastSeenAt ?? new Date().toISOString(),
  })));

  // Historial (objeto { modelId: [{date, bestPrice}] })
  const historyRows = [];
  for (const [modelId, series] of Object.entries(history)) {
    for (const p of series) {
      historyRows.push({ model_id: modelId, captured_on: p.date, best_price: intv(p.bestPrice) });
    }
  }
  if (historyRows.length) {
    const { error } = await db.from("price_history").upsert(historyRows, { onConflict: "model_id,captured_on" });
    if (error) throw new Error(`price_history: ${error.message}`);
    console.log(`  ✓ price_history: ${historyRows.length} filas`);
  }

  console.log("\n✅ Seed cargado a Supabase.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
