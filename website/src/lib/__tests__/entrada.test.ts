import assert from "node:assert/strict";
import test from "node:test";
import { entero, esEmail, email, leerJson, texto, urlHttp, MAX_CUERPO } from "../entrada.ts";

test("la validacion de email rechaza lo que includes('@') dejaba pasar", () => {
  // Esto es exactamente lo que aceptaba la version anterior en los cinco endpoints.
  assert.equal(esEmail("@"), false);
  assert.equal(esEmail("a@b"), false, "sin punto en el dominio no hay entrega posible");
  assert.equal(esEmail("hola mundo@x.com"), false);
  assert.equal(esEmail("a@@b.com"), false);
  assert.equal(esEmail(""), false);
  assert.equal(esEmail("x".repeat(300) + "@x.com"), false);

  assert.equal(esEmail("ana@notebooks.com.ar"), true);
  assert.equal(esEmail("ana.perez+alertas@gmail.com"), true);
});

test("el email se guarda en minusculas", () => {
  // Sin esto, el unique(email, model_id) de model_notify no sirve: Ana@x.com y ana@x.com
  // son dos filas y la persona recibe el aviso dos veces.
  assert.equal(email("  Ana@Gmail.COM "), "ana@gmail.com");
});

test("texto saca caracteres de control y recorta", () => {
  // El byte nulo lo rechaza PostgreSQL con un error que llega como 500 sin explicacion.
  assert.equal(texto("hola\u0000mundo", 100), "holamundo");
  assert.equal(texto("linea\u001Frota", 100), "linearota");
  assert.equal(texto("a".repeat(50), 10), "a".repeat(10));
  assert.equal(texto(null, 10), "");
  assert.equal(texto(undefined, 10), "");
});

test("urlHttp rechaza esquemas que son XSS almacenado", () => {
  // Estas columnas se renderizan como href en la bandeja del admin, o sea en una sesion
  // con permisos sobre el catalogo entero.
  assert.equal(urlHttp("javascript:alert(1)"), null);
  assert.equal(urlHttp("data:text/html,<script>x</script>"), null);
  assert.equal(urlHttp("vbscript:msgbox"), null);
  assert.equal(urlHttp("no es una url"), null);
  assert.equal(urlHttp(""), null);

  assert.equal(urlHttp("https://mitienda.com.ar/"), "https://mitienda.com.ar/");
  assert.equal(urlHttp("http://mitienda.com.ar"), "http://mitienda.com.ar/");
});

test("entero acota al rango en vez de confiar", () => {
  assert.equal(entero("5", 1, 10), 5);
  assert.equal(entero(5.7, 1, 10), 6);
  assert.equal(entero(0, 1, 10), null);
  assert.equal(entero(11, 1, 10), null);
  assert.equal(entero("hola", 1, 10), null);
  assert.equal(entero(Infinity, 1, 10), null);
});

test("leerJson descarta un cuerpo que se pasa del tope", async () => {
  const grande = JSON.stringify({ m: "x".repeat(MAX_CUERPO) });
  const req = new Request("https://x/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: grande,
  });
  assert.equal(await leerJson(req), null);
});

test("leerJson rechaza lo que no es un objeto", async () => {
  const arreglo = new Request("https://x/", { method: "POST", body: "[1,2,3]" });
  assert.equal(await leerJson(arreglo), null);
  const roto = new Request("https://x/", { method: "POST", body: "{no json" });
  assert.equal(await leerJson(roto), null);
});
