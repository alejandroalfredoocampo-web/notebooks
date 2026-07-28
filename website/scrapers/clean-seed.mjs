/**
 * Borra las publicaciones FICTICIAS del seed de demo (ids l-001..l-030) de
 * Supabase, para dejar solo datos reales.
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scrapers/clean-seed.mjs
 *
 * ⚠️ Corré esto SOLO cuando ya tengas ofertas reales confirmadas (matcheadas en
 * /admin). Si no, los modelos quedan sin ofertas y el sitio se ve vacío.
 *
 * NO toca los modelos (son reales y sirven de catálogo canónico) ni el
 * historial. Para un borrado total del historial ficticio, ver el flag abajo.
 */
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Poné WIPE_HISTORY=1 para borrar también el historial ficticio (los gráficos
// arrancan vacíos y se rellenan con las corridas reales del scraper).
const wipeHistory = process.env.WIPE_HISTORY === "1";

async function main() {
  // Contar antes
  const { count: before } = await sb
    .from("listings").select("*", { count: "exact", head: true }).like("id", "l-%");
  console.log(`Publicaciones semilla (l-*) a borrar: ${before ?? 0}`);

  const { error } = await sb.from("listings").delete().like("id", "l-%");
  if (error) throw new Error(`delete listings: ${error.message}`);
  console.log("✓ Publicaciones semilla borradas.");

  if (wipeHistory) {
    const { error: hErr } = await sb.from("price_history").delete().neq("model_id", "");
    if (hErr) throw new Error(`delete history: ${hErr.message}`);
    console.log("✓ Historial ficticio borrado (se reconstruye con el scraper).");
  } else {
    console.log("(Historial conservado. Para borrarlo también: WIPE_HISTORY=1)");
  }

  console.log("\n✅ Listo. El sitio ahora muestra solo ofertas reales confirmadas.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
