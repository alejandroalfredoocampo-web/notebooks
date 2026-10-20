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
  assert.equal(limpio("{{ad.name}} - copia"), undefined);
  assert.equal(limpio("{keyword}"), undefined);
  assert.equal(limpio("[SITE_SOURCE_NAME]"), undefined);
  assert.equal(limpio("  "), undefined);
  assert.equal(limpio("black-friday"), "black-friday");
});

test("conserva nombres de campaña reales que llevan corchetes", () => {
  // La versión anterior descartaba todo valor que empezara con corchete o terminara con
  // corchete, así que se comía nombres buenos y los dejaba como "sin campaña". Se cambió
  // a propósito: lo que se descarta es la macro entera, no el corchete.
  assert.equal(limpio("[TOF] Notebooks"), "[TOF] Notebooks");
  assert.equal(limpio("Victus [video]"), "Victus [video]");
  assert.equal(limpio("G-4-2 // A: Problema distribuidor // Estatico"), "G-4-2 // A: Problema distribuidor // Estatico");
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

test("guarda el id de la campaña (utm_id), no sólo su nombre", () => {
  // Portado de Córdoba Notebooks (2046e18b): la plantilla de la agencia mandaba `utm_id` y el
  // toque lo tiraba. Acá el nombre de la campaña ya costó una rotura — los corchetes — y el id
  // es el único corte que sobrevive a que la renombren a mitad de mes.
  const t = toqueDeParametros(
    new URLSearchParams(
      "utm_source=facebook&utm_medium=paid_social&utm_campaign=Notebooks+gamer+octubre" +
        "&utm_id=120240609390170683&utm_content=Victus+%5Bvideo%5D&fbclid=IwAR0abc",
    ),
    null,
    "www.notebooks.com.ar",
    AHORA,
  );
  assert.equal(t?.campana_id, "120240609390170683");
  // Y no se mezcla con el nombre, que es el otro corte y sigue estando.
  assert.equal(t?.utm_campaign, "Notebooks gamer octubre");
  assert.equal(t?.utm_content, "Victus [video]");
  assert.equal(t?.click_plataforma, "meta");
});

test("un utm_id que es una macro sin resolver se descarta", () => {
  const t = toqueDeParametros(
    new URLSearchParams("utm_source=facebook&utm_id={{campaign.id}}"),
    null,
    "www.notebooks.com.ar",
    AHORA,
  );
  assert.equal(t?.campana_id, undefined);
});

test("el id de la campaña sobrevive al viaje por la cookie", () => {
  const t = toqueDeParametros(
    new URLSearchParams("utm_source=google&utm_id=22334455&gclid=abc"),
    null,
    "www.notebooks.com.ar",
    AHORA,
  );
  const g: Guardado = { primero: t!, ultimo: t! };
  assert.equal(decodificar(codificar(g)).primero?.campana_id, "22334455");
});

test("con todos los campos llenos, dos toques siguen lejos del techo de la cookie", () => {
  // El techo del navegador son 4 kB y lo que se pasa se descarta **sin avisar**. Es la prueba
  // que Córdoba Notebooks agregó al sumar campos, y la razón de las claves cortas.
  const toque = {
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_campaign: "Notebooks gamer octubre - [TOF] intereses tecnologia 25-45",
    utm_content: "Victus 15 [video] 1080x1920 v3",
    utm_term: "[TOF] Notebooks - intereses tecnologia 25-45",
    campana_id: "120240609390170683",
    click_id: "IwAR" + "a".repeat(190),
    click_plataforma: "meta" as const,
    referrer: "https://l.instagram.com",
    contacto: AHORA.toISOString(),
  };
  const valor = codificar({ primero: toque, ultimo: { ...toque, utm_content: "otra" } });
  assert.ok(valor.length < 1500, `la cookie mide ${valor.length} bytes`);
  assert.deepEqual(decodificar(valor).primero, toque);
});
