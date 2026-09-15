import { test } from "node:test";
import assert from "node:assert/strict";
import { todasLasFilas as delScraper } from "../../../scrapers/lib.mjs";
import { todasLasFilas as delSitio } from "../paginado.ts";

type Resultado = { data: { id: number }[]; error: { message: string } | null };
type Traer = (consulta: unknown) => Promise<Resultado>;

// Hay dos copias (el scraper es JS y no importa del sitio). Se prueban las dos con los mismos
// casos, así no pueden divergir sin que se note.
/** Una tabla falsa que, como PostgREST, corta cada respuesta en `maxRows` sin avisar. */
function tabla(total: number, maxRows: number) {
  const filas = Array.from({ length: total }, (_, i) => ({ id: i }));
  let pedidos = 0;
  const consulta = async (desde: number, hasta: number) => {
    pedidos++;
    const data = filas.slice(desde, Math.min(hasta + 1, desde + maxRows));
    return { data, error: null, count: total };
  };
  return { consulta, pedidos: () => pedidos };
}

for (const [nombre, todasLasFilas] of [
  ["scraper", delScraper as unknown as Traer],
  ["sitio", delSitio as unknown as Traer],
] as const) {

  test(`[${nombre}] trae las 4.500 filas, no las primeras mil`, async () => {
    const t = tabla(4500, 1000);
    const { data, error } = await todasLasFilas(t.consulta);
    assert.equal(error, null);
    assert.equal(data.length, 4500);
    assert.equal(new Set(data.map((f: { id: number }) => f.id)).size, 4500, "sin repetidas");
  });

  test(`[${nombre}] con max-rows más bajo que la página, igual trae todo`, async () => {
    // Es el caso que un bucle "hasta que llegue una página corta" corta en la primera vuelta.
    const t = tabla(2300, 500);
    const { data } = await todasLasFilas(t.consulta);
    assert.equal(data.length, 2300);
  });

  test(`[${nombre}] una tabla vacía no entra en bucle`, async () => {
    const t = tabla(0, 1000);
    const { data } = await todasLasFilas(t.consulta);
    assert.equal(data.length, 0);
    assert.ok(t.pedidos() <= 1);
  });

  test(`[${nombre}] si la tabla se achica en el medio, es un error y no un resultado`, async () => {
    let vuelta = 0;
    const consulta = async (desde: number) => {
      vuelta++;
      return vuelta === 1
        ? { data: Array.from({ length: 1000 }, (_, i) => ({ id: desde + i })), error: null, count: 1500 }
        : { data: [], error: null, count: 1500 };
    };
    const { data, error } = await todasLasFilas(consulta);
    assert.equal(data, null);
    assert.match(error?.message ?? "", /incompleta: 1000 de 1500/);
  });

  test(`[${nombre}] un error de la base se devuelve tal cual`, async () => {
    const { data, error } = await todasLasFilas(async () => ({ data: null, error: { message: "boom" }, count: null }));
    assert.equal(data, null);
    assert.equal(error?.message, "boom");
  });
}
