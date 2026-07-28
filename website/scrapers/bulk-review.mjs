/**
 * Revisión masiva de la cola de pendientes: agrupa por (marca + línea + CPU +
 * RAM + storage + GPU), matchea con modelos existentes o crea uno por grupo, y
 * confirma todas las ofertas del grupo. Puebla el sitio de una.
 *
 *   node scrapers/bulk-review.mjs            # DRY-RUN: muestra el plan
 *   node scrapers/bulk-review.mjs --apply    # aplica la canonicalización
 *   node scrapers/bulk-review.mjs --reset            # DRY-RUN del reseteo
 *   node scrapers/bulk-review.mjs --reset --apply    # resetea (des-confirma
 *        las publicaciones scrapeadas y borra los modelos autocreados 'auto')
 *
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.
 * Conservador: sólo canonicaliza publicaciones con marca + CPU + RAM + storage
 * parseables (el resto queda pending). Idempotente.
 */
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
const APPLY = process.argv.includes("--apply");
const RESET = process.argv.includes("--reset");
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
const BRANDS = [
  ["lenovo", "Lenovo"], ["hp", "HP"], ["asus", "Asus"], ["dell", "Dell"],
  ["acer", "Acer"], ["apple", "Apple"], ["samsung", "Samsung"], ["msi", "MSI"],
  ["gigabyte", "Gigabyte"], ["huawei", "Huawei"], ["lg", "LG"], ["banghó", "Banghó"],
  ["bangho", "Banghó"], ["noblex", "Noblex"], ["exo", "EXO"],
];
const ACCESSORY_RE = /funda|mochila|maletin|estuche|sleeve|cargador|fuente|adaptador|cooler|soporte|base\b|mouse|teclado|monitor|memoria ram\b|pendrive|auricular|parlante|porta\s*notebook/i;

const strip = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slugify = (s) => strip(s).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function detectBrand(text) {
  const t = strip(text);
  for (const [k, name] of BRANDS) if (new RegExp(`\\b${k}\\b`).test(t)) return { slug: slugify(name), name };
  return null;
}

function cpuFamily(t) {
  t = strip(t);
  if (/ultra\s*9/.test(t)) return "ultra9";
  if (/ultra\s*7/.test(t)) return "ultra7";
  if (/ultra\s*5/.test(t)) return "ultra5";
  if (/\bi9\b|core\s*i9|core\s*9\b/.test(t)) return "i9";
  if (/\bi7\b|core\s*i7|core\s*7\b/.test(t)) return "i7";
  if (/\bi5\b|core\s*i5|core\s*5\b/.test(t)) return "i5";
  if (/\bi3\b|core\s*i3|core\s*3\b/.test(t)) return "i3";
  if (/ryzen\s*9/.test(t)) return "ryzen9";
  if (/ryzen\s*7/.test(t)) return "ryzen7";
  if (/ryzen\s*5/.test(t)) return "ryzen5";
  if (/ryzen\s*3/.test(t)) return "ryzen3";
  if (/\bm[1-4]\b|apple\s*m/.test(t)) return "apple-m";
  if (/celeron|pentium|\bn\d{3,4}\b/.test(t)) return "intel-n";
  return null;
}
const CPU_LABEL = {
  ultra9: "Core Ultra 9", ultra7: "Core Ultra 7", ultra5: "Core Ultra 5",
  i9: "Core i9", i7: "Core i7", i5: "Core i5", i3: "Core i3",
  ryzen9: "Ryzen 9", ryzen7: "Ryzen 7", ryzen5: "Ryzen 5", ryzen3: "Ryzen 3",
  "apple-m": "Apple M", "intel-n": "Intel",
};

function gpuInfo(t) {
  const m = strip(t).match(/(rtx|gtx)\s*(\d{3,4})/);
  if (m) return { key: m[1] + m[2], label: `NVIDIA GeForce ${m[1].toUpperCase()} ${m[2]}`, dedicated: true };
  const r = strip(t).match(/radeon\s*rx\s*(\d{3,4})/);
  if (r) return { key: "rx" + r[1], label: `AMD Radeon RX ${r[1]}`, dedicated: true };
  return { key: "int", label: "Integrada", dedicated: false };
}

// RAM/almacenamiento robusto: maneja "8-512", "8/512", "16+512", "/1T", "16GB RAM 512GB SSD"
function parseRamStorage(raw) {
  const t = strip(raw);
  let ram = null, storage = null;
  const tb = t.match(/(\d+(?:[.,]\d+)?)\s*tb?\b/);
  if (tb && /t/.test(tb[0])) storage = Math.round(parseFloat(tb[1].replace(",", ".")) * 1000);
  const ramExpl = t.match(/(\d{1,2})\s*gb\s*(?:ram|ddr\d?|de\s*ram)/);
  if (ramExpl) ram = +ramExpl[1];
  const stoExpl = t.match(/(\d{3,4})\s*gb\s*(?:ssd|nvme|hdd|de\s*alm)/);
  if (stoExpl && !storage) storage = +stoExpl[1];
  const combo = t.match(/\b(\d{1,2})\s*(?:gb)?\s*[-/+]\s*(\d{3,4})\s*(?:gb)?\b/);
  if (combo) { if (ram == null) ram = +combo[1]; if (storage == null) storage = +combo[2]; }
  const comboTb = t.match(/\b(\d{1,2})\s*(?:gb)?\s*[-/+]\s*(\d(?:[.,]\d)?)\s*t/);
  if (comboTb) { if (ram == null) ram = +comboTb[1]; if (storage == null) storage = Math.round(parseFloat(comboTb[2].replace(",", ".")) * 1000); }
  if (ram == null || storage == null) {
    for (const m of t.matchAll(/(\d{1,4})\s*gb/g)) {
      const n = +m[1];
      if (ram == null && [4, 8, 12, 16, 24, 32, 64].includes(n)) ram = n;
      else if (storage == null && n >= 120) storage = n;
    }
  }
  return { ram, storage };
}

// Token de línea del modelo: consistente entre tiendas, discrimina Book3≠Book4,
// Aspire 5 ≠ Aspire Go, IdeaPad Slim 3 ≠ IdeaPad 1, etc.
const LINE_RE = /\b(ideapad\s*slim\s*\d+|ideapad\s*\d*|thinkpad\s*\w*|legion\s*\d*|loq|yoga\s*\d*|v\d{2}|vivobook\s*(?:go\s*)?\d*|zenbook\s*\d*|expertbook|tuf\s*(?:gaming\s*)?a?\d*|rog\s*\w*|omen\s*\d*|victus\s*\d*|pavilion\s*\d*|probook\s*\w*|elitebook\s*\w*|aspire\s*(?:\d+|go|lite)|nitro\s*\d*|predator\s*\w*|swift\s*\d*|extensa\s*\w*|inspiron\s*\d*|latitude\s*\w*|xps\s*\d*|vostro\s*\d*|g1[0-9]\b|galaxy\s*book\s*\d*|macbook\s*(?:air|pro)?|modern\s*\w*|katana\s*\w*|cyborg\s*\w*|thin\s*\w*)\b/;
function lineToken(title) {
  const m = strip(title).match(LINE_RE);
  return m ? m[0].replace(/\s+/g, "") : "";
}
function prettyLine(title) {
  const m = title.match(new RegExp(LINE_RE.source, "i"));
  return m ? titleCase(m[0].replace(/\s+/g, " ").trim()) : "";
}
const storageLabel = (gb) => (gb >= 1000 ? `${Math.round(gb / 1000)}TB` : `${gb}GB`);

// ---------------------------------------------------------------------------
async function doReset() {
  const [{ count: scraped }, { data: autoModels }] = await Promise.all([
    sb.from("listings").select("*", { count: "exact", head: true })
      .not("id", "like", "l-%").not("id", "like", "manual-%"),
    sb.from("models").select("id").eq("source", "auto"),
  ]);
  console.log(`Reseteo:`);
  console.log(`  • ${scraped ?? 0} publicaciones scrapeadas → volver a 'pending' (model_id null)`);
  console.log(`  • ${(autoModels ?? []).length} modelos autocreados ('auto') → borrar`);
  if (!APPLY) { console.log(`\n(DRY-RUN. Corré con --reset --apply para aplicar.)`); return; }

  const up = await sb.from("listings").update({ match_status: "pending", model_id: null })
    .not("id", "like", "l-%").not("id", "like", "manual-%");
  if (up.error) throw new Error(`reset listings: ${up.error.message}`);
  const del = await sb.from("models").delete().eq("source", "auto");
  if (del.error) throw new Error(`delete auto models: ${del.error.message}`);
  console.log(`\n✅ Reseteado. Ahora corré: node scrapers/bulk-review.mjs (dry) y luego --apply`);
}

async function doReview() {
  const [{ data: pending, error: pErr }, { data: models, error: mErr }] = await Promise.all([
    sb.from("listings").select("*").eq("match_status", "pending"),
    sb.from("models").select("id,brand,brand_slug,name,cpu_family,ram_gb,storage_gb,gpu"),
  ]);
  if (pErr) throw new Error(`pending: ${pErr.message}`);
  if (mErr) throw new Error(`models: ${mErr.message}`);
  console.log(`Pendientes: ${pending.length} · Modelos existentes: ${models.length}\n`);

  const keyOf = (b, line, fam, ram, sto, gpu) => `${b}|${line}|${fam}|${ram}|${sto}|${gpu}`;
  const existingByKey = new Map();
  for (const m of models) {
    const g = gpuInfo(m.gpu || "");
    existingByKey.set(keyOf(m.brand_slug, lineToken(m.name), m.cpu_family, m.ram_gb, m.storage_gb, g.key), m);
  }

  const groups = new Map();
  const skipped = { accessory: 0, unparseable: 0 };
  for (const l of pending) {
    const title = l.title_raw || "";
    if (ACCESSORY_RE.test(title)) { skipped.accessory++; continue; }
    const brand = detectBrand(title);
    const fam = cpuFamily(title);
    const { ram, storage } = parseRamStorage(title);
    if (!brand || !fam || !ram || !storage) { skipped.unparseable++; continue; }
    const gpu = gpuInfo(title);
    const line = lineToken(title);
    const key = keyOf(brand.slug, line, fam, ram, storage, gpu.key);
    if (!groups.has(key)) groups.set(key, { key, rep: l, brand, fam, ram, storage, gpu, line, listings: [] });
    groups.get(key).listings.push(l);
  }

  const modelName = (g) => {
    const pl = prettyLine(g.rep.title_raw);
    if (pl) return `${pl} ${CPU_LABEL[g.fam] || ""} ${g.ram}GB ${storageLabel(g.storage)}`.replace(/\s+/g, " ").trim();
    return g.rep.title_raw.replace(/^notebook\s+/i, "").replace(/\s+/g, " ").trim().slice(0, 70);
  };

  let existing = 0, create = 0, affected = 0;
  const plan = [];
  for (const g of groups.values()) {
    const ex = existingByKey.get(g.key);
    if (ex) { plan.push({ type: "existing", modelId: ex.id, label: `${ex.brand} ${ex.name}`, g }); existing++; }
    else { plan.push({ type: "create", label: `${g.brand.name} ${modelName(g)}`, g }); create++; }
    affected += g.listings.length;
  }

  console.log(`Plan:`);
  console.log(`  • ${existing} grupos → confirmar a modelo EXISTENTE`);
  console.log(`  • ${create} grupos → CREAR modelo nuevo`);
  console.log(`  • ${affected} publicaciones se confirmarían`);
  console.log(`  • omitidas: ${skipped.accessory} accesorios, ${skipped.unparseable} sin specs claras\n`);
  console.log(`Modelos NUEVOS a crear:`);
  for (const p of plan.filter((x) => x.type === "create").sort((a, b) => b.g.listings.length - a.g.listings.length))
    console.log(`  + ${p.label}  (${p.g.listings.length} ofertas)`);
  console.log(`\nConfirmaciones a modelos existentes:`);
  for (const p of plan.filter((x) => x.type === "existing"))
    console.log(`  ~ ${p.label}  (+${p.g.listings.length})`);

  if (!APPLY) { console.log(`\n(DRY-RUN. Nada se escribió. Corré con --apply para aplicar.)`); return; }

  console.log(`\nAplicando…`);
  const usedIds = new Set(models.map((m) => m.id));
  let created = 0, confirmed = 0;
  for (const p of plan) {
    let modelId = p.modelId;
    if (p.type === "create") {
      const g = p.g;
      const name = modelName(g);
      let id = `${g.brand.slug}-${slugify(name)}`.slice(0, 85);
      let n = 2; while (usedIds.has(id)) id = `${g.brand.slug}-${slugify(name)}-${n++}`.slice(0, 90);
      usedIds.add(id);
      const cpuRaw = g.rep.title_raw.match(/(?:intel\s*)?core\s*(?:ultra\s*\d|i?[3579])[- ]?\w*/i)?.[0]
        || g.rep.title_raw.match(/ryzen\s*[3579]\s*\w*/i)?.[0] || CPU_LABEL[g.fam] || g.fam;
      const { error } = await sb.from("models").insert({
        id, brand: g.brand.name, brand_slug: g.brand.slug, name, slug: slugify(name),
        cpu: String(cpuRaw).trim(), cpu_family: g.fam, ram_gb: g.ram, ram_type: "DDR4",
        storage_gb: g.storage, storage_type: "SSD", screen_size_in: 15.6,
        screen_resolution: "1920x1080 (FHD)", screen_panel: "IPS", screen_refresh_hz: 60,
        gpu: g.gpu.label, gpu_type: g.gpu.dedicated ? "dedicada" : "integrada",
        os: "Windows 11 Home", weight_kg: 0, battery_wh: 0,
        release_year: new Date().getFullYear(), use_cases: [], image_url: g.rep.image || null, source: "auto",
      });
      if (error) { console.error(`  ✗ ${name}: ${error.message}`); continue; }
      created++; modelId = id;
    }
    const ids = p.g.listings.map((l) => l.id);
    const { error } = await sb.from("listings").update({ model_id: modelId, match_status: "confirmed" }).in("id", ids);
    if (error) { console.error(`  ✗ confirmar ${modelId}: ${error.message}`); continue; }
    confirmed += ids.length;
  }
  console.log(`\n✅ ${created} modelos creados · ${confirmed} publicaciones confirmadas.`);
}

(RESET ? doReset() : doReview()).catch((e) => { console.error("❌", e.message); process.exit(1); });
