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
 * ## Qué corre exactamente
 *
 * `supabase/local/andamio.sql` y después **las quince migraciones del repo, en orden**, sin
 * saltear ninguna y sin recortes: si una rompe a otra, se ve acá. El andamio es el mismo
 * archivo que usa la base local de Postgres.app (ver `supabase/local/LEEME.md`), así que las
 * dos formas de probar arrancan del mismo lugar y no pueden divergir.
 *
 * ## Qué NO prueba
 *
 * No es Supabase. Los roles `anon`, `authenticated` y `service_role`, el esquema `auth` y
 * `auth.uid()` salen del andamio para parecerse a lo que hay allá. O sea que verifica **la
 * lógica del SQL**, no la configuración de la instancia: si en Supabase alguien le dio a
 * `authenticated` un grant extra a mano, acá no se ve.
 */

import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SUPABASE = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase");
const MIGRACIONES = join(SUPABASE, "migrations");
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
 * El andamio y las migraciones
 * ======================================================================== */

seccion(`Se aplica el andamio y las ${readdirSync(MIGRACIONES).filter((f) => f.endsWith(".sql")).length} migraciones`);

await prueba("andamio.sql (roles, auth.users, auth.uid, privilegios por defecto)", async () => {
  await db.exec(readFileSync(join(SUPABASE, "local", "andamio.sql"), "utf8"));
});

// En orden y sin saltear ninguna: si una rompe a otra, se ve acá y no en el SQL Editor.
const archivos = readdirSync(MIGRACIONES).filter((f) => f.endsWith(".sql")).sort();
if (archivos.length < 16) throw new Error(`sólo se encontraron ${archivos.length} migraciones`);
for (const f of archivos) {
  await prueba(f, async () => {
    await db.exec(leer(f));
  });
}

/* Dos tiendas, dos miembros, tres clicks. `auth.users` primero: 0010 le cuelga una FK. */
await prueba("se puede sembrar el caso de prueba", async () => {
  await db.exec(`
    insert into auth.users (id) values ('${UID_A}'), ('${UID_B}');
    insert into stores (id, name, slug, url) values
      ('tienda-a','Tienda A','tienda-a','https://tienda-a.test'),
      ('tienda-b','Tienda B','tienda-b','https://tienda-b.test');
    insert into store_members (user_id, store_id) values ('${UID_A}','tienda-a'), ('${UID_B}','tienda-b');
    insert into click_outs (store_id, model_id, visitor_id, user_agent, referrer, utm_source, bot, device)
    values ('tienda-a','m1','vid-1','Mozilla/5.0','https://google.com','google',false,'mobile'),
           ('tienda-a','m2','vid-2','Mozilla/5.0',null,'meta',true,'desktop'),
           ('tienda-b','m3','vid-3','Mozilla/5.0',null,'google',false,'mobile');
  `);
  return "2 tiendas · 2 miembros · 3 clicks";
});

/** Corre una consulta como si fuera el navegador de un miembro de esa tienda. */
async function comoTienda(uid, sql) {
  await db.exec(`set role authenticated; set local.uid = '${uid}';`);
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


await prueba("service_role sigue contando clicks por tienda (tablero de monetización)", async () => {
  const { rows } = await comoRol(
    "service_role",
    "select store_id, count(*)::int n from click_outs group by 1 order by 1",
  );
  return rows.map((r) => `${r.store_id}:${r.n}`).join(" · ");
});

/* ===========================================================================
 * 0016 — las escrituras públicas pasan sólo por la API
 *
 * Hasta la 0015 había una prueba "anon conserva el insert que usa /salir". Se sacó a
 * propósito: esa capacidad es exactamente el agujero que cierra la 0016 (cualquiera con la
 * anon key insertaba clicks, alertas y solicitudes salteando la API). Lo que se prueba
 * ahora es lo contrario, y que `service_role` —con el que escriben las rutas— siga pudiendo.
 * ======================================================================== */

seccion("0016 · anon ya no escribe directo");

// Un modelo real para que las FK de alertas y avisos no sean las que rechazan el insert.
await db.exec("insert into models (id, brand, brand_slug, name, slug) values ('m-prueba','X','x','Prueba','prueba') on conflict do nothing;");

/** Un insert que tiene que ser rechazado. Que pase es la falla. */
async function insertNegado(rol, sql, que) {
  try {
    await comoRol(rol, sql);
  } catch (e) {
    const msg = e.message.split("\n")[0];
    // Tiene que fallar por permisos. Si falla por una FK o una columna, la prueba pasaría
    // sin haber probado nada.
    if (!/row-level security|permission denied/i.test(msg)) {
      throw new Error(`falló por otro motivo, no por permisos: ${msg}`);
    }
    return msg;
  }
  throw new Error(`${rol} pudo: ${que}`);
}

const INSERTS_PUBLICOS = [
  ["click_outs", "insert into click_outs (store_id, model_id) values ('tienda-a','m9')", "clicks que se facturan"],
  ["price_alerts", "insert into price_alerts (email, model_id, target_price) values ('x@example.com','m-prueba',1)", "mails a terceros"],
  ["store_applications", "insert into store_applications (commercial_name, website, contact_email) values ('x','javascript:alert(1)','x@example.com')", "XSS en la bandeja del admin"],
  ["model_notify", "insert into model_notify (email, model_id) values ('x@example.com','m-prueba')", "avisos a terceros"],
  ["bulk_requests", "insert into bulk_requests (id, company_name, contact_email, quantity) values ('b-prueba','x','x@example.com',10)", "solicitudes corporativas"],
];

for (const [tabla, sql, porque] of INSERTS_PUBLICOS) {
  await prueba(`anon no inserta en ${tabla} — ${porque}`, () => insertNegado("anon", sql, tabla));
}

await prueba("anon no puede inflar el rate limit de otra IP", () =>
  insertNegado("anon", "select bump_rate_limit('admin-login:1.2.3.4:1', 60)", "bump_rate_limit"),
);

await prueba("authenticated tampoco", () =>
  insertNegado("authenticated", "select bump_rate_limit('admin-login:1.2.3.4:1', 60)", "bump_rate_limit"),
);

await prueba("anon no lee el tamaño de la base", () =>
  insertNegado("anon", "select tamano_base()", "tamano_base"),
);

await prueba("anon no ejecuta el mantenimiento del rate limit (0013 lo dejaba abierto)", () =>
  insertNegado("anon", "select purge_rate_limits()", "purge_rate_limits"),
);

seccion("0016 · service_role, con el que escriben las rutas, sigue pudiendo");

await prueba("service_role registra un click (/salir)", async () => {
  await comoRol("service_role", "insert into click_outs (store_id, model_id) values ('tienda-a','m9')");
  return "insert ok";
});

await prueba("service_role cuenta el rate limit", async () => {
  const { rows } = await comoRol("service_role", "select bump_rate_limit('prueba:1.2.3.4:1', 60) n");
  if (Number(rows[0].n) !== 1) throw new Error(`devolvió ${rows[0].n}`);
  return "cuenta 1";
});

await prueba("service_role lee el tamaño de la base", async () => {
  const { rows } = await comoRol("service_role", "select tamano_base() n");
  if (!(Number(rows[0].n) > 0)) throw new Error(`devolvió ${rows[0].n}`);
  return `${Math.round(Number(rows[0].n) / 1024 / 1024)} MB`;
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
