import assert from "node:assert/strict";
import test from "node:test";
import { metaPrivada, metaRuta, recortar } from "../seo.ts";

test("recortar corta en el ultimo espacio, no a mitad de palabra", () => {
  // El bug literal del otro proyecto: la description del JSON-LD cortaba en el caracter 800
  // y salia partiendo palabras. Un snippet que termina en "con placa de vid" es un error
  // visible en el resultado de Google.
  const texto = "Notebook con placa de video dedicada y pantalla de alta frecuencia";
  const corto = recortar(texto, 30);
  assert.ok(corto.endsWith("…"));
  assert.ok(!/vid…$/.test(corto), `corto a mitad de palabra: ${corto}`);
  assert.ok(corto.length <= 31);
});

test("recortar deja pasar lo que ya entra, sin puntos suspensivos", () => {
  assert.equal(recortar("corto", 100), "corto");
});

test("recortar normaliza los espacios", () => {
  assert.equal(recortar("hola\n\n   mundo", 100), "hola mundo");
});

test("metaRuta pone el canonical de la ruta y no del layout", () => {
  const m = metaRuta("/notebooks", { title: "Notebooks" });
  assert.equal(m.alternates?.canonical, "/notebooks");
  assert.equal(m.title, "Notebooks");
  // El openGraph se arma con la misma ruta: no puede apuntar a otra pagina.
  assert.equal((m.openGraph as { url?: string }).url, "/notebooks");
});

test("metaRuta deja pisar el openGraph sin perder el canonical", () => {
  const m = metaRuta("/blog/x", { openGraph: { type: "article" } });
  assert.equal(m.alternates?.canonical, "/blog/x");
  assert.equal((m.openGraph as { type?: string }).type, "article");
});

test("metaPrivada es noindex pero follow", () => {
  // "No muestres esta pagina" y no "hace de cuenta que no existe": los links al catalogo
  // que hay adentro si hay que seguirlos.
  const m = metaPrivada("Mi cuenta");
  assert.deepEqual(m.robots, { index: false, follow: true });
});
