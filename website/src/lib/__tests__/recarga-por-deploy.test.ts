import { test } from "node:test";
import assert from "node:assert/strict";
import { esErrorDeDeploy, recargarSiEsDeDeploy } from "../recarga-por-deploy.ts";

test("reconoce los errores de un archivo de deploy viejo, en Chrome y en Safari", () => {
  assert.equal(esErrorDeDeploy({ name: "ChunkLoadError", message: "Loading chunk 3888 failed." }), true);
  assert.equal(esErrorDeDeploy(new TypeError("Failed to fetch dynamically imported module: https://x/_next/static/chunks/a.js")), true);
  assert.equal(esErrorDeDeploy(new TypeError("Importing a module script failed.")), true);
  assert.equal(esErrorDeDeploy(new Error("Loading CSS chunk 12 failed")), true);
});

test("no confunde un error nuestro ni un corte de red común con un deploy", () => {
  assert.equal(esErrorDeDeploy(new TypeError("Cannot read properties of undefined (reading 'map')")), false);
  assert.equal(esErrorDeDeploy(new TypeError("Failed to fetch")), false);
  assert.equal(esErrorDeDeploy(new Error("Supabase: fetch failed")), false);
  assert.equal(esErrorDeDeploy(undefined), false);
});

/** Un `window` mínimo, para probar los frenos contra el bucle sin navegador. */
function conVentana(opts: { storage?: "anda" | "tira"; tipoNavegacion?: string }, fn: (recargas: () => number) => void) {
  const g = globalThis as Record<string, unknown>;
  const previo = { window: g.window, sessionStorage: g.sessionStorage, performance: g.performance };
  let n = 0;
  const memoria = new Map<string, string>();
  g.window = { location: { reload: () => { n++; }, pathname: "/notebooks/x/y" } };
  g.sessionStorage = {
    getItem: (k: string) => { if (opts.storage === "tira") throw new Error("SecurityError"); return memoria.get(k) ?? null; },
    setItem: (k: string, v: string) => { if (opts.storage === "tira") throw new Error("QuotaExceededError"); memoria.set(k, v); },
  };
  Object.defineProperty(globalThis, "performance", {
    configurable: true,
    value: { getEntriesByType: () => [{ type: opts.tipoNavegacion ?? "navigate" }] },
  });
  const warn = console.warn;
  console.warn = () => {};
  try {
    fn(() => n);
  } finally {
    console.warn = warn;
    g.window = previo.window;
    g.sessionStorage = previo.sessionStorage;
    Object.defineProperty(globalThis, "performance", { configurable: true, value: previo.performance });
  }
}

const CHUNK = { name: "ChunkLoadError", message: "Loading chunk 1 failed." };

test("recarga una vez y no dos dentro del minuto (freno principal)", () => {
  conVentana({ storage: "anda" }, (recargas) => {
    assert.equal(recargarSiEsDeDeploy(CHUNK), true);
    assert.equal(recargarSiEsDeDeploy(CHUNK), false);
    assert.equal(recargas(), 1);
  });
});

test("con storage andando, un pull-to-refresh previo no apaga la recarga", () => {
  conVentana({ storage: "anda", tipoNavegacion: "reload" }, (recargas) => {
    assert.equal(recargarSiEsDeDeploy(CHUNK), true);
    assert.equal(recargas(), 1);
  });
});

test("sin storage (Safari privado), no encadena una recarga sobre otra", () => {
  conVentana({ storage: "tira", tipoNavegacion: "reload" }, (recargas) => {
    assert.equal(recargarSiEsDeDeploy(CHUNK), false);
    assert.equal(recargas(), 0);
  });
  conVentana({ storage: "tira", tipoNavegacion: "navigate" }, (recargas) => {
    assert.equal(recargarSiEsDeDeploy(CHUNK), true);
    assert.equal(recargas(), 1);
  });
});

test("un error que no es de deploy no recarga nunca", () => {
  conVentana({ storage: "anda" }, (recargas) => {
    assert.equal(recargarSiEsDeDeploy(new Error("otra cosa")), false);
    assert.equal(recargas(), 0);
  });
});
