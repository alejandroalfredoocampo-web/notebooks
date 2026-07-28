/**
 * Revisión masiva de la cola de pendientes: agrupa las publicaciones por
 * "huella de specs", las matchea con modelos existentes o crea uno nuevo por
 * grupo, y confirma todas las ofertas del grupo. Puebla el sitio de una.
 *
 *   # ver el plan sin tocar nada (recomendado primero):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scrapers/bulk-review.mjs
 *
 *   # aplicar los cambios:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scrapers/bulk-review.mjs --apply
 *
 * Es conservador: sólo canonicaliza publicaciones con marca + CPU + RAM +
 * storage parseables (el resto queda pending para revisar a mano). Los nombres
 * de los modelos autogenerados salen del título scrapeado → conviene repasarlos
 * después en /admin. Idempotente: al re-correr, agrupa las nuevas contra los
 * modelos ya creados (no duplica).
 */
import { createClient } from "@supabase/supabase-js";
import { parseSpecsFromTitle } from "./lib.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
const APPLY = process.argv.includes("--apply");
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// --- helpers de parseo ------------------------------------------------------
const BRANDS = [
  ["lenovo", "Lenovo"], ["hp", "HP"], ["asus", "Asus"], ["dell", "Dell"],
  ["acer", "Acer"], ["apple", "Apple"], ["samsung", "Samsung"], ["msi", "MSI"],
  ["gigabyte", "Gigabyte"], ["huawei", "Huawei"], ["lg", "LG"], ["bangho", "Bangho"],
  ["noblex", "Noblex"], ["positivo", "Positivo bgh"], ["exo", "EXO"],
];
const ACCESSORY_RE = /funda|mochila|maletin|estuche|sleeve|cargador|fuente|adaptador|cooler|soporte|base\b|mouse|teclado|monitor|memoria ram\b|\bssd\b(?!.*notebook)|disco|pendrive|auricular|parlante/i;

const slugify = (s) =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function cpuFamily(t) {
  t = t.toLowerCase();
  if (/ultra\s*9/.test(t)) return "ultra9";
  if (/ultra\s*7/.test(t)) return "ultra7";
  if (/ultra\s*5/.test(t)) return "ultra5";
  if (/\bi9\b|core\s*i9/.test(t)) return "i9";
  if (/\bi7\b|core\s*i7/.test(t)) return "i7";
  if (/\bi5\b|core\s*i5|core\s*5\b/.test(t)) return "i5";
  if (/\bi3\b|core\s*i3|core\s*3\b/.test(t)) return "i3";
  if (/ryzen\s*9/.test(t)) return "ryzen9";
  if (/ryzen\s*7/.test(t)) return "ryzen7";
  if (/ryzen\s*5/.test(t)) return "ryzen5";
  if (/ryzen\s*3/.test(t)) return "ryzen3";
  if (/\bm[1-4]\b|apple\s*m/.test(t)) return "apple-m";
  if (/celeron|pentium|n\d{3,4}\b/.test(t)) return "intel-n";
  return null;
}
function gpuInfo(t) {
  const m = t.match(/(rtx|gtx)\s*(\d{3,4})\s*(?:ti)?\s*(\d{1,2}\s*gb)?/i);
  if (m) return { key: (m[1] + m[2]).toLowerCase(), label: `NVIDIA GeForce ${m[1].toUpperCase()} ${m[2]}`.trim(), dedicated: true };
  const r = t.match(/radeon\s*rx\s*(\d{3,4})/i);
  if (r) return { key: "rx" + r[1], label: `AMD Radeon RX ${r[1]}`, dedicated: true };
  return { key: "int", label: "Integrada", dedicated: false };
}
function detectBrand(text) {
  const t = text.toLowerCase();
  for (const [k, name] of BRANDS) if (new RegExp(`\\b${k}\\b`).test(t)) return { slug: k, name };
  return null;
}

// --- main -------------------------------------------------------------------
async function main() {
  const [{ data: pending, error: pErr }, { data: models, error: mErr }] = await Promise.all([
    sb.from("listings").select("*").eq("match_status", "pending"),
    sb.from("models").select("id,brand,brand_slug,cpu_family,ram_gb,storage_gb,gpu"),
  ]);
  if (pErr) throw new Error(`pending: ${pErr.message}`);
  if (mErr) throw new Error(`models: ${mErr.message}`);

  console.log(`Pendientes: ${pending.length} · Modelos existentes: ${models.length}\n`);

  // huella de un modelo/listing → clave de agrupación
  const keyOf = (brandSlug, fam, ram, sto, gpuKey) => `${brandSlug}|${fam}|${ram}|${sto}|${gpuKey}`;
  const existingByKey = new Map();
  for (const m of models) {
    const g = gpuInfo(m.gpu || "");
    existingByKey.set(keyOf(m.brand_slug, m.cpu_family, m.ram_gb, m.storage_gb, g.key), m);
  }

  const groups = new Map(); // key -> { rep, fp, listings[] }
  const skipped = { accessory: 0, unparseable: 0 };

  for (const l of pending) {
    const title = l.title_raw || "";
    if (ACCESSORY_RE.test(title)) { skipped.accessory++; continue; }
    const brand = detectBrand(title);
    const fam = cpuFamily(title);
    const specs = parseSpecsFromTitle(title);
    if (!brand || !fam || !specs.ramGb || !specs.storageGb) { skipped.unparseable++; continue; }
    const gpu = gpuInfo(title);
    const key = keyOf(brand.slug, fam, specs.ramGb, specs.storageGb, gpu.key);
    if (!groups.has(key)) groups.set(key, { key, rep: l, brand, fam, specs, gpu, listings: [] });
    groups.get(key).listings.push(l);
  }

  let toConfirmExisting = 0, toCreate = 0, listingsAffected = 0;
  const plan = [];
  for (const g of groups.values()) {
    const existing = existingByKey.get(g.key);
    if (existing) {
      plan.push({ type: "existing", modelId: existing.id, label: `${existing.brand} (existente)`, group: g });
      toConfirmExisting++;
    } else {
      const name = g.rep.title_raw.replace(/^notebook\s+/i, "").replace(/\s+/g, " ").trim().slice(0, 70);
      plan.push({ type: "create", label: name, group: g });
      toCreate++;
    }
    listingsAffected += g.listings.length;
  }

  console.log(`Plan:`);
  console.log(`  • ${toConfirmExisting} grupos → confirmar a un modelo EXISTENTE`);
  console.log(`  • ${toCreate} grupos → CREAR modelo nuevo`);
  console.log(`  • ${listingsAffected} publicaciones se confirmarían en total`);
  console.log(`  • omitidas: ${skipped.accessory} accesorios, ${skipped.unparseable} sin specs claras (quedan pending)\n`);
  console.log(`Modelos NUEVOS a crear:`);
  for (const p of plan.filter((x) => x.type === "create")) {
    console.log(`  + ${p.label}  (${p.group.listings.length} ofertas)`);
  }

  if (!APPLY) {
    console.log(`\n(DRY-RUN. Nada se escribió. Corré con --apply para aplicar.)`);
    return;
  }

  console.log(`\nAplicando…`);
  const usedIds = new Set(models.map((m) => m.id));
  let createdModels = 0, confirmed = 0;

  for (const p of plan) {
    let modelId = p.modelId;
    if (p.type === "create") {
      const g = p.group;
      const name = g.rep.title_raw.replace(/^notebook\s+/i, "").replace(/\s+/g, " ").trim().slice(0, 70);
      const brandSlug = g.brand.slug;
      let id = `${brandSlug}-${slugify(name)}`.slice(0, 80);
      let n = 2; while (usedIds.has(id)) id = `${brandSlug}-${slugify(name)}-${n++}`.slice(0, 90);
      usedIds.add(id);
      const { error } = await sb.from("models").insert({
        id, brand: g.brand.name, brand_slug: brandSlug, name, slug: slugify(name),
        cpu: (g.rep.title_raw.match(/(?:intel\s*)?core\s*(?:ultra\s*\d|i[3579])[- ]?\w*/i)?.[0]
              || g.rep.title_raw.match(/ryzen\s*[3579]\s*\w*/i)?.[0] || g.fam).trim(),
        cpu_family: g.fam, ram_gb: g.specs.ramGb, ram_type: "DDR4",
        storage_gb: g.specs.storageGb, storage_type: "SSD",
        screen_size_in: g.specs.screenSizeIn || 15.6, screen_resolution: "1920x1080 (FHD)",
        screen_panel: "IPS", screen_refresh_hz: 60,
        gpu: g.gpu.label, gpu_type: g.gpu.dedicated ? "dedicada" : "integrada",
        os: "Windows 11 Home", weight_kg: 0, battery_wh: 0,
        release_year: new Date().getFullYear(), use_cases: [],
        image_url: g.rep.image || null, source: "auto",
      });
      if (error) { console.error(`  ✗ crear ${name}: ${error.message}`); continue; }
      createdModels++;
      modelId = id;
    }
    const ids = p.group.listings.map((l) => l.id);
    const { error } = await sb.from("listings").update({ model_id: modelId, match_status: "confirmed" }).in("id", ids);
    if (error) { console.error(`  ✗ confirmar grupo ${modelId}: ${error.message}`); continue; }
    confirmed += ids.length;
  }

  console.log(`\n✅ Hecho: ${createdModels} modelos creados · ${confirmed} publicaciones confirmadas.`);
  console.log(`Repasá los modelos autogenerados en /admin (nombres/specs) cuando puedas.`);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
