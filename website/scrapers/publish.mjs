/**
 * Publica la salida del pipeline al sitio.
 *   node scrapers/publish.mjs
 *
 * El sitio público corre en edge (sin filesystem), así que no puede leer los
 * archivos del pipeline en runtime. Este paso "hornea" los matcheos confirmados
 * y las publicaciones propias en un overlay que el sitio importa estáticamente:
 *
 *   data/generated-listings.json  → ofertas extra por modelo (confirmadas + propias)
 *   data/generated-images.json    → imagen por modelo (fallback si el seed no tiene)
 *   data/generated-history.json   → historial real por modelo (si hay ≥2 puntos)
 *
 * Es idempotente: reescribe los overlays completos en cada corrida. No toca el
 * seed curado (data/listings.json, models.json, price-history.json).
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "data");
const p = (f) => path.join(DATA, f);
const rel = (f) => path.relative(process.cwd(), p(f));

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(p(file), "utf8"));
  } catch {
    return fallback;
  }
}

// Solo los campos que el sitio necesita de una oferta (tipo Listing)
function toListing(l, modelId) {
  return {
    id: l.id,
    storeId: l.storeId,
    modelId,
    url: l.url ?? "",
    titleRaw: l.titleRaw ?? "",
    priceList: l.priceList ?? l.priceCash,
    priceCash: l.priceCash,
    installments: l.installments ?? null,
    inStock: l.inStock !== false,
    condition: l.condition ?? "new",
    lastSeenAt: l.lastSeenAt ?? new Date().toISOString(),
  };
}

export async function publish() {
  const [seedModels, manualModels, stores, raw, matched, decisions, manual, snapshots, images] =
    await Promise.all([
      readJson("models.json", []),
      readJson("manual-models.json", []),
      readJson("stores.json", []),
      readJson("listings.raw.json", []),
      readJson("listings.matched.json", []),
      readJson("match-decisions.json", {}),
      readJson("manual-listings.json", []),
      readJson("price-history.snapshots.json", {}),
      readJson("model-images.json", {}),
    ]);

  // Modelos = seed + creados a mano (estos van al overlay generated-models.json)
  const seedIds = new Set(seedModels.map((m) => m.id));
  const modelIds = new Set([...seedIds, ...manualModels.map((m) => m.id)]);
  const storeIds = new Set(stores.map((s) => s.id));

  // 1) Resolver el modelId de cada publicación scrapeada
  const resolved = new Map(); // id -> { listing, modelId, rejected }
  for (const l of raw) resolved.set(l.id, { listing: l, modelId: null, rejected: false });
  for (const l of matched) {
    const r = resolved.get(l.id);
    if (r && l.modelId) r.modelId = l.modelId; // auto-match (confianza ≥ umbral)
    else if (!r && l.modelId) resolved.set(l.id, { listing: l, modelId: l.modelId, rejected: false });
  }
  for (const [id, d] of Object.entries(decisions)) {
    const r = resolved.get(id);
    if (!r) continue;
    if (d.action === "confirmed") { r.modelId = d.modelId; r.rejected = false; }
    else { r.rejected = true; } // rechazada → no se publica
  }

  // 2) Overlay de ofertas: confirmadas/auto-matcheadas + propias
  const skipped = { noModel: 0, unknownStore: 0 };
  const overlay = [];
  const seen = new Set();

  const push = (listing, modelId) => {
    if (!modelId || !modelIds.has(modelId)) { skipped.noModel++; return; }
    if (!storeIds.has(listing.storeId)) { skipped.unknownStore++; return; }
    if (seen.has(listing.id)) return;
    seen.add(listing.id);
    overlay.push(toListing(listing, modelId));
  };

  for (const r of resolved.values()) {
    if (r.rejected || !r.modelId) continue;
    push(r.listing, r.modelId);
  }
  for (const m of manual) push(m, m.modelId); // propias con modelo asignado

  // 3) Overlay de imágenes (solo modelos existentes)
  const imgOverlay = {};
  for (const [modelId, url] of Object.entries(images)) {
    if (modelIds.has(modelId) && url) imgOverlay[modelId] = url;
  }

  // 4) Overlay de historial real (solo si aporta ≥2 puntos)
  const histOverlay = {};
  for (const [modelId, series] of Object.entries(snapshots)) {
    if (modelIds.has(modelId) && Array.isArray(series) && series.length >= 2) {
      histOverlay[modelId] = series;
    }
  }

  // 5) Overlay de modelos creados a mano (solo los que no pisan el seed)
  const modelsOverlay = manualModels.filter((m) => m && m.id && !seedIds.has(m.id));

  await Promise.all([
    writeFile(p("generated-listings.json"), JSON.stringify(overlay, null, 2)),
    writeFile(p("generated-images.json"), JSON.stringify(imgOverlay, null, 2)),
    writeFile(p("generated-history.json"), JSON.stringify(histOverlay, null, 2)),
    writeFile(p("generated-models.json"), JSON.stringify(modelsOverlay, null, 2)),
  ]);

  const modelsCovered = new Set(overlay.map((l) => l.modelId)).size;
  const summary = {
    listings: overlay.length,
    modelsCovered,
    newModels: modelsOverlay.length,
    images: Object.keys(imgOverlay).length,
    history: Object.keys(histOverlay).length,
    skipped,
  };
  return summary;
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  publish().then((s) => {
    console.log(`✅ Publicado al sitio:`);
    console.log(`   ${s.listings} ofertas en ${s.modelsCovered} modelos → ${rel("generated-listings.json")}`);
    console.log(`   ${s.newModels} modelos nuevos → ${rel("generated-models.json")}`);
    console.log(`   ${s.images} imágenes → ${rel("generated-images.json")}`);
    console.log(`   ${s.history} historiales reales → ${rel("generated-history.json")}`);
    if (s.skipped.noModel || s.skipped.unknownStore) {
      console.log(`   (omitidas: ${s.skipped.noModel} sin modelo válido, ${s.skipped.unknownStore} con tienda desconocida)`);
    }
    console.log(`\nReconstruí el sitio para verlos: npm run build`);
  });
}
