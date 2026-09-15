#!/usr/bin/env node
/**
 * Chequeo de frases que el copy del sitio no puede decir.
 *
 *   node scripts/chequear-copy.mjs            # revisa src/
 *   node scripts/chequear-copy.mjs --listar   # qué frases vigila y por qué
 *
 * Portado de Córdoba Notebooks (`scripts/chequear-copy.mjs`: 22d8e68f, 5a3132a4, c78fe3c2). Allá
 * nació porque un barrido a mano de "cuotas fijas" no alcanzó: mientras se hacía, otra sesión
 * escribió cuatro landings nuevas con la frase vieja. **El copy nuevo nace con la frase vieja y
 * no hay nada que avise.**
 *
 * ## Por qué acá
 *
 * El 15-sep el sitio decía "precios actualizados varias veces por día" en el header de todas las
 * páginas, en la home, en el footer, en `/tiendas` y en `llms.txt`. El scrape corre **una vez por
 * día**, y esa semana no corría. Se corrigió en seis lugares; esto es lo que evita que vuelva.
 *
 * Las reglas son las afirmaciones que un comparador no puede hacer: que vende, que garantiza un
 * precio ajeno, que envía, o que tiene un "mínimo histórico" cuando lo que tiene son 90 días.
 *
 * ## Lo que se trae tal cual de allá, y por qué
 *
 * - **Lee el árbol de trabajo**, no git: un archivo nuevo sin commitear también cuenta.
 * - **Los comentarios no cuentan.** Un docblock que explica por qué cambió una frase la nombra;
 *   un chequeo que la marque ahí falla para siempre, y un chequeo que siempre falla se ignora.
 * - **Busca sobre el archivo entero** y no línea por línea: en JSX el formateador parte la frase
 *   donde entra ("varias veces\n por día") y una búsqueda por línea no la ve.
 * - **Cero archivos revisados es una falla**, no un "todo bien".
 *
 * ## Lo que no ve
 *
 * El copy que vive en la base: los artículos del blog y los textos SEO de marca que se cargan
 * desde el admin. Eso se revisa a ojo cuando se edita.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);

/**
 * Las frases prohibidas. `porque` sale en el reporte: un aviso que dice qué se rompe se acata,
 * uno que sólo dice "no" se discute.
 */
const PROHIBIDAS = [
  {
    id: "frecuencia",
    re: /varias\s+veces\s+(?:por|al)\s+d[ií]a/gi,
    enLugarDe: "todos los días",
    porque: "scrape.yml corre una vez por día (cron 0 11 * * *). Si se agregan corridas, cambiar esta regla.",
  },
  {
    id: "vende",
    re: /agregar\s+al\s+carrito|comprar\s+ahora|finalizar\s+(?:la\s+)?compra/gi,
    enLugarDe: "Ir a la tienda",
    porque: "el sitio no vende: el CTA lleva a la tienda, que es lo que se factura.",
  },
  {
    id: "garantia-de-precio",
    re: /precio\s+(?:m[aá]s\s+bajo\s+)?garantizado|garantizamos\s+(?:el|que)/gi,
    enLugarDe: "el precio que vimos en la tienda, con la fecha",
    porque: "el precio es de un tercero y cambia sin avisarnos; no se puede garantizar.",
  },
  {
    id: "minimo-historico",
    re: /m[ií]nimo\s+hist[oó]rico/gi,
    enLugarDe: "mínimo en 90 días",
    porque: "el historial que se consulta es de 90 días (DIAS_HISTORIAL en lib/data.ts).",
  },
  {
    id: "envio",
    re: /env[ií]o\s+gratis/gi,
    enLugarDe: "lo que declare cada tienda",
    porque: "un comparador no envía nada; el envío es de cada tienda y no lo conocemos por publicación.",
  },
];

const AMBITOS = ["src"];
const EXTENSIONES = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
const IGNORAR = new Set(["node_modules", ".next", ".git", "__tests__"]);

/**
 * Saca comentarios y **conserva las posiciones**: cada caracter borrado se reemplaza por un
 * espacio y los saltos de línea se dejan intactos. Así el número de línea que se reporta es el
 * del archivo real y no hay que mapear nada.
 *
 * Las cadenas se dejan enteras, incluidos los template literals: ahí es justamente donde vive el
 * copy (`Pagá en ${enCuotas} cuotas sin interés.`). Y estando adentro de una cadena, un `//` no
 * abre comentario — que es el motivo por el que esto no puede ser un reemplazo con regex.
 */
function sinComentarios(src) {
  const out = Array.from(src);
  let i = 0;
  let estado = "codigo"; // codigo | linea | bloque | simple | doble | template
  const borrar = (n) => {
    if (out[n] !== "\n") out[n] = " ";
  };

  while (i < src.length) {
    const c = src[i];
    const sig = src[i + 1];

    if (estado === "codigo") {
      if (c === "/" && sig === "/") { estado = "linea"; borrar(i); borrar(i + 1); i += 2; continue; }
      if (c === "/" && sig === "*") { estado = "bloque"; borrar(i); borrar(i + 1); i += 2; continue; }
      if (c === "'") { estado = "simple"; i++; continue; }
      if (c === '"') { estado = "doble"; i++; continue; }
      if (c === "`") { estado = "template"; i++; continue; }
      i++;
      continue;
    }

    if (estado === "linea") {
      if (c === "\n") { estado = "codigo"; i++; continue; }
      borrar(i); i++; continue;
    }

    if (estado === "bloque") {
      if (c === "*" && sig === "/") { estado = "codigo"; borrar(i); borrar(i + 1); i += 2; continue; }
      borrar(i); i++; continue;
    }

    // Adentro de una cadena: sólo interesa saber dónde termina. El `\` escapa lo que sigue.
    if (c === "\\") { i += 2; continue; }
    if (estado === "simple" && c === "'") { estado = "codigo"; i++; continue; }
    if (estado === "doble" && c === '"') { estado = "codigo"; i++; continue; }
    if (estado === "template" && c === "`") { estado = "codigo"; i++; continue; }
    i++;
  }

  return out.join("");
}

function* archivos(dir) {
  let entradas;
  try {
    entradas = readdirSync(dir);
  } catch {
    return;
  }
  for (const e of entradas) {
    if (IGNORAR.has(e)) continue;
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) yield* archivos(p);
    else if (EXTENSIONES.some((x) => e.endsWith(x))) yield p;
  }
}

/**
 * El contexto que se muestra: la frase con lo que la rodea, para decidir sin abrir el archivo.
 *
 * Los saltos de línea se colapsan a espacios porque una coincidencia puede cruzar líneas (ver
 * `buscar`), y un contexto con saltos adentro se lee peor que la frase corrida.
 */
function contexto(texto, indice, largo) {
  const desde = Math.max(0, indice - 45);
  const hasta = Math.min(texto.length, indice + largo + 45);
  const trozo = texto.slice(desde, hasta).replace(/\s+/g, " ").trim();
  return `${desde > 0 ? "…" : ""}${trozo}${hasta < texto.length ? "…" : ""}`;
}

/**
 * Busca sobre el **archivo entero**, no línea por línea, y de ahí saca el número de línea.
 *
 * ## Por qué, y qué se rompía antes
 *
 * La primera versión partía en líneas y buscaba en cada una. Eso deja tres agujeros, y los tres
 * son el mismo: en JSX el texto lo envuelve el formateador donde entra, no donde termina la frase.
 *
 * 1. **Falso negativo, el peor.** `Pagá en 12 cuotas\n    fijas con Mercado Pago` no se detectaba:
 *    el `\s+` de la regla no cruza el corte cuando cada línea se mira sola. O sea que la frase
 *    prohibida pasaba justamente en el formato en que más probable es escribirla.
 * 2. **Falso positivo en la excepción**, por lo mismo del otro lado: `18 cuotas fijas\n en pesos`
 *    se marcaba, porque el `salvo` tampoco cruzaba el corte.
 * 3. Y un tercero de puntuación: `18 cuotas fijas, en pesos` se marcaba porque el separador de la
 *    excepción sólo aceptaba espacios.
 *
 * Los tres los cierra buscar sobre el texto completo. El costo es tener que mapear posición →
 * línea, que son las dos líneas de `lineaDe`.
 */
function buscar(texto, regla) {
  const permitidos = regla.salvo
    ? Array.from(
        texto.matchAll(new RegExp(regla.salvo.source, regla.salvo.flags)),
        (m) => [m.index ?? -1, (m.index ?? -1) + m[0].length],
      ).filter(([d]) => d >= 0)
    : [];

  // Offsets donde arranca cada línea, para traducir posición → número de línea.
  const arranques = [0];
  for (let i = 0; i < texto.length; i++) if (texto[i] === "\n") arranques.push(i + 1);
  const lineaDe = (pos) => {
    let lo = 0;
    let hi = arranques.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (arranques[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const salidas = [];
  // Se clona la regex: `matchAll` con `g` consume `lastIndex` y se saltearía coincidencias entre
  // archivos. Mismo motivo que en `revisar()` de redactar-ia.ts.
  for (const m of texto.matchAll(new RegExp(regla.re.source, regla.re.flags))) {
    if (m.index === undefined) continue;
    // Cae adentro de un tramo permitido: es la forma que acompaña, no la que sustituye.
    if (permitidos.some(([d, h]) => m.index >= d && m.index + m[0].length <= h)) continue;
    salidas.push({
      linea: lineaDe(m.index),
      frase: m[0].replace(/\s+/g, " ").trim(),
      contexto: contexto(texto, m.index, m[0].length),
    });
  }
  return salidas;
}

if (argv.includes("--listar")) {
  console.log("Frases que este chequeo no deja pasar al copy:\n");
  for (const p of PROHIBIDAS) {
    console.log(`  ${p.re.source}\n    en lugar de: ${p.enLugarDe}\n    porque: ${p.porque}\n`);
  }
  process.exit(0);
}

const hallazgos = [];
let revisados = 0;
for (const base of AMBITOS) {
  for (const abs of archivos(join(RAIZ, base))) {
    revisados++;
    const rel = relative(RAIZ, abs).split(sep).join("/");
    const texto = sinComentarios(readFileSync(abs, "utf8"));
    for (const regla of PROHIBIDAS) {
      for (const h of buscar(texto, regla)) hallazgos.push({ archivo: rel, regla, ...h });
    }
  }
}

if (revisados === 0) {
  console.error(`✗ No revisé ningún archivo. Ámbitos: ${AMBITOS.join(", ")}.`);
  process.exit(1);
}
if (!hallazgos.length) {
  console.log(`${revisados} archivos revisados, sin frases prohibidas en el copy.`);
  process.exit(0);
}
console.error(`✗ ${hallazgos.length} frase(s) prohibida(s) en el copy, sobre ${revisados} archivos:\n`);
for (const h of hallazgos) {
  console.error(`  ${h.archivo}:${h.linea}  «${h.frase}»`);
  console.error(`    ${h.contexto}`);
  console.error(`    → poner «${h.regla.enLugarDe}»: ${h.regla.porque}\n`);
}
console.error("Los comentarios no cuentan: si la frase está ahí para explicar un cambio, no la marca.");
process.exit(1);
