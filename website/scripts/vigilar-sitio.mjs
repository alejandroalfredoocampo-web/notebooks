#!/usr/bin/env node
/**
 * ¿El sitio está vivo? Para el vigía horario (`.github/workflows/vigilar.yml`).
 *
 *   node scripts/vigilar-sitio.mjs https://notebooks-tan.vercel.app
 *
 * ## Por qué existe
 *
 * El 15-sep el sitio llevaba un tiempo indeterminado devolviendo 500 en toda página que lee la
 * base, y nadie lo sabía: no había nada mirando. La verificación semanal corre los lunes y su
 * paso contra producción es `continue-on-error`. Córdoba Notebooks tiene un monitor desde el
 * cutover, y lo que aprendió con él en septiembre (8ea0c9b6, doc 119) está acá:
 *
 *  - **Un 200 no es "vivo".** Next puede devolver 200 con la pantalla de error adentro. Se
 *    exige un marcador que sólo existe si la página se dibujó con datos.
 *  - **Una falla sola no es una caída.** Se confirma con un segundo intento antes de avisar
 *    (allá, `UMBRAL_FALLAS = 2`); lo hace el workflow, que corre esto dos veces.
 *  - **El aviso tiene que decir la causa probable.** Si el host de Supabase no resuelve, lo
 *    dice: es la diferencia entre "mirá Vercel" y "mirá Supabase".
 *  - **Sin secretos.** Lo único que necesita es la URL pública. Así sobrevive a la próxima
 *    migración de cuenta, que es exactamente lo que dejó a los otros cuatro workflows sin
 *    secretos el 8-sep.
 *
 * Nunca pide `/salir/*`: registraría un click.
 *
 * Sale con 0 si todo anda y con 1 si no. Escribe un JSON en stdout con el detalle.
 */
import { resolve4 } from "node:dns/promises";
import { pathToFileURL } from "node:url";

/**
 * Los marcadores. Viven **acá y sólo acá**: Córdoba Notebooks tuvo dos rollbacks porque el
 * marcador de la home estaba copiado en cuatro lugares y se cambió en uno (doc 101 §6.1).
 * `probar-integracion.mjs` importa esta misma lista para verificar que siguen existiendo.
 */
export const CHEQUEOS = [
  // La home lee el catálogo entero: si dibuja la sección de ofertas, la base respondió.
  { ruta: "/", marcador: "Bajaron de precio" },
  // El listado es el camino a las fichas, que es donde está el click que se factura.
  { ruta: "/notebooks", marcador: 'data-listado="catalogo"' },
];

async function chequear(origen, { ruta, marcador }) {
  const t0 = Date.now();
  try {
    const res = await fetch(new URL(ruta, origen), {
      redirect: "follow",
      headers: { "user-agent": "notebooks-vigia/1.0 (+monitor)" },
      signal: AbortSignal.timeout(30_000),
    });
    const texto = await res.text();
    const ms = Date.now() - t0;
    if (res.status !== 200) return { ruta, ok: false, motivo: `HTTP ${res.status}`, ms, csp: res.headers.get("content-security-policy") ?? res.headers.get("content-security-policy-report-only") };
    if (!texto.includes(marcador)) return { ruta, ok: false, motivo: `200 sin el marcador "${marcador}"`, ms };
    return { ruta, ok: true, ms };
  } catch (e) {
    return { ruta, ok: false, motivo: `sin respuesta: ${e.cause?.code ?? e.name ?? e.message}`, ms: Date.now() - t0 };
  }
}

/** Si el origen de Supabase que declara la CSP no resuelve, es la causa más probable. */
async function diagnosticar(resultados) {
  const csp = resultados.map((r) => r.csp).find(Boolean) ?? "";
  const host = /https:\/\/([a-z0-9]+\.supabase\.co)/.exec(csp)?.[1];
  if (!host) return null;
  try {
    await resolve4(host);
    return `${host} resuelve: la base existe; mirar los logs de Vercel`;
  } catch (e) {
    return `${host} NO resuelve (${e.code}): el proyecto de Supabase está pausado, borrado o cambió de URL`;
  }
}

const esScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (esScript) {
  const origen = process.argv[2];
  if (!origen) {
    console.error("Uso: node scripts/vigilar-sitio.mjs <origen>");
    process.exit(2);
  }
  const resultados = [];
  for (const c of CHEQUEOS) resultados.push(await chequear(origen, c));
  const ok = resultados.every((r) => r.ok);
  const diagnostico = ok ? null : await diagnosticar(resultados);
  console.log(
    JSON.stringify({ origen, ok, diagnostico, resultados: resultados.map(({ csp, ...r }) => r) }, null, 2),
  );
  process.exit(ok ? 0 : 1);
}
