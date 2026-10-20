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

test("la sesión firmada entra, y deja de entrar cuando vence", async () => {
  const { firmarSesionAdmin, sesionAdminValida, DURACION_SESION_ADMIN } = await import("../adminAuth.ts");
  const t0 = Date.UTC(2026, 8, 15, 12);
  const cookie = await firmarSesionAdmin("secreto-largo", t0);
  assert.equal(await sesionAdminValida(cookie, "secreto-largo", t0 + 1000), true);
  assert.equal(await sesionAdminValida(cookie, "secreto-largo", t0 + (DURACION_SESION_ADMIN - 5) * 1000), true);
  // Las 8 horas son del servidor: una cookie copiada no sirve después.
  assert.equal(await sesionAdminValida(cookie, "secreto-largo", t0 + (DURACION_SESION_ADMIN + 1) * 1000), false);
});

test("rotar el secreto cierra todas las sesiones", async () => {
  const { firmarSesionAdmin, sesionAdminValida } = await import("../adminAuth.ts");
  const cookie = await firmarSesionAdmin("viejo");
  assert.equal(await sesionAdminValida(cookie, "nuevo"), false);
});

test("no se fabrica una sesión: ni el token viejo, ni un vencimiento cambiado, ni una eterna", async () => {
  const { firmarSesionAdmin, sesionAdminValida } = await import("../adminAuth.ts");
  const ahora = Date.now();
  // El formato de antes (la cookie ERA el token) ya no entra.
  assert.equal(await sesionAdminValida("secreto", "secreto", ahora), false);
  const cookie = await firmarSesionAdmin("secreto", ahora);
  const [vence, firma] = cookie.split(".");
  assert.equal(await sesionAdminValida(`${Number(vence) + 3600}.${firma}`, "secreto", ahora), false);
  const eterna = await firmarSesionAdmin("secreto", ahora, 60 * 60 * 24 * 365);
  assert.equal(await sesionAdminValida(eterna, "secreto", ahora), false, "más larga que lo que emite el login");
  assert.equal(await sesionAdminValida("", "secreto", ahora), false);
  assert.equal(await sesionAdminValida(cookie, "", ahora), false);
});
