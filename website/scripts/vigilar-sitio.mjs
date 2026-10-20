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

/**
 * Piso del catálogo: cuántas fichas tiene que haber en el sitemap para que el sitio cuente
 * como sano.
 *
 * Córdoba Notebooks lo tiene desde el cutover y el 30/09 tuvo que **bajarlo** (4690ce3f):
 * estaba en 40 con 54 productos publicados, alguien pasó parte del catálogo a borrador,
 * quedaron 39 y el monitor mandó una falsa alarma crítica durante dos días — además de frenar
 * todo deploy. La lección es la del número: un piso pegado al valor real grita con un catálogo
 * normal. Lo que tiene que detectar es "la base volvió vacía o a medio sembrar", no una baja.
 * Por eso queda holgado y se puede pisar con `MINIMO_FICHAS`.
 */
export const MINIMO_FICHAS = Number(process.env.MINIMO_FICHAS || 10);

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

/**
 * La ficha: el único chequeo que distingue "el sitio carga" de "se puede hacer el click que
 * se factura".
 *
 * Es el port de la promoción de `storefront-ficha` a crítico que Córdoba Notebooks hizo el
 * 25/09 (6d6e33e8) después de que su ficha de producto estuviera **625 minutos en HTTP 500**
 * con la home sana: "una home sana con las fichas rotas es un sitio que no vende, y desde la
 * home no se nota". Acá es lo mismo con otra plata: el producto de este sitio es el click
 * saliente, y vive en la ficha. Hasta hoy el vigía mira `/` y `/notebooks` — las dos pueden
 * estar perfectas con todas las fichas en 500.
 *
 * La ficha sale del sitemap y no de una URL fija: un slug escrito a mano en este archivo se
 * rompe el día que ese modelo deja de estar, y el vigía gritaría por un modelo de menos.
 *
 * **Nunca pide `/salir/*`.** Se verifica que el link exista en el HTML, no se lo sigue:
 * seguirlo registraría un click facturable cada hora.
 */
async function chequearFicha(origen) {
  const t0 = Date.now();
  const ruta = "/sitemap.xml";
  try {
    const res = await fetch(new URL(ruta, origen), {
      headers: { "user-agent": "notebooks-vigia/1.0 (+monitor)" },
      signal: AbortSignal.timeout(30_000),
    });
    if (res.status !== 200) {
      return { ruta, ok: false, motivo: `el sitemap devolvió HTTP ${res.status}`, ms: Date.now() - t0 };
    }
    const xml = await res.text();
    const fichas = [...xml.matchAll(/<loc>([^<]*\/notebooks\/[^<]+\/[^<]+)<\/loc>/g)].map((m) => m[1]);
    if (fichas.length < MINIMO_FICHAS) {
      return {
        ruta,
        ok: false,
        motivo: `el sitemap tiene ${fichas.length} ficha(s), menos que el piso de ${MINIMO_FICHAS}`,
        ms: Date.now() - t0,
      };
    }

    const url = fichas[0];
    const f0 = Date.now();
    const resF = await fetch(url, {
      headers: { "user-agent": "notebooks-vigia/1.0 (+monitor)" },
      signal: AbortSignal.timeout(30_000),
    });
    const ruta2 = new URL(url).pathname;
    if (resF.status !== 200) {
      return { ruta: ruta2, ok: false, motivo: `HTTP ${resF.status}`, ms: Date.now() - f0 };
    }
    const html = await resF.text();
    // Un precio de verdad (seis dígitos o más con separadores) y el link que se factura.
    if (!/\$\s?[\d.]{6,}/.test(html)) {
      return { ruta: ruta2, ok: false, motivo: "200 sin ningún precio", ms: Date.now() - f0 };
    }
    if (!html.includes("/salir/")) {
      return { ruta: ruta2, ok: false, motivo: "200 sin ningún link de salida a la tienda", ms: Date.now() - f0 };
    }
    return { ruta: ruta2, ok: true, ms: Date.now() - f0 };
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
  resultados.push(await chequearFicha(origen));
  const ok = resultados.every((r) => r.ok);
  const diagnostico = ok ? null : await diagnosticar(resultados);
  console.log(
    JSON.stringify({ origen, ok, diagnostico, resultados: resultados.map(({ csp, ...r }) => r) }, null, 2),
  );
  process.exit(ok ? 0 : 1);
}
