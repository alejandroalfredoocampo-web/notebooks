#!/usr/bin/env node
/**
 * Chequeo del sitio desplegado: seguridad, SEO y las rutas que tienen que responder.
 *
 * Uso:
 *   node scripts/chequear-sitio.mjs                       # contra producción
 *   node scripts/chequear-sitio.mjs https://staging.x.ar  # contra otro origen
 *
 * ## La lección que hace que este script sea distinto
 *
 * En el otro proyecto, el chequeo automático de la CSP daba **verde con la política rota**,
 * porque probaba `csp.includes("mercadopago")`: confirmaba que la palabra estaba en el
 * texto, no que el origen que el sitio realmente carga estuviera cubierto. Cuando se
 * prendió el modo enforce, el checkout se quedó sin assets.
 *
 * Por eso acá cada chequeo prueba **una capacidad**, no una palabra: que la directiva
 * exista *y* permita lo que el sitio usa, que la ruta devuelva 200 *y* con el contenido
 * esperado, que el canonical apunte a la URL pedida *y* no a la home.
 *
 * Sale con código 1 si algo falla, así se puede colgar de un deploy o de CI.
 */

const ORIGEN = (process.argv[2] || "https://www.notebooks.com.ar").replace(/\/+$/, "");

let fallas = 0;
let avisos = 0;

/**
 * El origen que el **sitio** declara como canónico, que puede no ser el que estamos
 * chequeando.
 *
 * Es la diferencia entre correr esto contra producción y contra staging o localhost: ahí el
 * canonical apunta a producción a propósito (`NEXT_PUBLIC_SITE_URL` no está seteada), y
 * contarlo como falla haría que el script sólo sirva en un único entorno — o sea, que no se
 * corra nunca antes de desplegar, que es cuando sirve.
 *
 * Se descubre leyendo el canonical de la home y después se verifica **la forma** de cada
 * canonical contra él, no contra el origen pedido.
 */
let ORIGEN_CANONICO = ORIGEN;

function ok(nombre, detalle = "") {
  console.log(`  \x1b[32m✓\x1b[0m ${nombre}${detalle ? ` — ${detalle}` : ""}`);
}
function falla(nombre, detalle) {
  fallas++;
  console.log(`  \x1b[31m✗\x1b[0m ${nombre}${detalle ? ` — ${detalle}` : ""}`);
}
function aviso(nombre, detalle) {
  avisos++;
  console.log(`  \x1b[33m!\x1b[0m ${nombre}${detalle ? ` — ${detalle}` : ""}`);
}
function seccion(t) {
  console.log(`\n\x1b[1m${t}\x1b[0m`);
}

/** La primera ficha de producto del sitemap, como **ruta** y no como URL absoluta. */
function rutaDeLoc(sitemap) {
  const url = /<loc>([^<]*\/notebooks\/[^<]+\/[^<]+)<\/loc>/.exec(sitemap)?.[1];
  if (!url) return null;
  try {
    return new URL(url).pathname;
  } catch {
    return null;
  }
}

async function traer(ruta, opciones = {}) {
  const res = await fetch(`${ORIGEN}${ruta}`, { redirect: "manual", ...opciones });
  const cuerpo = opciones.method === "HEAD" ? "" : await res.text();
  return { res, cuerpo, headers: res.headers };
}

/* ---------------------------------------------------------------------------
 * 1. Cabeceras de seguridad
 * ------------------------------------------------------------------------- */

async function descubrirCanonico() {
  const { cuerpo } = await traer("/");
  const canon = /<link rel="canonical" href="([^"]+)"/.exec(cuerpo)?.[1];
  if (!canon) return;
  try {
    ORIGEN_CANONICO = new URL(canon).origin;
  } catch {
    /* se queda con el origen pedido */
  }
  if (ORIGEN_CANONICO !== ORIGEN) {
    console.log(
      `  \x1b[33m!\x1b[0m El sitio se declara como \x1b[1m${ORIGEN_CANONICO}\x1b[0m. ` +
        `Los canonical se verifican contra ese origen.`,
    );
  }
}

async function cabeceras() {
  seccion("Cabeceras de seguridad");
  const { headers } = await traer("/");

  const exactas = {
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
  for (const [h, esperado] of Object.entries(exactas)) {
    const v = headers.get(h);
    if (!v) falla(h, "ausente");
    else if (v.toLowerCase() !== esperado.toLowerCase()) falla(h, `es "${v}", se esperaba "${esperado}"`);
    else ok(h, v);
  }

  const hsts = headers.get("strict-transport-security");
  if (!hsts) falla("strict-transport-security", "ausente");
  else {
    const edad = Number(/max-age=(\d+)/.exec(hsts)?.[1] ?? 0);
    // Un año es el mínimo para entrar a la lista de precarga.
    if (edad < 31536000) falla("strict-transport-security", `max-age=${edad}, corto`);
    else ok("strict-transport-security", `max-age=${edad}`);
  }

  if (headers.get("x-powered-by")) falla("x-powered-by", "delata el stack; poner poweredByHeader:false");
  else ok("x-powered-by", "ausente");

  const perm = headers.get("permissions-policy");
  if (!perm) falla("permissions-policy", "ausente");
  else if (!/camera=\(\)/.test(perm) || !/geolocation=\(\)/.test(perm))
    falla("permissions-policy", "no apaga cámara o geolocalización");
  else ok("permissions-policy");
}

/* ---------------------------------------------------------------------------
 * 2. CSP — por capacidad, no por palabra
 * ------------------------------------------------------------------------- */

async function csp() {
  seccion("Content-Security-Policy");
  const { headers, cuerpo } = await traer("/");
  const enforce = headers.get("content-security-policy");
  const report = headers.get("content-security-policy-report-only");
  const politica = enforce || report;

  if (!politica) {
    falla("CSP", "no sale ninguna de las dos cabeceras");
    return;
  }
  ok("CSP presente", enforce ? "en modo enforce" : "en modo report-only");
  if (!enforce) {
    aviso(
      "CSP en report-only",
      "no bloquea nada todavía. Mirar /api/csp-report unos días y prender CSP_ENFORCE=true",
    );
  }

  const directivas = Object.fromEntries(
    politica.split(";").map((d) => {
      const [k, ...v] = d.trim().split(/\s+/);
      return [k, v];
    }),
  );

  // Las tres que no pueden faltar y qué valor tienen que tener.
  const obligatorias = {
    "default-src": (v) => v.includes("'self'"),
    "object-src": (v) => v.includes("'none'"),
    "frame-ancestors": (v) => v.includes("'none'"),
    "base-uri": (v) => v.includes("'self'"),
  };
  for (const [d, valida] of Object.entries(obligatorias)) {
    if (!directivas[d]) falla(`CSP ${d}`, "ausente");
    else if (!valida(directivas[d])) falla(`CSP ${d}`, `valor inesperado: ${directivas[d].join(" ")}`);
    else ok(`CSP ${d}`);
  }

  // `unsafe-eval` no debería estar: nada del sitio lo usa, y sacarlo es la mitad del valor.
  if ((directivas["script-src"] || []).includes("'unsafe-eval'"))
    aviso("CSP script-src", "tiene 'unsafe-eval'; si nada lo necesita, sacarlo");
  else ok("CSP script-src", "sin 'unsafe-eval'");

  /**
   * Acá está la parte que aprendió del error del otro proyecto: en vez de confiar en que
   * la palabra "supabase" figura en algún lado, se saca del HTML el origen que el sitio
   * **realmente** va a contactar y se lo prueba contra `connect-src`.
   */
  const origenes = new Set();
  for (const m of cuerpo.matchAll(/https:\/\/[a-z0-9-]+\.supabase\.co/g)) origenes.add(m[0]);
  const connect = directivas["connect-src"] || [];
  if (!origenes.size) {
    aviso("CSP connect-src", "no se encontró el origen de Supabase en el HTML; no se pudo verificar");
  } else {
    for (const o of origenes) {
      const host = new URL(o).host;
      const cubierto = connect.some(
        (p) =>
          p === o ||
          p === "*" ||
          (p.startsWith("https://*.") && host.endsWith(p.slice("https://*.".length))),
      );
      if (cubierto) ok("CSP connect-src cubre", o);
      else falla("CSP connect-src NO cubre", `${o} — el sitio lo contacta y la política lo bloquearía`);
    }
  }

  // El receptor de informes tiene que existir, o report-only no informa a nadie.
  if (!politica.includes("report-uri")) aviso("CSP report-uri", "sin receptor: nadie ve las violaciones");
  else {
    const r = await fetch(`${ORIGEN}/api/csp-report`, {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body: JSON.stringify({ "csp-report": { "violated-directive": "chequeo" } }),
    });
    if (r.status === 204) ok("CSP report-uri responde", "204");
    else falla("CSP report-uri", `respondió ${r.status}, se esperaba 204`);
  }
}

/* ---------------------------------------------------------------------------
 * 3. Indexación
 * ------------------------------------------------------------------------- */

async function indexacion() {
  seccion("Indexación");

  // El chequeo del día del deploy: el host canónico no debe emitir noindex.
  const { headers, cuerpo } = await traer("/notebooks");
  const xr = headers.get("x-robots-tag");
  if (ORIGEN !== ORIGEN_CANONICO) {
    // Fuera del host canónico el noindex es lo correcto: es lo que evita que un preview
    // compita en Google con producción por el mismo contenido.
    if (xr && /noindex/i.test(xr)) ok("X-Robots-Tag", "noindex fuera del host canónico, como corresponde");
    else falla("X-Robots-Tag", "este host no es el canónico y NO manda noindex: va a competir con producción");
  } else if (xr && /noindex/i.test(xr)) {
    falla("X-Robots-Tag en el host canónico", `dice "${xr}" — el sitio está oculto`);
  } else {
    ok("X-Robots-Tag", "el host canónico no manda noindex");
  }

  const metaRobots = /<meta name="robots" content="([^"]+)"/.exec(cuerpo)?.[1];
  if (metaRobots && /noindex/i.test(metaRobots)) falla("meta robots en /notebooks", metaRobots);
  else ok("meta robots en /notebooks", metaRobots || "(sin meta, hereda index)");

  // Y la contracara: una vista filtrada SÍ tiene que salir noindex y con canonical al limpio.
  const filtrada = await traer("/notebooks?ram=16");
  const mrf = /<meta name="robots" content="([^"]+)"/.exec(filtrada.cuerpo)?.[1] ?? "";
  const canonF = /<link rel="canonical" href="([^"]+)"/.exec(filtrada.cuerpo)?.[1] ?? "";
  if (!/noindex/i.test(mrf)) falla("vista filtrada", "debería ser noindex y no lo es");
  else if (!canonF.endsWith("/notebooks")) falla("vista filtrada", `su canonical es ${canonF}, debería ser /notebooks`);
  else ok("vista filtrada", "noindex + canonical al listado limpio");
}

/* ---------------------------------------------------------------------------
 * 4. Rutas y artefactos de SEO
 * ------------------------------------------------------------------------- */

const RUTAS_PUBLICAS = [
  "/",
  "/notebooks",
  "/ofertas",
  "/guias",
  "/guias/estudiar",
  "/guias/gaming",
  "/guias/diseno",
  "/guias/programar",
  "/guias/oficina",
  "/marcas",
  "/tiendas",
  "/comparar",
  "/corporativo",
  "/blog",
  "/privacidad",
];

async function rutas() {
  seccion("Rutas públicas");
  for (const r of RUTAS_PUBLICAS) {
    const { res, cuerpo } = await traer(r);
    if (res.status !== 200) {
      falla(r, `${res.status}`);
      continue;
    }
    const canon = /<link rel="canonical" href="([^"]+)"/.exec(cuerpo)?.[1];
    if (!canon) falla(r, "sin canonical");
    else if (!canon.startsWith(ORIGEN_CANONICO)) falla(r, `canonical apunta afuera: ${canon}`);
    else if (r !== "/" && !canon.endsWith(r)) falla(r, `canonical es ${canon}`);
    else ok(r, "200 + canonical");
  }
}

async function artefactos() {
  seccion("Artefactos de SEO y LLMO");

  const sm = await traer("/sitemap.xml");
  const urls = (sm.cuerpo.match(/<loc>/g) || []).length;
  if (sm.res.status !== 200 || urls === 0) falla("/sitemap.xml", `${sm.res.status}, ${urls} URLs`);
  else {
    ok("/sitemap.xml", `${urls} URLs`);
    // Que las guías estén en el sitemap: es el hueco que ya se abrió tres veces en el otro
    // proyecto, siempre con secciones enlazadas desde la navegación.
    const faltan = ["/guias", "/comparar"].filter((r) => !sm.cuerpo.includes(`${ORIGEN_CANONICO}${r}<`));
    if (faltan.length) falla("sitemap", `faltan rutas enlazadas desde la navegación: ${faltan.join(", ")}`);
    else ok("sitemap", "incluye /guias y /comparar");
    const lastmod = (sm.cuerpo.match(/<lastmod>/g) || []).length;
    if (lastmod === 0) aviso("sitemap", "ninguna URL declara lastmod");
    else ok("sitemap", `${lastmod} URLs con lastmod real`);
  }

  const robots = await traer("/robots.txt");
  if (robots.res.status !== 200) falla("/robots.txt", `${robots.res.status}`);
  else {
    const debeBloquear = ["/admin", "/api/", "/salir/"];
    const faltan = debeBloquear.filter((d) => !robots.cuerpo.includes(`Disallow: ${d}`));
    if (faltan.length) falla("/robots.txt", `no bloquea ${faltan.join(", ")}`);
    else ok("/robots.txt", "bloquea admin, api y el redirect saliente");
    if (!robots.cuerpo.includes(`Sitemap: ${ORIGEN_CANONICO}/sitemap.xml`)) falla("/robots.txt", "no declara el sitemap");
    else ok("/robots.txt", "declara el sitemap");
  }

  const llms = await traer("/llms.txt");
  if (llms.res.status !== 200) falla("/llms.txt", `${llms.res.status}`);
  else if (!llms.cuerpo.startsWith("# ")) falla("/llms.txt", "no arranca con un H1 (convención de llmstxt.org)");
  else ok("/llms.txt", `${(llms.cuerpo.length / 1024).toFixed(1)} KB`);

  const og = await traer("/opengraph-image", { method: "HEAD" });
  if (og.res.status !== 200) falla("/opengraph-image", `${og.res.status}`);
  else ok("/opengraph-image", og.headers.get("content-type") || "");
}

/* ---------------------------------------------------------------------------
 * 5. Datos estructurados
 * ------------------------------------------------------------------------- */

async function estructurados() {
  seccion("Datos estructurados");

  const { cuerpo } = await traer("/");
  const bloques = [...cuerpo.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  if (!bloques.length) {
    falla("JSON-LD en la home", "no hay ningún bloque");
    return;
  }
  let tipos = [];
  for (const b of bloques) {
    try {
      const j = JSON.parse(b[1]);
      tipos.push(...(j["@graph"] || [j]).map((n) => n["@type"]).flat());
    } catch {
      falla("JSON-LD", "un bloque no parsea — probablemente un '<' sin escapar");
      return;
    }
  }
  for (const t of ["Organization", "WebSite"]) {
    if (tipos.includes(t)) ok(`JSON-LD ${t}`);
    else falla(`JSON-LD ${t}`, "ausente en la home");
  }

  // La ficha de producto: que declare una oferta por tienda y no sólo el agregado.
  const sm = await traer("/sitemap.xml");
  const ficha = rutaDeLoc(sm.cuerpo);
  if (!ficha) {
    aviso("JSON-LD de producto", "no se encontró ninguna ficha en el sitemap");
    return;
  }
  const p = await traer(ficha);
  const bloquesP = [...p.cuerpo.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  let producto = null;
  const nodos = [];
  for (const b of bloquesP) {
    try {
      const j = JSON.parse(b[1]);
      nodos.push(...(j["@graph"] || [j]));
    } catch {
      falla("JSON-LD de la ficha", "un bloque no parsea");
      return;
    }
  }
  producto = nodos.find((n) => n["@type"] === "Product");
  if (!producto) {
    falla("JSON-LD Product", `ausente en ${ficha}`);
    return;
  }
  ok("JSON-LD Product", producto.name);

  const ofertas = Array.isArray(producto.offers) ? producto.offers : [producto.offers].filter(Boolean);
  const agregado = ofertas.find((o) => o["@type"] === "AggregateOffer");
  const porTienda = ofertas.filter((o) => o["@type"] === "Offer");
  if (!agregado) falla("JSON-LD AggregateOffer", "ausente: el resultado no puede decir 'desde $X'");
  else ok("JSON-LD AggregateOffer", `${agregado.lowPrice}–${agregado.highPrice} en ${agregado.offerCount}`);
  if (!porTienda.length) falla("JSON-LD Offer por tienda", "ausente: no se declara quién vende");
  else ok("JSON-LD Offer por tienda", `${porTienda.length}`);

  // Cada `seller` tiene que resolver a un nodo declarado en la misma página. Una
  // referencia colgada hace que Google descarte el bloque entero.
  const ids = new Set(nodos.map((n) => n["@id"]).filter(Boolean));
  const colgados = porTienda.map((o) => o.seller?.["@id"]).filter((id) => id && !ids.has(id));
  if (colgados.length) falla("JSON-LD seller", `${colgados.length} referencias sin nodo: ${colgados[0]}`);
  else if (porTienda.length) ok("JSON-LD seller", "todas las referencias resuelven");
}

/* ---------------------------------------------------------------------------
 * 6. Endpoints que no deberían estar abiertos
 * ------------------------------------------------------------------------- */

async function puertas() {
  seccion("Puertas");

  const admin = await traer("/admin");
  if (admin.res.status === 200) falla("/admin", "responde 200 sin sesión");
  else ok("/admin", `${admin.res.status} sin sesión`);

  const insights = await traer("/api/portal/insights?storeId=cualquiera");
  if (insights.res.status === 200)
    falla("/api/portal/insights", "responde 200 sin token — el informe de la tienda está abierto");
  else ok("/api/portal/insights", `${insights.res.status} sin token`);

  const apiAdmin = await traer("/api/admin/store", { method: "POST" });
  if (apiAdmin.res.status === 200) falla("/api/admin/store", "responde 200 sin sesión");
  else ok("/api/admin/store", `${apiAdmin.res.status} sin sesión`);

  // El redirect saliente no se puede cachear: un click cacheado es un click que no se cobra.
  const sm = await traer("/sitemap.xml");
  const ficha = rutaDeLoc(sm.cuerpo);
  if (ficha) {
    const p = await traer(ficha);
    const id = /href="\/salir\/([^"]+)"/.exec(p.cuerpo)?.[1];
    if (id) {
      const salida = await traer(`/salir/${id}`);
      const cc = salida.headers.get("cache-control") || "";
      if (!/no-store/.test(cc)) falla("/salir", `Cache-Control es "${cc}", debería ser no-store`);
      else ok("/salir", "no-store");
      const loc = salida.headers.get("location") || "";
      if (!/^https?:\/\//.test(loc)) falla("/salir", `Location con esquema raro: ${loc.slice(0, 40)}`);
      else ok("/salir", `redirige a ${new URL(loc).host}`);
    }
  }
}

/* ------------------------------------------------------------------------- */

console.log(`\nChequeando \x1b[1m${ORIGEN}\x1b[0m`);
try {
  await descubrirCanonico();
  await cabeceras();
  await csp();
  await indexacion();
  await rutas();
  await artefactos();
  await estructurados();
  await puertas();
} catch (e) {
  falla("el chequeo se cortó", e instanceof Error ? e.message : String(e));
}

console.log(
  `\n${fallas === 0 ? "\x1b[32mSin fallas\x1b[0m" : `\x1b[31m${fallas} falla(s)\x1b[0m`}` +
    `${avisos ? ` · \x1b[33m${avisos} aviso(s)\x1b[0m` : ""}\n`,
);
process.exit(fallas === 0 ? 0 : 1);
