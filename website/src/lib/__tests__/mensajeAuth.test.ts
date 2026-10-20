import { test } from "node:test";
import assert from "node:assert/strict";
import { MENSAJE_GENERICO, mensajeDeAuth } from "../mensajeAuth.ts";

test("los errores conocidos salen en castellano", () => {
  assert.equal(mensajeDeAuth({ code: "invalid_credentials", message: "Invalid login credentials" }), "El email o la contraseña no coinciden.");
  assert.match(mensajeDeAuth({ code: "over_email_send_rate_limit" }), /en un rato/);
});

test("lo que cuenta la configuración del proyecto no llega a la pantalla", () => {
  for (const e of [
    { code: "signup_disabled", message: "Signups not allowed for this instance" },
    { code: "provider_disabled", message: "Unsupported provider: provider is not enabled" },
    new Error("fetch failed"),
    null,
    "texto",
  ]) {
    assert.equal(mensajeDeAuth(e), MENSAJE_GENERICO);
  }
});
