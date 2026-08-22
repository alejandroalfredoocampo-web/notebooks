import assert from "node:assert/strict";
import test from "node:test";
import { clave, ipDelRequest, reintentarEn } from "../limites.ts";

test("la IP sale del header que pone el borde, no del que puede escribir el cliente", () => {
  const conCf = new Request("https://x/", {
    headers: { "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9, 1.2.3.4" },
  });
  assert.equal(ipDelRequest(conCf), "1.2.3.4", "cf-connecting-ip gana sobre x-forwarded-for");

  const soloXff = new Request("https://x/", { headers: { "x-forwarded-for": "9.9.9.9, 1.2.3.4" } });
  assert.equal(ipDelRequest(soloXff), "9.9.9.9", "el primer salto es lo mejor disponible");

  assert.equal(ipDelRequest(new Request("https://x/")), "sin-ip");
});

test("la ventana va adentro de la clave, asi que no hay que resetear nada", () => {
  const t0 = 1_700_000_000_000;
  const a = clave("alerta", "1.2.3.4", 3600, t0);
  const mismoRato = clave("alerta", "1.2.3.4", 3600, t0 + 60_000);
  const horaSiguiente = clave("alerta", "1.2.3.4", 3600, t0 + 3_600_000);
  assert.equal(a, mismoRato);
  assert.notEqual(a, horaSiguiente);
});

test("cada alcance cuenta por separado", () => {
  const t0 = 1_700_000_000_000;
  // Gastar el cupo de alertas no puede dejar a la misma IP sin poder pedir un presupuesto.
  assert.notEqual(clave("alerta", "1.2.3.4", 3600, t0), clave("corporativo", "1.2.3.4", 3600, t0));
});

test("reintentarEn nunca es cero", () => {
  // Un `Retry-After: 0` es un formulario reintentando en bucle contra una puerta cerrada.
  const justoEnElBorde = 1_700_000_000_000;
  assert.ok(reintentarEn(3600, justoEnElBorde) >= 1);
  assert.ok(reintentarEn(60, justoEnElBorde + 59_000) >= 1);
});
