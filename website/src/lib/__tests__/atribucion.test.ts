import assert from "node:assert/strict";
import test from "node:test";
import {
  codificar,
  decodificar,
  fusionar,
  limpio,
  segundosRestantes,
  toqueDeParametros,
  ultimoToque,
  type Guardado,
} from "../atribucion.ts";

const AHORA = new Date("2026-08-22T12:00:00.000Z");

test("descarta plantillas de campaña sin resolver", () => {
  // El caso real: una campaña mal configurada manda el literal. Guardarlo mete en el
  // reporte una fila que parece una campaña y no es ninguna.
  assert.equal(limpio("{{campaign.name}}"), undefined);
  assert.equal(limpio("[campaign]"), undefined);
  assert.equal(limpio("  "), undefined);
  assert.equal(limpio("black-friday"), "black-friday");
});

test("del referrer guarda sólo el origen, y descarta el propio", () => {
  const t = toqueDeParametros(
    new URLSearchParams(),
    "https://www.google.com/search?q=notebook+barata+con+mi+nombre",
    "www.notebooks.com.ar",
    AHORA,
  );
  assert.equal(t?.referrer, "https://www.google.com");

  const interno = toqueDeParametros(
    new URLSearchParams(),
    "https://www.notebooks.com.ar/notebooks",
    "www.notebooks.com.ar",
    AHORA,
  );
  assert.equal(interno, null, "la navegación interna no es un toque");
});

test("reconoce los identificadores de click con su plataforma", () => {
  const t = toqueDeParametros(new URLSearchParams("fbclid=abc123"), null, "x", AHORA);
  assert.equal(t?.click_id, "abc123");
  assert.equal(t?.click_plataforma, "meta");
});

test("la cookie sobrevive el ida y vuelta, y descarta claves desconocidas", () => {
  const g: Guardado = {
    primero: { utm_source: "google", utm_campaign: "verano", contacto: AHORA.toISOString() },
    ultimo: { utm_source: "instagram", contacto: AHORA.toISOString() },
  };
  assert.deepEqual(decodificar(codificar(g)), g);

  // La cookie la puede editar el visitante: lo que no conocemos no se propaga a la base.
  const conBasura = Buffer.from(
    JSON.stringify({ p: { s: "google", xx: "inyectado" } }),
  ).toString("base64url");
  assert.deepEqual(decodificar(conBasura), { primero: { utm_source: "google" } });
});

test("una cookie corrupta no rompe: devuelve vacío", () => {
  assert.deepEqual(decodificar("no-es-base64-ni-json"), {});
  assert.deepEqual(decodificar(undefined), {});
});

test("el mismo origen repetido no reescribe la cookie", () => {
  const primero = toqueDeParametros(new URLSearchParams("utm_source=google"), null, "x", AHORA);
  const guardado = fusionar({}, primero, AHORA)!;
  assert.deepEqual(guardado.primero?.utm_source, "google");

  // Recargar la página con los mismos parámetros: no hay nada nuevo que guardar.
  const masTarde = new Date(AHORA.getTime() + 60_000);
  const repetido = toqueDeParametros(new URLSearchParams("utm_source=google"), null, "x", masTarde);
  assert.equal(fusionar(guardado, repetido, masTarde), null);
});

test("un origen distinto entra como último toque y conserva el primero", () => {
  const g = fusionar(
    {},
    toqueDeParametros(new URLSearchParams("utm_source=google"), null, "x", AHORA),
    AHORA,
  )!;
  const despues = new Date(AHORA.getTime() + 86_400_000);
  const g2 = fusionar(
    g,
    toqueDeParametros(new URLSearchParams("utm_source=instagram"), null, "x", despues),
    despues,
  )!;
  assert.equal(g2.primero?.utm_source, "google");
  assert.equal(g2.ultimo?.utm_source, "instagram");
  assert.equal(ultimoToque(g2)?.utm_source, "instagram");
});

test("la ventana se cuenta desde el primer contacto y no se renueva", () => {
  const g: Guardado = { primero: { utm_source: "google", contacto: AHORA.toISOString() } };
  const a30dias = new Date(AHORA.getTime() + 30 * 86_400_000);
  assert.equal(segundosRestantes(g, a30dias), 60 * 86_400);

  // Vencida: el toque nuevo pasa a ser el primero, no un último toque de una ventana muerta.
  const a91dias = new Date(AHORA.getTime() + 91 * 86_400_000);
  assert.equal(segundosRestantes(g, a91dias), 0);
  const renovado = fusionar(
    g,
    toqueDeParametros(new URLSearchParams("utm_source=instagram"), null, "x", a91dias),
    a91dias,
  )!;
  assert.equal(renovado.primero?.utm_source, "instagram");
  assert.equal(renovado.ultimo, undefined);
});

test("los valores se recortan: una URL armada a mano no llena la cookie", () => {
  const largo = "x".repeat(500);
  const t = toqueDeParametros(new URLSearchParams(`utm_campaign=${largo}`), null, "x", AHORA);
  assert.equal(t?.utm_campaign?.length, 120);
});
