import assert from "node:assert/strict";
import test from "node:test";
import { igualEnTiempoConstante } from "../adminAuth.ts";

test("compara en tiempo constante y sin sorpresas", async () => {
  assert.equal(await igualEnTiempoConstante("secreto", "secreto"), true);
  assert.equal(await igualEnTiempoConstante("secreto", "secretO"), false);
  assert.equal(await igualEnTiempoConstante("secreto", "secreto "), false);
});

test("un valor vacio nunca iguala", async () => {
  // Es la guarda que importa: sin ella, un entorno sin ADMIN_SESSION_TOKEN
  // (que es "") daria por buena una cookie vacia — o sea, cualquiera.
  assert.equal(await igualEnTiempoConstante("", ""), false);
  assert.equal(await igualEnTiempoConstante("", "secreto"), false);
  assert.equal(await igualEnTiempoConstante("secreto", ""), false);
});

test("largos distintos no rompen la comparacion", async () => {
  // Se comparan los hashes, no los valores, asi que la duracion tampoco depende
  // del largo de la entrada.
  assert.equal(await igualEnTiempoConstante("a", "a".repeat(10_000)), false);
});
