/**
 * Paginación de catálogos: los casos feos, sin red.
 *
 * Portado de Córdoba Notebooks (tandas 94 y 95, doc `141-catalogo-de-dux-a-medias.md`). Los dos
 * primeros casos de cada bloque son los que **se vieron en producción allá**: una página vacía
 * en el medio tomada como fin del catálogo (26/09: 200 ítems de 512, un pedido falló por un
 * producto que existía) y, con esa guarda ya puesta, el total declarado pisado por una página
 * sin `paging` (28/09: 450 de 512 y la guarda no saltó).
 *
 * El motivo de que `juntarPaginas` reciba el "pedí esta página" por parámetro es exactamente
 * poder escribir esto: la lección del doc 141 es que un bucle de paginación con un contador que
 * se puede pisar no se arregla mirándolo.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ErrorCatalogoIncompleto,
  juntarPaginas,
  totalDeclarado,
} from "../../../scrapers/lib.mjs";

/** Un catálogo de `n` ítems servido de a `paso`, con los huecos que se le pidan. */
function tienda(n: number, opciones: { vacias?: number[]; sinTotal?: number[]; cortas?: Record<number, number> } = {}) {
  const pedidas: number[] = [];
  return {
    pedidas,
    async pedirPagina(desde: number, paso: number) {
      pedidas.push(desde);
      const pagina = Math.floor(desde / paso);
      const total = opciones.sinTotal?.includes(pagina) ? null : n;
      if (opciones.vacias?.includes(pagina)) return { items: [], total };
      const corte = opciones.cortas?.[pagina];
      const hasta = Math.min(desde + (corte ?? paso), n);
      const items = Array.from({ length: Math.max(0, hasta - desde) }, (_, i) => ({ id: desde + i }));
      return { items, total };
    },
  };
}

test("el catálogo completo se junta entero", async () => {
  const t = tienda(120);
  const items = await juntarPaginas({ pedirPagina: t.pedirPagina, paso: 50, maxItems: 500 });
  assert.equal(items.length, 120);
  assert.deepEqual(t.pedidas, [0, 50, 100]);
});

test("una página vacía en el medio NO termina el catálogo (tanda 94)", async () => {
  // El caso del 26/09 en Córdoba Notebooks: antes la vacía cortaba el bucle, devolvía los 100
  // ítems que había juntado y la corrida seguía en verde. Ahora el offset sigue avanzando
  // hasta el total declarado — y como el hueco no se rellena, además tira.
  const t = tienda(512, { vacias: [2] });
  await assert.rejects(() => juntarPaginas({ pedirPagina: t.pedirPagina, paso: 50, maxItems: 600 }));
  assert.ok(t.pedidas.includes(150), "dejó de pedir páginas en el hueco");
  assert.ok(t.pedidas.includes(500), "no llegó al final del catálogo declarado");
});

test("si llegan menos ítems de los declarados, tira en vez de devolver el catálogo a medias", async () => {
  const t = tienda(512, { vacias: [2] });
  await assert.rejects(
    () => juntarPaginas({ pedirPagina: t.pedirPagina, paso: 50, maxItems: 600, etiqueta: "fravega" }),
    (e: Error) => {
      assert.ok(e instanceof ErrorCatalogoIncompleto);
      assert.match(e.message, /fravega: llegaron 462 de los 512/);
      return true;
    },
  );
});

test("el total declarado NO lo baja una página sin paging (tanda 95)", async () => {
  // El caso del 28/09: la última página venía sin `paging` y pisaba el total con su propio
  // tamaño, así que el control comparaba contra un número chico y pasaba de largo.
  const t = tienda(512, { vacias: [3], sinTotal: [10] });
  await assert.rejects(
    () => juntarPaginas({ pedirPagina: t.pedirPagina, paso: 50, maxItems: 600 }),
    ErrorCatalogoIncompleto,
  );
});

test("una página corta en el medio tampoco termina el catálogo", async () => {
  // El offset avanza 50 igual, así que antes quedaba un hueco en silencio.
  const t = tienda(512, { cortas: { 4: 30 } });
  await assert.rejects(
    () => juntarPaginas({ pedirPagina: t.pedirPagina, paso: 50, maxItems: 600 }),
    ErrorCatalogoIncompleto,
  );
  assert.ok(t.pedidas.includes(250), "cortó en la página corta");
});

test("una página corta al final cierra el catálogo sin tirar", async () => {
  const t = tienda(512);
  const items = await juntarPaginas({ pedirPagina: t.pedirPagina, paso: 50, maxItems: 600 });
  assert.equal(items.length, 512);
});

test("sin total declarado se confía en lo que llegó y una página vacía corta", async () => {
  // No hay con qué controlar; es el comportamiento de antes, a propósito.
  const t = tienda(120, { sinTotal: [0, 1, 2, 3] });
  const items = await juntarPaginas({ pedirPagina: t.pedirPagina, paso: 50, maxItems: 500 });
  assert.equal(items.length, 120);
});

test("el techo de maxItems no cuenta como catálogo incompleto", async () => {
  // La tienda tiene 512 y nosotros pedimos 100: no es un agujero, es nuestro tope.
  const t = tienda(512);
  const items = await juntarPaginas({ pedirPagina: t.pedirPagina, paso: 50, maxItems: 100 });
  assert.equal(items.length, 100);
});

test("un error de red en el medio se propaga y no deja el catálogo a medias", async () => {
  // Antes, en VTEX, esto hacía `break` y la corrida seguía en verde con el 30 % del catálogo.
  let pedidas = 0;
  await assert.rejects(
    () =>
      juntarPaginas({
        paso: 50,
        maxItems: 500,
        async pedirPagina(desde: number) {
          pedidas++;
          if (desde === 100) throw new Error("HTTP 503");
          return { items: Array.from({ length: 50 }, (_, i) => ({ id: desde + i })), total: 512 };
        },
      }),
    /HTTP 503/,
  );
  assert.equal(pedidas, 3);
});

test("totalDeclarado lee las cabeceras de VTEX y de WooCommerce", () => {
  const con = (h: Record<string, string>) => ({
    headers: { get: (k: string) => h[k.toLowerCase()] ?? null },
  });
  assert.equal(totalDeclarado(con({ resources: "0-49/512" })), 512);
  assert.equal(totalDeclarado(con({ "content-range": "resources 0-49/512" })), 512);
  assert.equal(totalDeclarado(con({ "x-wp-total": "512" })), 512);
  assert.equal(totalDeclarado(con({})), null);
  // Una cabecera que no se entiende es "no lo dijo", no cero: un cero haría pasar cualquier
  // catálogo como completo.
  assert.equal(totalDeclarado(con({ resources: "cualquier cosa" })), null);
});
