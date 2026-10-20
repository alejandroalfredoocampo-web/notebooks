import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { tokenDeBajaValido, unsubToken } from "../unsubToken.ts";

function conSecreto<T>(valor: string | undefined, fn: () => T): T {
  const previo = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (valor === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = valor;
  const err = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = err;
    if (previo === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previo;
  }
}

test("con el secreto, el token del worker valida y uno cambiado no", () => {
  conSecreto("secreto-de-prueba", () => {
    const t = unsubToken(42)!;
    assert.equal(tokenDeBajaValido("42", t), true);
    assert.equal(tokenDeBajaValido("43", t), false);
    assert.equal(tokenDeBajaValido("42", t.slice(0, 15) + (t[15] === "0" ? "1" : "0")), false);
    assert.equal(tokenDeBajaValido("42", t + "0"), false);
  });
});

test("sin el secreto no valida nada, ni siquiera el HMAC con clave vacía", () => {
  // Es exactamente lo que cualquiera podía calcular antes: la clave era "".
  const conClaveVacia = crypto.createHmac("sha256", "").update("alert:42").digest("hex").slice(0, 16);
  conSecreto(undefined, () => {
    assert.equal(unsubToken(42), null);
    assert.equal(tokenDeBajaValido("42", conClaveVacia), false);
  });
  conSecreto("", () => {
    assert.equal(tokenDeBajaValido("42", conClaveVacia), false);
  });
});

test("sin id o sin token, falso", () => {
  conSecreto("s", () => {
    assert.equal(tokenDeBajaValido(undefined, "x"), false);
    assert.equal(tokenDeBajaValido("1", undefined), false);
  });
});
