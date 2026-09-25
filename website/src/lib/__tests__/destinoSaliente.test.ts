import assert from "node:assert/strict";
import test from "node:test";
import { destinoSaliente, dominioRegistrable, filtrarPorDominio } from "../destinoSaliente.ts";

test("el dominio registrable de un .com.ar son tres etiquetas", () => {
  // Con la regla de dos, `fravega.com.ar` y `cualquiera.com.ar` darían `com.ar` los dos y la
  // comparación aceptaría cualquier dominio argentino.
  assert.equal(dominioRegistrable("www.fravega.com.ar"), "fravega.com.ar");
  assert.equal(dominioRegistrable("fravega.com.ar"), "fravega.com.ar");
  assert.equal(dominioRegistrable("www.fravega.com"), "fravega.com");
  assert.equal(dominioRegistrable("tienda.maxtecno.com.ar"), "maxtecno.com.ar");
  assert.equal(dominioRegistrable("WWW.Venex.COM.AR"), "venex.com.ar");
});

test("deja pasar el destino de la tienda, con o sin www", () => {
  const r = destinoSaliente("https://www.fravega.com/p/notebook-x/", "https://www.fravega.com");
  assert.deepEqual(r, { ok: true, url: "https://www.fravega.com/p/notebook-x/" });

  const sinWww = destinoSaliente("https://cordobanotebooks.com.ar/producto/x", "https://www.cordobanotebooks.com.ar");
  assert.equal(sinWww.ok, true, "www y apex son la misma tienda");

  const subdominio = destinoSaliente("https://tienda.maxtecno.com.ar/x", "https://maxtecno.com.ar");
  assert.equal(subdominio.ok, true, "un subdominio del mismo dominio sigue siendo la tienda");
});

test("frena el destino a otro dominio, que es el open redirect", () => {
  // El caso que importa: la URL la escribe el servidor de la tienda (p.permalink de
  // WooCommerce, p.link de VTEX). Si esa tienda publica un producto que apunta a otro lado,
  // sin esto lo repetimos nosotros, con nuestro dominio adelante.
  const r = destinoSaliente("https://sitio-de-phishing.example/pago", "https://www.fravega.com");
  assert.deepEqual(r, { ok: false, motivo: "otro-dominio" });

  // Y no alcanza con que el dominio ajeno *contenga* el nombre de la tienda.
  assert.deepEqual(
    destinoSaliente("https://fravega.com.evil.example/p/x", "https://www.fravega.com"),
    { ok: false, motivo: "otro-dominio" },
  );
  assert.deepEqual(
    destinoSaliente("https://otra-tienda.com.ar/p/x", "https://www.fravega.com.ar"),
    { ok: false, motivo: "otro-dominio" },
  );
});

test("sigue frenando los esquemas que no son http", () => {
  assert.deepEqual(destinoSaliente("javascript:alert(1)", "https://x.com"), { ok: false, motivo: "esquema" });
  assert.deepEqual(destinoSaliente("data:text/html,<script>", "https://x.com"), { ok: false, motivo: "esquema" });
  assert.deepEqual(destinoSaliente("no es una url", "https://x.com"), { ok: false, motivo: "esquema" });
  assert.deepEqual(destinoSaliente("", "https://x.com"), { ok: false, motivo: "vacia" });
});

test("una tienda sin url no deja de recibir sus clicks", () => {
  // No hay contra qué comparar. Se valida el esquema, que es lo que había antes: una fila de
  // `stores` sin perfil no es motivo para cortarle el tráfico que ya recibía.
  assert.equal(destinoSaliente("https://loquesea.com/p/x", null).ok, true);
  assert.equal(destinoSaliente("https://loquesea.com/p/x", "no es una url").ok, true);
  assert.deepEqual(destinoSaliente("javascript:alert(1)", null), { ok: false, motivo: "esquema" });
});

test("el scrape descarta la publicación que apunta fuera de su fuente", () => {
  const listings = [
    { id: "a", url: "https://www.fravega.com/p/notebook-1/" },
    { id: "b", url: "https://fravega.com/p/notebook-2/" },
    { id: "c", url: "https://sitio-de-phishing.example/pago" },
    { id: "d", url: "no es una url" },
  ];
  const { buenas, descartadas } = filtrarPorDominio(listings, "https://www.fravega.com");
  assert.deepEqual(buenas.map((l) => l.id), ["a", "b"]);
  assert.deepEqual(descartadas.map((l) => l.id), ["c", "d"]);
});

test("una fuente sin base no filtra nada", () => {
  // Este filtro no es el lugar donde se descubre que falta una configuración: si no hay
  // contra qué comparar, no se tira el catálogo de una tienda entera.
  const listings = [{ id: "a", url: "https://loquesea.example/x" }];
  assert.deepEqual(filtrarPorDominio(listings, null), { buenas: listings, descartadas: [] });
  assert.deepEqual(filtrarPorDominio(listings, "no es una url"), { buenas: listings, descartadas: [] });
});
