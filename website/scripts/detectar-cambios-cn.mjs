#!/usr/bin/env node
/**
 * Detecta qué avanzó Córdoba Notebooks desde la última revisión de paridad.
 *
 *   node scripts/detectar-cambios-cn.mjs                    # busca el repo de CN solo
 *   node scripts/detectar-cambios-cn.mjs --cn /ruta/al/repo # o se lo pasás
 *   node scripts/detectar-cambios-cn.mjs --json             # salida para automatizar
 *
 * Esta es la **parte B** del plan de `08-correr-esto-sin-tu-maquina.md`: la mitad de la
 * revisión semanal que no necesita criterio. Sólo mira y cuenta; no decide nada y no toca
 * ningún archivo.
 *
 * Corre igual en tu máquina y en GitHub Actions. En Actions lo usa
 * `.github/workflows/detectar-paridad.yml` para mantener un issue al día.
 *
 * ## La clasificación es una ayuda para triar, no un veredicto
 *
 * Cada commit se etiqueta por palabras del asunto. Eso alcanza para ordenar una lista de
 * veinte y no alcanza para decidir nada: un commit que dice "checkout" puede estar tocando
 * la CSP, y uno que dice "fix" puede ser cualquier cosa. La etiqueta ordena la lista; el
 * criterio lo pone una persona (o una corrida de la tarea semanal) leyendo el diff.
 *
 * Por eso los rótulos dicen "probablemente" y hay una categoría "sin clasificar" que **no**
 * se resuelve adivinando: en la duda, cae ahí y alguien la mira.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const iCn = args.indexOf("--cn");
const iEstado = args.indexOf("--estado");

/* ---------------------------------------------------------------------------
 * Ubicar las cosas
 * ------------------------------------------------------------------------- */

/**
 * El repo de Córdoba Notebooks.
 *
 * El nombre de la carpeta usa **NFD** (`Co` + U+0301) y escribirlo literal ya causó pérdida
 * de archivos en el proyecto original, así que se busca por contenido y no por nombre. En
 * CI el repo se clona en una ruta plana y se pasa con `--cn`.
 */
function buscarCN() {
  if (iCn >= 0) return args[iCn + 1];
  if (process.env.CN_REPO) return process.env.CN_REPO;

  const proyectos = join(homedir(), "Claude", "Projects");
  if (!existsSync(proyectos)) return null;
  for (const d of readdirSync(proyectos)) {
    const candidato = join(proyectos, d, "Ecommerce y pagos", "reconstruccion-sin-woocommerce");
    if (existsSync(join(candidato, ".git"))) return candidato;
  }
  return null;
}

const RUTA_ESTADO =
  iEstado >= 0 ? args[iEstado + 1] : join(process.cwd(), "..", "paridad-estado.json");

function salirConError(mensaje, sugerencia) {
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: false, error: mensaje, sugerencia }, null, 2));
  } else {
    console.error(`\n\x1b[31m✗ ${mensaje}\x1b[0m`);
    if (sugerencia) console.error(`  ${sugerencia}\n`);
  }
  process.exit(2);
}

const CN = buscarCN();
if (!CN || !existsSync(join(CN, ".git"))) {
  salirConError(
    "No encontré el repositorio de Córdoba Notebooks.",
    "Pasalo con --cn <ruta> o seteá CN_REPO.",
  );
}
if (!existsSync(RUTA_ESTADO)) {
  salirConError(
    `No encontré ${RUTA_ESTADO}.`,
    "Es el archivo que guarda desde qué commit hay que mirar. Pasalo con --estado <ruta>.",
  );
}

const estado = JSON.parse(readFileSync(RUTA_ESTADO, "utf8"));
const BASE = estado?.ultimaRevision?.commitCN;
if (!BASE) salirConError("paridad-estado.json no tiene ultimaRevision.commitCN.");

/* ---------------------------------------------------------------------------
 * Git
 * ------------------------------------------------------------------------- */

const git = (...a) => execFileSync("git", ["-C", CN, ...a], { encoding: "utf8" }).trim();

let HEAD;
try {
  HEAD = git("rev-parse", "HEAD");
} catch {
  salirConError(`No pude leer el HEAD de ${CN}.`);
}

try {
  git("cat-file", "-e", `${BASE}^{commit}`);
} catch {
  salirConError(
    `El commit base ${BASE.slice(0, 8)} no existe en el repo de Córdoba Notebooks.`,
    "Puede que se haya reescrito la historia, o que el clon esté incompleto (en CI: fetch-depth: 0). " +
      "Si la historia cambió de verdad, poné a mano un commit válido en paridad-estado.json.",
  );
}

/** Sólo lo que puede afectarnos. El backend de comercio y el admin quedan afuera del diff. */
const RUTAS_QUE_MIRAMOS = ["storefront/", "scripts/"];

const crudo = git(
  "log",
  "--no-merges",
  "--format=%H%x1f%s%x1f%cI%x1f%an",
  `${BASE}..${HEAD}`,
  "--",
  ...RUTAS_QUE_MIRAMOS,
);

const commits = crudo
  ? crudo.split("\n").map((l) => {
      const [sha, asunto, fecha, autor] = l.split("\x1f");
      return { sha, corto: sha.slice(0, 8), asunto, fecha: fecha.slice(0, 10), autor };
    })
  : [];

/**
 * Los documentos de la carpeta padre que se tocaron.
 *
 * Suelen valer más que el diff: son las auditorías con el razonamiento, y es donde está
 * escrito *por qué* se hizo un cambio. Un commit de cinco líneas puede tener veinte páginas
 * de justificación al lado.
 */
const docsCrudo = git("log", "--no-merges", "--name-only", "--format=", `${BASE}..${HEAD}`, "--", "*.md");
const docs = [...new Set(docsCrudo.split("\n").map((l) => l.trim()).filter((l) => l && !l.includes("/")))].sort();

/* ---------------------------------------------------------------------------
 * Clasificación (ver el docblock: es una ayuda, no un veredicto)
 * ------------------------------------------------------------------------- */

const TRANSVERSAL = new RegExp(
  [
    // seguridad
    "seguridad|csp|cabecera|header|xss|inyec|rate.?limit|token|cookie|auth|secreto|permiso|rbac",
    "|explotable|vulnerab|hardening|filtrab|fuga",
    // SEO y LLMO
    "|seo|llmo|llms|schema|json-?ld|itemlist|canonical|sitemap|robots|meta|indexa|noindex|opengraph",
    "|buscador|crawler|googlebot|snippet|breadcrumb|migas|redirect|301|410",
    // UX y rendimiento
    "|mobile|movil|móvil|responsive|accesib|a11y|aria|lighthouse|performance|rendimiento",
    "|cache|caché|imagen|lcp|cls",
    // medición
    "|atribuc|utm",
  ].join(""),
  "i",
);

const COMERCIO =
  /checkout|carrito|pago|payment|brick|mercado ?pago|pedido|orden|envío|envio|stock|dux|hubspot|garant|factur|comprobante|remito|cupon|cupón|descuento|precio de costo|margen|medusa|admin|backend|cliente|customer|newsletter|email|correo/i;

function clasificar(asunto) {
  const t = TRANSVERSAL.test(asunto);
  const c = COMERCIO.test(asunto);
  // Cuando matchean las dos, gana transversal: un cambio de CSP en el checkout nos sirve,
  // y el costo de mirar de más es leer un diff.
  if (t) return "transversal";
  if (c) return "comercio";
  return "sin-clasificar";
}

for (const c of commits) c.categoria = clasificar(c.asunto);

const porCategoria = {
  transversal: commits.filter((c) => c.categoria === "transversal"),
  "sin-clasificar": commits.filter((c) => c.categoria === "sin-clasificar"),
  comercio: commits.filter((c) => c.categoria === "comercio"),
};

const paraRevisar = porCategoria.transversal.length + porCategoria["sin-clasificar"].length;

/* ---------------------------------------------------------------------------
 * Salida
 * ------------------------------------------------------------------------- */

const resumen = {
  ok: true,
  base: BASE,
  baseCorto: BASE.slice(0, 8),
  head: HEAD,
  headCorto: HEAD.slice(0, 8),
  desde: estado?.ultimaRevision?.fecha ?? null,
  total: commits.length,
  paraRevisar,
  conteo: {
    transversal: porCategoria.transversal.length,
    sinClasificar: porCategoria["sin-clasificar"].length,
    comercio: porCategoria.comercio.length,
  },
  docs,
  commits,
};

function lista(titulo, items, nota) {
  if (!items.length) return "";
  return (
    `\n### ${titulo} (${items.length})\n` +
    (nota ? `\n${nota}\n` : "") +
    "\n" +
    items.map((c) => `- \`${c.corto}\` ${c.asunto} — ${c.fecha}`).join("\n") +
    "\n"
  );
}

function markdown() {
  if (!resumen.total) {
    return (
      `Córdoba Notebooks no tocó \`storefront/\` ni \`scripts/\` desde la última revisión ` +
      `(\`${resumen.baseCorto}\`${resumen.desde ? `, del ${resumen.desde}` : ""}).\n\n` +
      `Nada que emparejar esta semana.\n`
    );
  }

  return (
    `**${resumen.total} revisiones** nuevas en Córdoba Notebooks desde \`${resumen.baseCorto}\`` +
    `${resumen.desde ? ` (${resumen.desde})` : ""} hasta \`${resumen.headCorto}\`.\n\n` +
    `De esas, **${paraRevisar} valen una mirada**.\n` +
    lista(
      "Probablemente transversal",
      porCategoria.transversal,
      "Seguridad, SEO/LLMO, mobile, performance o atribución. Es lo que suele aplicar tal cual.",
    ) +
    lista(
      "Sin clasificar",
      porCategoria["sin-clasificar"],
      "El asunto no alcanzó para ubicarlas. **En la duda van acá**, no se adivina.",
    ) +
    lista(
      "Probablemente de comercio",
      porCategoria.comercio,
      "Carrito, pagos, pedidos, stock, admin. Un indexador no vende: normalmente se descartan, " +
        "pero conviene pasar el ojo por si adentro hay un cambio transversal.",
    ) +
    (docs.length
      ? `\n### Documentos tocados (${docs.length})\n\n` +
        `Suelen valer más que el diff: ahí está el *por qué*.\n\n` +
        docs.map((d) => `- \`${d}\``).join("\n") +
        "\n"
      : "") +
    `\n---\n\n` +
    `**La clasificación es por palabras del asunto: ordena la lista, no decide.** ` +
    `El criterio lo pone una persona leyendo el diff.\n\n` +
    `Procedimiento: \`07-runbook-paridad-semanal.md\`. ` +
    `Al terminar, actualizá \`paridad-estado.json\` con \`${resumen.headCorto}\` y este aviso se cierra solo.\n`
  );
}

if (JSON_OUT) {
  console.log(JSON.stringify({ ...resumen, markdown: markdown() }, null, 2));
} else {
  console.log("\n" + markdown());
}

// Código 0 siempre que la comparación se pudo hacer. "Hay cosas nuevas" no es un error, y
// que este script falle el build por eso sería ruido semanal garantizado.
process.exit(0);
