#!/usr/bin/env node
/**
 * Pruebas de humo, regresión e integración contra un servidor corriendo.
 *
 * Uso:
 *   node scripts/probar-integracion.mjs                       # contra localhost:3000
 *   node scripts/probar-integracion.mjs http://localhost:4000
 *
 * Normalmente no se corre suelto: lo llama `npm run probar` (ver `probar-todo.mjs`), que
 * además levanta y baja el servidor.
 *
 * ## Qué cubre cada grupo, y por qué están separados
 *
 * - **Humo**: el sitio arranca y las páginas que importan devuelven algo con sentido. Si esto
 *   falla, lo demás no significa nada.
 * - **Regresión**: los invariantes que ya costó conseguir y que se pueden perder sin que nadie
 *   lo note — un canonical que alguien saca, una cabecera que se cae, un campo comercial que
 *   se cuela en una respuesta pública. Es el grupo que justifica correr esto cada semana.
 * - **Integración**: las rutas que hacen algo de verdad (validan, autorizan, redirigen),
 *   probadas de punta a punta contra la base real.
 *
 * ## La regla que gobierna todo este archivo
 *
 * **Ninguna prueba puede escribir un dato de producción.** Este script corre contra la base
 * real, así que:
 *
 *  - Los formularios se prueban por sus caminos de **rechazo** (400) y por el honeypot, que
 *    contesta ok y no guarda. Nunca se manda un alta válida: crearía una alerta de precio
 *    real, con un mail real que después recibe correo.
 *  - El único efecto que sí ocurre es un `click_out` al probar `/salir`, y va con un
 *    User-Agent que lo marca `bot: true`, o sea fuera de lo facturable. Está dicho abajo, en
 *    el lugar donde pasa.
 *  - El rate limiting **no** se prueba por defecto: consumiría el cupo real de esta IP por
 *    una hora y dejaría el sitio sin formularios. Va detrás de `--incluir-rate-limit`.
 */

const ORIGEN = (process.argv.find((a) => a.startsWith("http")) || "http://localhost:3000").replace(/\/+$/, "");
const INCLUIR_RATE_LIMIT = process.argv.includes("--incluir-rate-limit");

/** Ver el docblock: marca los efectos de este script como no facturables. */
const UA = "notebooks-pruebas/1.0 (+monitor de integracion; no facturable)";

let pasaron = 0;
let fallaron = 0;
let omitidas = 0;
const errores = [];

function seccion(t) {
  console.log(`\n\x1b[1m${t}\x1b[0m`);
}

async function prueba(nombre, fn) {
  try {
    const r = await fn();
    if (r === "omitida") {
      omitidas++;
      console.log(`  \x1b[90m–\x1b[0m ${nombre} \x1b[90m(omitida)\x1b[0m`);
      return;
    }
    pasaron++;
    console.log(`  \x1b[32m✓\x1b[0m ${nombre}${typeof r === "string" ? ` — ${r}` : ""}`);
  } catch (e) {
    fallaron++;
    const msg = e instanceof Error ? e.message : String(e);
    errores.push(`${nombre}: ${msg}`);
    console.log(`  \x1b[31m✗\x1b[0m ${nombre}\n      \x1b[31m${msg}\x1b[0m`);
  }
}

function debe(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${ORIGEN}${ruta}`, {
    redirect: "manual",
    ...opciones,
    headers: { "user-agent": UA, ...(opciones.headers ?? {}) },
  });
  const texto = opciones.method === "HEAD" ? "" : await res.text();
  let json = null;
  try {
    json = JSON.parse(texto);
  } catch {
    /* no era JSON */
  }
  return { res, texto, json, estado: res.status, headers: res.headers };
}

const postJson = (ruta, cuerpo, extra = {}) =>
  pedir(ruta, {
    method: "POST",
    headers: { "content-type": "application/json", ...(extra.headers ?? {}) },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
    ...extra,
  });

/* ===========================================================================
 * HUMO
 * ======================================================================== */

const RUTAS = [
  ["/", "comparador"],
  ["/notebooks", "notebook"],
  ["/ofertas", null],
  ["/guias", "guía"],
  ["/guias/estudiar", "RAM"],
  ["/guias/gaming", "placa de video"],
  ["/guias/diseno", "pantalla"],
  ["/guias/programar", "memoria"],
  ["/guias/oficina", "oficina"],
  ["/marcas", null],
  ["/tiendas", null],
  ["/comparar", null],
  ["/corporativo", null],
  ["/blog", null],
  ["/privacidad", null],
];

async function humo() {
  seccion("Humo");

  for (const [ruta, debeContener] of RUTAS) {
    await prueba(`GET ${ruta}`, async () => {
      const { estado, texto } = await pedir(ruta);
      debe(estado === 200, `devolvió ${estado}`);
      debe(texto.length > 3000, `HTML sospechosamente corto (${texto.length} bytes)`);
      // Una página de error de Next devuelve 200 con el marcador adentro, así que el código
      // de estado solo no alcanza para saber que la página realmente renderizó.
      debe(!/__NEXT_ERROR|Application error/i.test(texto), "renderizó una página de error");
      debe(/<h1[\s>]/i.test(texto), "no tiene <h1>");
      if (debeContener) {
        debe(
          texto.toLowerCase().includes(debeContener.toLowerCase()),
          `no menciona "${debeContener}"`,
        );
      }
      return `${(texto.length / 1024).toFixed(0)} KB`;
    });
  }

  await prueba("una ficha de producto renderiza con precio", async () => {
    const ficha = await primeraFicha();
    debe(ficha, "no se encontró ninguna ficha en el sitemap");
    const { estado, texto } = await pedir(ficha);
    debe(estado === 200, `devolvió ${estado}`);
    debe(/\$\s?[\d.]{6,}/.test(texto), "no muestra ningún precio");
    debe(texto.includes("/salir/"), "no tiene ningún link de salida a la tienda");
    return ficha;
  });

  await prueba("404 en una ruta que no existe", async () => {
    const { estado } = await pedir("/esta-ruta-no-existe-jamas-12345");
    debe(estado === 404, `devolvió ${estado}`);
  });
}

let _ficha = null;
async function primeraFicha() {
  if (_ficha !== null) return _ficha;
  const { texto } = await pedir("/sitemap.xml");
  const url = /<loc>([^<]*\/notebooks\/[^<]+\/[^<]+)<\/loc>/.exec(texto)?.[1];
  _ficha = url ? new URL(url).pathname : false;
  return _ficha;
}

/* ===========================================================================
 * REGRESIÓN
 * ======================================================================== */

async function regresion() {
  seccion("Regresión");

  await prueba("las cabeceras de seguridad siguen en todas las páginas", async () => {
    const obligatorias = ["x-frame-options", "x-content-type-options", "referrer-policy", "strict-transport-security"];
    for (const ruta of ["/", "/notebooks", "/guias/gaming"]) {
      const { headers } = await pedir(ruta);
      for (const h of obligatorias) {
        debe(headers.get(h), `falta ${h} en ${ruta}`);
      }
      debe(!headers.get("x-powered-by"), `x-powered-by volvió en ${ruta}`);
    }
    return obligatorias.length + " en 3 rutas";
  });

  await prueba("la CSP sale y no tiene 'unsafe-eval'", async () => {
    const { headers } = await pedir("/");
    const csp = headers.get("content-security-policy") || headers.get("content-security-policy-report-only");
    debe(csp, "no sale ninguna cabecera de CSP");
    debe(!csp.includes("'unsafe-eval'"), "volvió 'unsafe-eval' a la política");
    debe(/frame-ancestors\s+'none'/.test(csp), "frame-ancestors dejó de ser 'none'");
    return headers.get("content-security-policy") ? "enforce" : "report-only";
  });

  await prueba("toda ruta pública declara canonical", async () => {
    const sin = [];
    for (const [ruta] of RUTAS) {
      const { texto } = await pedir(ruta);
      if (!/<link rel="canonical"/.test(texto)) sin.push(ruta);
    }
    debe(sin.length === 0, `sin canonical: ${sin.join(", ")}`);
    return `${RUTAS.length} rutas`;
  });

  await prueba("las rutas privadas siguen en noindex", async () => {
    for (const ruta of ["/cuenta", "/favoritos", "/ingresar", "/portal", "/baja"]) {
      const { texto, estado } = await pedir(ruta);
      if (estado !== 200) continue;
      debe(/<meta name="robots" content="[^"]*noindex/.test(texto), `${ruta} dejó de ser noindex`);
    }
    return "5 rutas";
  });

  await prueba("la vista filtrada es noindex y consolida en el listado limpio", async () => {
    const { texto } = await pedir("/notebooks?ram=16&sort=price-asc");
    debe(/<meta name="robots" content="[^"]*noindex/.test(texto), "no es noindex");
    const canon = /<link rel="canonical" href="([^"]+)"/.exec(texto)?.[1] ?? "";
    debe(canon.endsWith("/notebooks"), `su canonical es ${canon}`);
  });

  await prueba("la ficha declara una oferta por tienda con su seller resuelto", async () => {
    const ficha = await primeraFicha();
    debe(ficha, "no hay ficha");
    const { texto } = await pedir(ficha);
    const nodos = leerJsonLd(texto);
    const producto = nodos.find((n) => n["@type"] === "Product");
    debe(producto, "no hay nodo Product");
    const ofertas = [].concat(producto.offers ?? []);
    const agregado = ofertas.find((o) => o["@type"] === "AggregateOffer");
    const porTienda = ofertas.filter((o) => o["@type"] === "Offer");
    debe(agregado, "falta el AggregateOffer");
    debe(porTienda.length > 0, "no declara ninguna Offer por tienda");
    // Una referencia colgada hace que Google descarte el bloque entero, en silencio.
    const ids = new Set(nodos.map((n) => n["@id"]).filter(Boolean));
    const colgados = porTienda.map((o) => o.seller?.["@id"]).filter((id) => id && !ids.has(id));
    debe(colgados.length === 0, `${colgados.length} seller sin nodo (ej: ${colgados[0]})`);
    return `${porTienda.length} ofertas`;
  });

  await prueba("todo el JSON-LD del sitio parsea", async () => {
    for (const ruta of ["/", "/notebooks", "/guias/gaming", "/tiendas", "/marcas", "/blog"]) {
      const { texto } = await pedir(ruta);
      for (const b of texto.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
        try {
          JSON.parse(b[1]);
        } catch {
          throw new Error(`bloque inválido en ${ruta} — probablemente un "<" sin escapar`);
        }
      }
    }
    return "6 rutas";
  });

  /**
   * La fuga comercial.
   *
   * `cpc_ars` es lo que se le cobra a cada tienda por click. `mapStore` lo excluye a
   * propósito del objeto público, pero eso es una línea que alguien puede borrar sin darse
   * cuenta al agregar un campo — y el día que pase, cada tienda ve lo que pagan las otras.
   * Es el equivalente exacto del `costoUsd` que Córdoba Notebooks se filtró en la metadata
   * de producto y descubrió recién en una auditoría.
   */
  await prueba("no se filtra el CPC ni datos comerciales en respuestas públicas", async () => {
    const prohibidos = ["cpc_ars", "cpcArs", "service_role", "SUPABASE_SERVICE_ROLE"];
    const rutas = ["/", "/tiendas", "/notebooks", "/llms.txt", await primeraFicha()].filter(Boolean);
    for (const ruta of rutas) {
      const { texto } = await pedir(ruta);
      for (const p of prohibidos) {
        debe(!texto.includes(p), `apareció "${p}" en ${ruta}`);
      }
    }
    return `${prohibidos.length} términos en ${rutas.length} rutas`;
  });

  await prueba("/api/models/summary sólo devuelve los campos de la lista blanca", async () => {
    // El id sale del autocomplete, que es público y siempre devuelve `id`. Sacarlo del HTML
    // de la ficha dependía de que el prop de un componente de cliente quedara serializado con
    // un nombre concreto — o sea, de un detalle interno de Next que puede cambiar sin aviso, y
    // que hacía que la prueba se auto-omitiera sin que nadie lo notara.
    const { json: sug } = await pedir("/api/search/suggest?q=le");
    const id = sug?.models?.[0]?.id;
    if (!id) return "omitida";
    const { json } = await pedir(`/api/models/summary?ids=${encodeURIComponent(id)}`);
    const m = json?.models?.[0];
    if (!m) return "omitida";
    const permitidos = new Set([
      "id", "brand", "brandSlug", "name", "slug", "cpu", "ramGb",
      "gpuType", "os", "imageUrl", "bestPrice", "listingsCount",
    ]);
    const demas = Object.keys(m).filter((k) => !permitidos.has(k));
    debe(demas.length === 0, `campos de más: ${demas.join(", ")}`);
    return `${Object.keys(m).length} campos`;
  });

  await prueba("robots y sitemap siguen coherentes", async () => {
    const { texto: robots } = await pedir("/robots.txt");
    for (const d of ["/admin", "/api/", "/salir/"]) {
      debe(robots.includes(`Disallow: ${d}`), `robots dejó de bloquear ${d}`);
    }
    const { texto: sm } = await pedir("/sitemap.xml");
    const urls = (sm.match(/<loc>/g) || []).length;
    debe(urls > 10, `el sitemap tiene ${urls} URLs`);
    // Cada ruta pública enlazada desde la navegación tiene que estar. Es el hueco que en el
    // otro proyecto se abrió tres veces, y que el chequeo no ve porque recorre el sitemap.
    for (const [ruta] of RUTAS) {
      const buscada = ruta === "/" ? "/</loc>" : `${ruta}</loc>`;
      debe(sm.includes(buscada), `${ruta} no está en el sitemap`);
    }
    return `${urls} URLs, ${RUTAS.length} rutas verificadas`;
  });

  await prueba("un host que no es el canónico sale con noindex", async () => {
    // Es la única decisión de indexación del sitio. Si se rompe hacia un lado, un preview
    // compite con producción; hacia el otro, producción sale oculta de Google.
    const { headers } = await pedir("/", { headers: { host: "preview-cualquiera.vercel.app" } });
    const xr = headers.get("x-robots-tag") ?? "";
    debe(/noindex/i.test(xr), `no mandó noindex (x-robots-tag: "${xr || "ausente"}")`);
  });

  await prueba("/llms.txt sigue teniendo la forma que un modelo espera", async () => {
    const { estado, texto, headers } = await pedir("/llms.txt");
    debe(estado === 200, `devolvió ${estado}`);
    debe(headers.get("content-type")?.includes("text/plain"), "no es text/plain");
    debe(texto.startsWith("# "), "no arranca con un H1");
    for (const s of ["## Cómo leer los datos", "## Limitaciones", "## Modelos con oferta viva"]) {
      debe(texto.includes(s), `perdió la sección "${s}"`);
    }
    return `${(texto.length / 1024).toFixed(1)} KB`;
  });
}

function leerJsonLd(html) {
  const nodos = [];
  for (const b of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
    const j = JSON.parse(b[1]);
    nodos.push(...(j["@graph"] || [j]));
  }
  return nodos;
}

/* ===========================================================================
 * INTEGRACIÓN
 * ======================================================================== */

async function integracion() {
  seccion("Integración — validación de los formularios públicos");

  await prueba("/api/alertas rechaza los emails que includes('@') dejaba pasar", async () => {
    for (const email of ["@", "a@b", "", "sin arroba"]) {
      const { estado } = await postJson("/api/alertas", { email, modelId: "x" });
      debe(estado === 400, `aceptó "${email}" con ${estado}`);
    }
    return "4 casos";
  });

  await prueba("/api/alertas exige el modelo", async () => {
    const { estado } = await postJson("/api/alertas", { email: "prueba@ejemplo.com" });
    debe(estado === 400, `devolvió ${estado}`);
  });

  await prueba("el honeypot contesta ok y no guarda", async () => {
    // Contesta 200 a propósito: que el bot crea que funcionó es parte del punto. No se puede
    // verificar el "no guarda" desde afuera, pero sí que el camino existe y no da 400.
    const { estado, json } = await postJson("/api/alertas", {
      email: "bot@ejemplo.com",
      modelId: "x",
      website: "soy-un-bot",
    });
    debe(estado === 200 && json?.ok === true, `devolvió ${estado}`);
  });

  await prueba("/api/tiendas/solicitud rechaza URLs que no son http(s)", async () => {
    const { estado, json } = await postJson("/api/tiendas/solicitud", {
      commercialName: "Prueba",
      contactEmail: "prueba@ejemplo.com",
      website: "javascript:alert(1)",
    });
    debe(estado === 400, `aceptó javascript: con ${estado}`);
    debe(/http/i.test(json?.error ?? ""), "el error no explica el problema");
  });

  await prueba("/api/corporativo valida cantidad y contacto", async () => {
    const { estado } = await postJson("/api/corporativo", {
      companyName: "Prueba",
      contactEmail: "prueba@ejemplo.com",
      quantity: 0,
      specsNote: "algo",
    });
    debe(estado === 400, `aceptó cantidad 0 con ${estado}`);
  });

  await prueba("los endpoints rechazan un cuerpo que no es JSON", async () => {
    for (const ruta of ["/api/alertas", "/api/notificar", "/api/corporativo", "/api/tiendas/solicitud"]) {
      const { estado } = await postJson(ruta, "{esto no es json");
      debe(estado === 400, `${ruta} devolvió ${estado}`);
    }
    return "4 endpoints";
  });

  await prueba("los endpoints rechazan un cuerpo gigante", async () => {
    const gigante = JSON.stringify({ message: "x".repeat(100 * 1024) });
    const { estado } = await postJson("/api/corporativo", gigante);
    debe(estado === 400, `aceptó 100 KB con ${estado}`);
  });

  await prueba("los errores no filtran el esquema de la base", async () => {
    const { texto } = await postJson("/api/alertas", { email: "@", modelId: "x" });
    for (const p of ["price_alerts", "column", "constraint", "violates", "relation"]) {
      debe(!texto.toLowerCase().includes(p), `el error menciona "${p}"`);
    }
  });

  seccion("Integración — puertas");

  await prueba("/admin no abre sin sesión", async () => {
    const { estado, headers } = await pedir("/admin");
    debe([302, 307, 308].includes(estado), `devolvió ${estado}`);
    debe((headers.get("location") ?? "").includes("/admin/login"), "no redirige al login");
  });

  await prueba("las rutas del admin contestan 401 sin sesión", async () => {
    for (const ruta of ["/api/admin/store", "/api/admin/model", "/api/admin/listing"]) {
      const { estado } = await postJson(ruta, {});
      debe(estado === 401, `${ruta} devolvió ${estado}`);
    }
    return "3 rutas";
  });

  await prueba("una cookie de admin inventada no entra", async () => {
    const { estado } = await pedir("/admin", {
      headers: { cookie: "admin_session=dev-admin-session-token" },
    });
    debe([302, 307, 308].includes(estado), `entró con el token viejo del repo (${estado})`);
  });

  await prueba("/api/portal/insights exige token de miembro", async () => {
    const sinToken = await pedir("/api/portal/insights?storeId=cualquiera");
    debe(sinToken.estado === 401, `sin token devolvió ${sinToken.estado}`);
    const conBasura = await pedir("/api/portal/insights?storeId=cualquiera", {
      headers: { authorization: "Bearer no-es-un-token" },
    });
    debe(conBasura.estado === 401, `con token inválido devolvió ${conBasura.estado}`);
    // 401 en los dos casos a propósito: distinguirlos confirma que el storeId existe.
    debe(sinToken.texto === conBasura.texto, "las dos respuestas se distinguen entre sí");
  });

  await prueba("/api/revalidar no invalida sin el secreto", async () => {
    const { estado } = await postJson("/api/revalidar", {});
    debe([401, 503].includes(estado), `devolvió ${estado}`);
    const conBasura = await postJson("/api/revalidar", {}, { headers: { "x-revalidar-token": "no" } });
    debe([401, 503].includes(conBasura.estado), `con token inválido devolvió ${conBasura.estado}`);
    return estado === 503 ? "503 (sin REVALIDATE_SECRET en el entorno)" : "401";
  });

  seccion("Integración — el redirect saliente");

  await prueba("/salir redirige, no se cachea y no queda facturable", async () => {
    const ficha = await primeraFicha();
    debe(ficha, "no hay ficha");
    const { texto } = await pedir(ficha);
    const id = /href="\/salir\/([^"]+)"/.exec(texto)?.[1];
    debe(id, "la ficha no tiene ningún link de salida");

    // Esto SÍ escribe una fila en click_outs. Va con el User-Agent de arriba, que el
    // endpoint clasifica como bot, así que queda fuera de lo que se le factura a la tienda.
    const { estado, headers } = await pedir(`/salir/${id}`);
    debe(estado === 302, `devolvió ${estado}`);
    const loc = headers.get("location") ?? "";
    debe(/^https?:\/\//.test(loc), `Location con esquema raro: ${loc.slice(0, 40)}`);
    debe(/no-store/.test(headers.get("cache-control") ?? ""), "se puede cachear");
    debe(/noindex/i.test(headers.get("x-robots-tag") ?? ""), "sin x-robots-tag");
    return `→ ${new URL(loc).host}`;
  });

  await prueba("/salir con un id inexistente cae al catálogo", async () => {
    const { estado, headers } = await pedir("/salir/no-existe-este-id-12345");
    debe(estado === 302, `devolvió ${estado}`);
    debe((headers.get("location") ?? "").includes("/notebooks"), "no cae en /notebooks");
  });

  seccion("Integración — endpoints de lectura");

  await prueba("/api/search/suggest exige dos caracteres y acota la entrada", async () => {
    const corta = await pedir("/api/search/suggest?q=a");
    debe(corta.json?.models?.length === 0, "contestó con una sola letra");
    const larga = await pedir(`/api/search/suggest?q=${"x".repeat(500)}`);
    debe(larga.estado === 200, `una consulta larga devolvió ${larga.estado}`);
    debe(Array.isArray(larga.json?.models), "la forma de la respuesta cambió");
  });

  await prueba("/api/csp-report descarta sin explicar y siempre da 204", async () => {
    const valido = await postJson("/api/csp-report", { "csp-report": { "violated-directive": "prueba" } },
      { headers: { "content-type": "application/csp-report" } });
    debe(valido.estado === 204, `un informe válido devolvió ${valido.estado}`);
    const basura = await postJson("/api/csp-report", "no json", { headers: { "content-type": "application/csp-report" } });
    debe(basura.estado === 204, `basura devolvió ${basura.estado}`);
    const gigante = await postJson("/api/csp-report", JSON.stringify({ x: "y".repeat(200 * 1024) }),
      { headers: { "content-type": "application/csp-report" } });
    debe(gigante.estado === 204, `un cuerpo gigante devolvió ${gigante.estado}`);
    return "3 casos, todos 204";
  });

  await prueba("/api/usd degrada sin romper", async () => {
    const { estado, json } = await pedir("/api/usd");
    debe(estado === 200, `devolvió ${estado}`);
    debe("rate" in (json ?? {}), "la respuesta no tiene 'rate'");
    return json.rate ? `US$ ${json.rate}` : "rate null (la API de afuera no respondió)";
  });

  if (INCLUIR_RATE_LIMIT) {
    seccion("Integración — rate limiting (consume cupo real)");
    await prueba("el sexto intento en la ventana devuelve 429 con Retry-After", async () => {
      let ultimo = null;
      for (let i = 0; i < 7; i++) {
        ultimo = await postJson("/api/alertas", { email: "@", modelId: "x" });
        if (ultimo.estado === 429) break;
      }
      debe(ultimo.estado === 429, `después de 7 intentos seguía en ${ultimo.estado}`);
      const reintentar = Number(ultimo.headers.get("retry-after"));
      debe(reintentar >= 1, `Retry-After inválido: ${ultimo.headers.get("retry-after")}`);
      return `429 con Retry-After ${reintentar}s`;
    });
  } else {
    seccion("Integración — rate limiting");
    console.log(
      "  \x1b[90m–\x1b[0m omitido: consumiría el cupo real de esta IP por una hora y dejaría\n" +
        "      el sitio sin formularios. Correr con \x1b[1m--incluir-rate-limit\x1b[0m si hace falta.",
    );
    omitidas++;
  }
}

/* ======================================================================== */

console.log(`\nProbando \x1b[1m${ORIGEN}\x1b[0m`);
try {
  await humo();
  await regresion();
  await integracion();
} catch (e) {
  fallaron++;
  errores.push(`la corrida se cortó: ${e instanceof Error ? e.message : String(e)}`);
  console.log(`\n  \x1b[31m✗ la corrida se cortó — ${e instanceof Error ? e.message : e}\x1b[0m`);
}

console.log(
  `\n${fallaron === 0 ? "\x1b[32m" : "\x1b[31m"}${pasaron} pasaron · ${fallaron} fallaron` +
    `${omitidas ? ` · ${omitidas} omitidas` : ""}\x1b[0m\n`,
);
if (errores.length) {
  console.log("Fallas:");
  for (const e of errores) console.log(`  · ${e}`);
  console.log("");
}
process.exit(fallaron === 0 ? 0 : 1);
