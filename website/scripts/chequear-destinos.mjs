#!/usr/bin/env node
/**
 * ¿Alguna publicación del catálogo apunta fuera del dominio de su tienda?
 *
 *   npm run chequear:destinos            # sólo lee; sale 1 si encuentra alguna
 *   npm run chequear:destinos -- --todas # además lista los dominios vistos por tienda
 *
 * Importa la regla del sitio desde un `.ts`, así que necesita `--experimental-strip-types`
 * (ya está en el script de npm).
 *
 * **Sólo lectura.** No escribe ni borra nada.
 *
 * ## Por qué existe
 *
 * `/salir/[listingId]` ahora frena el destino que no es del dominio de su tienda (ver
 * `src/lib/destinoSaliente.ts`), y frenar significa mandar a la persona al catálogo en vez de
 * a la tienda: un click que no se factura. Si en la base hubiera publicaciones legítimas con
 * un dominio distinto —una tienda que migró, una que publica en un `.com` y tiene el perfil en
 * `.com.ar`— ese cambio corta tráfico real el día que se despliega.
 *
 * Eso **no se deduce leyendo el scraper, se mide contra la tabla**. Este script es la medición,
 * y hay que correrlo con la base arriba antes de desplegar la rama. Si sale limpio, el freno no
 * le cuesta un click a nadie. Si no, cada fila que devuelve es una decisión: o la tienda tiene
 * un dominio más y va a la lista, o esa publicación estaba mal y el freno la agarró.
 *
 * La regla de comparación es exactamente la del sitio: se importa la misma función, no se
 * reescribe. Un chequeo que reimplementa lo que vigila termina aprobando lo que el sitio
 * rechaza.
 */
import { createClient } from "@supabase/supabase-js";
import { todasLasFilas } from "../scrapers/lib.mjs";
import { destinoSaliente, dominioRegistrable } from "../src/lib/destinoSaliente.ts";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Faltan SUPABASE_URL y una key (service_role o anon) en el entorno.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const { data: stores, error: eStores } = await sb.from("stores").select("id,name,url");
if (eStores) {
  console.error("No se pudo leer stores:", eStores.message);
  process.exit(1);
}

const { data: listings, error: eListings } = await todasLasFilas((desde, hasta) =>
  sb.from("listings").select("id,store_id,url", { count: "exact" }).order("id").range(desde, hasta),
);
if (eListings) {
  console.error("No se pudo leer listings:", eListings.message);
  process.exit(1);
}

const porId = new Map(stores.map((s) => [s.id, s]));
const malos = [];
const dominiosPorTienda = new Map();

for (const l of listings) {
  const tienda = porId.get(l.store_id);
  const r = destinoSaliente(l.url, tienda?.url);
  if (!r.ok) malos.push({ ...l, tienda: tienda?.name ?? l.store_id, motivo: r.motivo });
  try {
    const d = dominioRegistrable(new URL(l.url).hostname);
    const set = dominiosPorTienda.get(l.store_id) ?? new Set();
    set.add(d);
    dominiosPorTienda.set(l.store_id, set);
  } catch {
    /* la URL rota ya quedó en `malos` con motivo "esquema" */
  }
}

console.log(`${listings.length} publicaciones de ${stores.length} tiendas.\n`);

if (process.argv.includes("--todas")) {
  for (const s of stores) {
    const vistos = [...(dominiosPorTienda.get(s.id) ?? [])];
    const propio = s.url ? dominioRegistrable(new URL(s.url).hostname) : "(sin url)";
    console.log(`  ${s.name}: perfil ${propio} · publicaciones ${vistos.join(", ") || "(ninguna)"}`);
  }
  console.log();
}

if (!malos.length) {
  console.log("✓ Ninguna publicación apunta fuera del dominio de su tienda.");
  console.log("  El freno de /salir no le cuesta un click a nadie: se puede desplegar.");
  process.exit(0);
}

console.log(`✗ ${malos.length} publicación(es) que /salir va a frenar:\n`);
for (const m of malos.slice(0, 50)) {
  console.log(`  [${m.motivo}] ${m.tienda} · ${m.id}`);
  console.log(`      ${m.url}`);
}
if (malos.length > 50) console.log(`  … y ${malos.length - 50} más.`);
console.log(
  "\nCada una es una decisión: o la tienda tiene otro dominio legítimo (y va a SUFIJOS/lista)\n" +
    "o la publicación está mal y el freno hizo su trabajo. No desplegar sin resolverlas.",
);
process.exit(1);
