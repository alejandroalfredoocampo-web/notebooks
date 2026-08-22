#!/usr/bin/env node
/**
 * Corre toda la verificación del proyecto y devuelve un veredicto.
 *
 *   npm run probar                  # unitarios → tipos → build → servidor → humo/regresión/integración
 *   npm run probar -- --rapido      # sin build ni servidor: sólo unitarios y tipos
 *   npm run probar -- --url <URL>   # contra un sitio ya desplegado, sin levantar nada
 *
 * ## Por qué existe, si ya hay tres comandos sueltos
 *
 * Porque la pregunta que uno tiene es "¿anda todo?", y contestarla requería acordarse de
 * cuatro comandos y de que dos de ellos necesitan un servidor levantado **en modo
 * producción** — en `next dev` las cabeceras y el caché no se comportan igual, así que
 * probar contra el dev server da una respuesta que no es la que importa.
 *
 * Esto es lo que corre la revisión semanal de paridad (ver `07-runbook-paridad-semanal.md`).
 * Una tarea automática no puede depender de que alguien recuerde el orden.
 *
 * ## Las cinco etapas, y por qué en este orden
 *
 * Cada una es más cara que la anterior y sirve de filtro para la siguiente. Si los tipos no
 * compilan, no tiene sentido esperar tres minutos a un build que va a fallar por lo mismo.
 *
 *   1. Unitarios      — segundos, sin dependencias
 *   2. Tipos          — segundos
 *   3. Build          — minutos; es también la prueba de que las páginas se generan
 *   4. Chequeo        — cabeceras, CSP, indexación, SEO/LLMO, datos estructurados
 *   5. Humo/regresión/integración — el comportamiento real de las rutas
 *
 * Las etapas 4 y 5 corren contra un `next start` levantado por este script en un puerto
 * libre, y **se baja siempre**, incluso si algo falla en el medio.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:net";

const args = process.argv.slice(2);
const RAPIDO = args.includes("--rapido");
const iUrl = args.indexOf("--url");
const URL_EXTERNA = iUrl >= 0 ? args[iUrl + 1] : null;

const etapas = [];
let servidor = null;

function titulo(t) {
  console.log(`\n\x1b[1m\x1b[44m ${t} \x1b[0m`);
}

function correr(comando, argumentos, opciones = {}) {
  return new Promise((resolve) => {
    const p = spawn(comando, argumentos, { stdio: "inherit", shell: false, ...opciones });
    p.on("close", (codigo) => resolve(codigo ?? 1));
    p.on("error", () => resolve(1));
  });
}

async function etapa(nombre, fn) {
  titulo(nombre);
  const desde = Date.now();
  const codigo = await fn();
  const seg = ((Date.now() - desde) / 1000).toFixed(1);
  etapas.push({ nombre, ok: codigo === 0, seg });
  if (codigo !== 0) {
    console.log(`\n\x1b[31m✗ ${nombre} falló\x1b[0m`);
  }
  return codigo === 0;
}

/** Un puerto libre, para no chocar con un `next dev` que alguien tenga abierto. */
function puertoLibre() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function esperarQueLevante(url, timeoutMs = 90_000) {
  const hasta = Date.now() + timeoutMs;
  while (Date.now() < hasta) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (r.status < 500) return true;
    } catch {
      /* todavía no */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function bajarServidor() {
  if (!servidor) return;
  try {
    // El grupo entero: `next start` levanta hijos y matar sólo al padre deja el puerto tomado.
    process.kill(-servidor.pid, "SIGTERM");
  } catch {
    try {
      servidor.kill("SIGTERM");
    } catch {
      /* ya se fue */
    }
  }
  servidor = null;
}

// Pase lo que pase, el servidor se baja. Sin esto, un Ctrl-C en el medio deja un `next start`
// colgado con el puerto tomado, y el próximo intento falla por una razón que no es la real.
for (const senal of ["SIGINT", "SIGTERM", "exit"]) {
  process.on(senal, bajarServidor);
}

async function main() {
  console.log(`\n\x1b[1mVerificación completa\x1b[0m${RAPIDO ? " (modo rápido)" : ""}`);

  if (!(await etapa("1/5 · Tests unitarios", () =>
    correr("node", ["--test", "--experimental-strip-types", "src/lib/__tests__/*.test.ts"], { shell: true }),
  ))) return finalizar();

  if (!(await etapa("2/5 · Tipos", () => correr("npx", ["tsc", "--noEmit"])))) return finalizar();

  if (RAPIDO) {
    console.log("\n\x1b[90mModo rápido: se saltean el build y las pruebas contra el servidor.\x1b[0m");
    return finalizar();
  }

  let base = URL_EXTERNA;

  if (!base) {
    if (!(await etapa("3/5 · Build", () => correr("npx", ["next", "build"])))) return finalizar();

    titulo("Levantando el servidor de producción");
    const puerto = await puertoLibre();
    base = `http://127.0.0.1:${puerto}`;
    servidor = spawn("npx", ["next", "start", "-p", String(puerto)], {
      stdio: "ignore",
      detached: true, // grupo propio, para poder bajarlo entero
    });
    const arriba = await esperarQueLevante(base);
    if (!arriba) {
      etapas.push({ nombre: "Servidor", ok: false, seg: "—" });
      console.log("\x1b[31m✗ el servidor no levantó en 90s\x1b[0m");
      return finalizar();
    }
    console.log(`  servidor en ${base}`);
  } else {
    etapas.push({ nombre: "3/5 · Build", ok: true, seg: "—" });
    console.log(`\n\x1b[90mProbando contra ${base}: no se buildea ni se levanta nada.\x1b[0m`);
  }

  // Estas dos corren aunque la anterior falle: son informes, y saber que fallan las dos
  // cosas de una vez ahorra una vuelta entera.
  await etapa("4/5 · Chequeo de seguridad y SEO", () =>
    correr("node", ["scripts/chequear-sitio.mjs", base]),
  );
  await etapa("5/5 · Humo, regresión e integración", () =>
    correr("node", ["scripts/probar-integracion.mjs", base]),
  );

  return finalizar();
}

function finalizar() {
  bajarServidor();
  const fallaron = etapas.filter((e) => !e.ok);
  console.log(`\n\x1b[1mResumen\x1b[0m`);
  for (const e of etapas) {
    console.log(`  ${e.ok ? "\x1b[32m✓" : "\x1b[31m✗"}\x1b[0m ${e.nombre.padEnd(40)} ${e.seg}s`);
  }
  console.log(
    fallaron.length === 0
      ? "\n\x1b[32m\x1b[1mTodo verde.\x1b[0m\n"
      : `\n\x1b[31m\x1b[1m${fallaron.length} etapa(s) fallaron: ${fallaron.map((e) => e.nombre).join(", ")}\x1b[0m\n`,
  );
  process.exit(fallaron.length === 0 ? 0 : 1);
}

await main();
