/**
 * Runner del pipeline de ingesta.
 *   node scrapers/run.mjs             → todas las fuentes de sources.mjs
 *   node scrapers/run.mjs <storeId>   → una sola
 *
 * Etapas:
 *   1. Scrape   → data/listings.raw.json      (tolerante a fallos por tienda)
 *   2. Matching → data/listings.matched.json + data/review-queue.json
 *   3. Snapshot → data/price-history.snapshots.json  (solo si cambió el precio)
 *   4. Imágenes → data/model-images.json      (una imagen canónica por modelo)
 *
 * NO pisa los data/*.json curados del seed de demo: escribe archivos aparte
 * para poder inspeccionar antes de conectar la salida al sitio (fase DB).
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { SOURCES } from "./sources.mjs";
import { matchListings, CONFIDENCE_THRESHOLD } from "./matching.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "data");
const p = (f) => path.join(DATA, f);
const rel = (f) => path.relative(process.cwd(), f);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  const only = process.argv[2];
  const toRun = only ? SOURCES.filter((s) => s.storeId === only) : SOURCES;
  if (!toRun.length) {
    console.error(
      `No hay fuente para "${only}". Disponibles: ${SOURCES.map((s) => s.storeId).join(", ")}`
    );
    process.exit(1);
  }

  // --- 1. Scrape (conservando datos buenos de tiendas que fallan) ----------
  const existing = await readJson(p("listings.raw.json"), []);
  const results = new Map();
  for (const l of existing) {
    if (!results.has(l.storeId)) results.set(l.storeId, []);
    results.get(l.storeId).push(l);
  }

  for (const scraper of toRun) {
    const t0 = Date.now();
    try {
      const listings = await scraper.fetchListings();
      results.set(scraper.storeId, listings);
      console.log(`✅ ${scraper.storeId}: ${listings.length} publicaciones (${Date.now() - t0} ms)`);
    } catch (e) {
      console.error(`❌ ${scraper.storeId}: ${e.message} — se conservan los datos anteriores`);
    }
  }

  const raw = [...results.values()].flat();
  await writeFile(p("listings.raw.json"), JSON.stringify(raw, null, 2));
  console.log(`\n${raw.length} publicaciones → ${rel(p("listings.raw.json"))}`);

  // --- 2. Matching ---------------------------------------------------------
  const models = await readJson(p("models.json"), []);
  const { matched, review } = matchListings(raw, models);
  await writeFile(p("listings.matched.json"), JSON.stringify(matched, null, 2));
  await writeFile(p("review-queue.json"), JSON.stringify(review, null, 2));
  console.log(
    `Matching: ${matched.length} asignadas · ${review.length} a revisión → ` +
      `${rel(p("listings.matched.json"))}`
  );

  // --- 3. Snapshot de historial (append-only, solo si cambió) --------------
  const history = await readJson(p("price-history.snapshots.json"), {});
  const today = new Date().toISOString().slice(0, 10);
  const bestByModel = new Map();
  for (const l of matched) {
    if (!l.modelId || l.inStock === false) continue;
    const cur = bestByModel.get(l.modelId);
    if (cur == null || l.priceCash < cur) bestByModel.set(l.modelId, l.priceCash);
  }
  let snapped = 0;
  for (const [modelId, bestPrice] of bestByModel) {
    const series = history[modelId] ?? (history[modelId] = []);
    const last = series[series.length - 1];
    if (!last || last.bestPrice !== bestPrice) {
      // Si ya hay un punto de hoy, actualizarlo; si no, agregar
      if (last && last.date === today) last.bestPrice = bestPrice;
      else series.push({ date: today, bestPrice });
      snapped++;
    }
  }
  await writeFile(p("price-history.snapshots.json"), JSON.stringify(history, null, 2));
  console.log(`Snapshot: ${snapped} modelos con cambio de precio → ${rel(p("price-history.snapshots.json"))}`);

  // --- 4. Feed de imágenes (una imagen canónica por modelo) ----------------
  const images = await readJson(p("model-images.json"), {});
  let imgCount = 0;
  for (const l of matched) {
    if (l.modelId && l.image && !images[l.modelId]) {
      images[l.modelId] = l.image;
      imgCount++;
    }
  }
  await writeFile(p("model-images.json"), JSON.stringify(images, null, 2));
  console.log(`Imágenes: ${imgCount} modelos con imagen nueva → ${rel(p("model-images.json"))}`);

  if (review.length) {
    console.log(
      `\n⚠️  ${review.length} publicaciones sin matchear (confianza < ${CONFIDENCE_THRESHOLD}). ` +
        `Revisá ${rel(p("review-queue.json"))}.`
    );
  }
}

main();
