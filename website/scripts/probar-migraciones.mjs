#!/usr/bin/env node
/**
 * Prueba las migraciones de Supabase contra un PostgreSQL de verdad.
 *
 *   npm run probar:migraciones
 *
 * ## Por qué esto existe
 *
 * Las migraciones eran lo único del proyecto que no se probaba nunca. Se escribían, se
 * pegaban en el SQL Editor de Supabase y se veía qué pasaba — con la particularidad de que
 * las de permisos **fallan calladas y en la dirección peligrosa**: una policy mal escrita no
 * tira error, devuelve filas de más.
 *
 * El caso concreto que motivó esto es la `0015`. La vista `store_click_outs` lleva
 * `with (security_invoker = on)`, y sin esa opción una vista de Postgres corre con los
 * permisos de quien la creó y **saltea la RLS**: cada tienda vería los click-outs de todas.
 * La vista se crea igual, la consulta anda igual, el panel muestra números plausibles. No hay
 * ningún síntoma. Es exactamente el tipo de cosa que sólo se descubre midiendo.
 *
 * ## Cómo, sin instalar un Postgres en la máquina
 *
 * PGlite es PostgreSQL compilado a WebAssembly: corre dentro de Node, sin servicio, sin
 * Docker y sin sudo. Es Postgres de verdad —el mismo planner, las mismas policies, los mismos
 * grants por columna—, no un simulador.
 *
 * ## Qué NO prueba
 *
 * No es Supabase. Los roles `anon`, `authenticated` y `service_role`, el esquema `auth` y
 * `auth.uid()` los fabrica este script para parecerse a lo que hay allá. O sea que verifica
 * **la lógica del SQL**, no la configuración de la instancia: si en Supabase alguien le dio a
 * `authenticated` un grant extra a mano, acá no se ve.
 *
 * Tampoco corre las migraciones anteriores a la `0012`: se arma a mano el pedazo de `0001`
 * que importa (la tabla `click_outs` y sus grants por defecto) y desde ahí se aplican los
 * archivos reales del repo.
 */

import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const MIGRACIONES = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");
const leer = (f) => readFileSync(join(MIGRACIONES, f), "utf8");

let pasaron = 0;
let fallaron = 0;
const errores = [];

function seccion(t) {
  console.log(`\n\x1b[1m${t}\x1b[0m`);
}

async function prueba(nombre, fn) {
  try {
    const r = await fn();
    pasaron++;
    console.log(`  \x1b[32m✓\x1b[0m ${nombre}${typeof r === "string" ? ` — ${r}` : ""}`);
  } catch (e) {
    fallaron++;
    const msg = e instanceof Error ? e.message.split("\n")[0] : String(e);
    errores.push(`${nombre}: ${msg}`);
    console.log(`  \x1b[31m✗\x1b[0m ${nombre}\n      \x1b[31m${msg}\x1b[0m`);
  }
}

const UID_A = "11111111-1111-1111-1111-111111111111";
const UID_B = "22222222-2222-2222-2222-222222222222";

const db = await PGlite.create();

/* ===========================================================================
 * El andamio: lo que en Supabase ya existe y acá hay que fabricar
 * ======================================================================== */

await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
`);

/* El pedazo de 0001 del que dependen las migraciones que sí se prueban, con los grants que
 * Supabase le da por defecto a cada tabla nueva. */
await db.exec(`
  create table click_outs (
    id bigint generated always as identity primary key,
    listing_id text, store_id text, model_id text,
    price_at_click int, referrer text, user_agent text,
    created_at timestamptz default now()
  );
  create table store_members (user_id uuid, store_id text);
  alter table click_outs enable row level security;
  create policy "public insert clicks" on click_outs for insert with check (true);
  grant select, insert on click_outs to anon, authenticated;
  grant all on click_outs to service_role;
  grant select on store_members to authenticated;
`);

/* ===========================================================================
 * Las migraciones reales del repo, en el orden en que van al SQL Editor
 * ======================================================================== */

seccion("Se aplican las migraciones");
for (const f of [
  "0014_clickout_atribucion.sql",
  "0012_store_clicks_read.sql",
  "0015_store_click_outs_vista.sql",
]) {
  await prueba(`aplica ${f}`, async () => {
    await db.exec(leer(f));
  });
}

await db.exec(`
  insert into store_members values ('${UID_A}','tienda-a'), ('${UID_B}','tienda-b');
  insert into click_outs (store_id, model_id, visitor_id, user_agent, referrer, utm_source, bot, device)
  values ('tienda-a','m1','vid-1','Mozilla/5.0','https://google.com','google',false,'mobile'),
         ('tienda-a','m2','vid-2','Mozilla/5.0',null,'meta',true,'desktop'),
         ('tienda-b','m3','vid-3','Mozilla/5.0',null,'google',false,'mobile');
`);

/** Corre una consulta como si fuera el navegador de un miembro de esa tienda. */
async function comoTienda(uid, sql) {
  await db.exec(`set role authenticated; set test.uid = '${uid}';`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role;");
  }
}

/** Igual, pero la prueba es que **falle**. Un `select` que devuelve filas acá es la falla. */
async function debeSerNegado(uid, sql, que) {
  try {
    await comoTienda(uid, sql);
  } catch (e) {
    return e.message.split("\n")[0];
  }
  throw new Error(`devolvió filas: ${que} quedó legible`);
}

async function comoRol(rol, sql) {
  await db.exec(`set role ${rol};`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role;");
  }
}

/* ===========================================================================
 * 0015 — la tienda ve el conteo de sus clicks, no la fila cruda
 * ======================================================================== */

seccion("0015 · lo que la tienda SÍ ve");

await prueba("ve sus clicks por la vista", async () => {
  const { rows } = await comoTienda(UID_A, "select count(*)::int n from store_click_outs");
  if (rows[0].n !== 2) throw new Error(`esperaba 2 filas, vio ${rows[0].n}`);
  return "2 filas";
});

await prueba("no ve los de otra tienda", async () => {
  // Si esto falla con "3 filas", lo más probable es que la vista haya perdido
  // `security_invoker`: sin esa opción corre como el dueño y la RLS deja de aplicar.
  const { rows } = await comoTienda(UID_A, "select distinct store_id from store_click_outs");
  if (rows.length !== 1 || rows[0].store_id !== "tienda-a") {
    throw new Error(`vio ${rows.length} tienda(s): ${rows.map((r) => r.store_id).join(", ")}`);
  }
  return "sólo la suya";
});

await prueba("y la otra tienda tampoco ve la suya", async () => {
  const { rows } = await comoTienda(UID_B, "select count(*)::int n from store_click_outs");
  if (rows[0].n !== 1) throw new Error(`esperaba 1 fila, vio ${rows[0].n}`);
  return "1 fila";
});

await prueba("puede separar lo facturable de los bots", async () => {
  const { rows } = await comoTienda(
    UID_A,
    "select count(*) filter (where not bot)::int f, count(*)::int t from store_click_outs",
  );
  if (rows[0].f !== 1 || rows[0].t !== 2) throw new Error(JSON.stringify(rows[0]));
  return "1 facturable de 2";
});

seccion("0015 · lo que la tienda NO puede leer");

const PROHIBIDAS = [
  ["visitor_id", "el identificador que sigue a una persona 400 días"],
  ["user_agent", "el navegador de la persona"],
  ["referrer", "de dónde venía"],
  ["utm_source", "nuestro costo de adquisición"],
  ["click_id", "el id de click de la plataforma"],
  ["first_touch_at", "cuándo nos descubrió"],
];

for (const [col, porque] of PROHIBIDAS) {
  await prueba(`${col} — ${porque}`, () =>
    debeSerNegado(UID_A, `select ${col} from click_outs limit 1`, col),
  );
}

await prueba("select * sobre la tabla", () =>
  debeSerNegado(UID_A, "select * from click_outs limit 1", "select *"),
);

await prueba("la vista tampoco expone visitor_id", () =>
  debeSerNegado(UID_A, "select visitor_id from store_click_outs limit 1", "visitor_id"),
);

seccion("0015 · los otros roles siguen como estaban");

await prueba("anon no lee clicks", async () => {
  try {
    await comoRol("anon", "select count(*) from click_outs");
  } catch (e) {
    return e.message.split("\n")[0];
  }
  throw new Error("anon pudo leer click_outs");
});

await prueba("anon conserva el insert que usa /salir", async () => {
  await comoRol("anon", "insert into click_outs (store_id, model_id) values ('tienda-a','m9')");
  return "insert ok";
});

await prueba("service_role sigue contando clicks por tienda (tablero de monetización)", async () => {
  const { rows } = await comoRol(
    "service_role",
    "select store_id, count(*)::int n from click_outs group by 1 order by 1",
  );
  return rows.map((r) => `${r.store_id}:${r.n}`).join(" · ");
});

/* ===========================================================================
 * Veredicto
 * ======================================================================== */

console.log(
  `\n${pasaron > 0 ? "\x1b[32m" : ""}${pasaron} pasaron\x1b[0m · ${
    fallaron > 0 ? "\x1b[31m" : ""
  }${fallaron} fallaron\x1b[0m`,
);
if (fallaron > 0) {
  console.log("");
  for (const e of errores) console.log(`  \x1b[31m·\x1b[0m ${e}`);
}
await db.close();
process.exit(fallaron > 0 ? 1 : 0);
