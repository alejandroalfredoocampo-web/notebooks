import { test } from "node:test";
import assert from "node:assert/strict";
import { conQuery } from "../conservarQuery.ts";

test("conserva utm, gclid y parámetros repetidos", () => {
  assert.equal(
    conQuery("/notebooks", { utm_source: "google", gclid: "G1", ram: ["16", "32"] }),
    "/notebooks?utm_source=google&gclid=G1&ram=16&ram=32",
  );
});

test("sin query, el destino queda igual", () => {
  assert.equal(conQuery("/notebooks", {}), "/notebooks");
  assert.equal(conQuery("/notebooks", { x: undefined }), "/notebooks");
});

test("se suma a un destino que ya tiene query, y respeta las exclusiones", () => {
  assert.equal(conQuery("/notebooks?brand=hp", { utm_source: "x", brand: "lenovo" }, ["brand"]), "/notebooks?brand=hp&utm_source=x");
});

test("escapa lo que llega", () => {
  assert.equal(conQuery("/x", { q: "a&b=c" }), "/x?q=a%26b%3Dc");
});
