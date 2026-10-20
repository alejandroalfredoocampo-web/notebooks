import { test } from "node:test";
import assert from "node:assert/strict";
import { filasDeSpecs, resumenDeSpecs, sinInventar } from "../specs.ts";
import type { NotebookModel } from "../types.ts";

const FILA_AUTO = {
  id: "x", source: "auto", ram_type: "DDR4", storage_type: "SSD", screen_size_in: "15.6",
  screen_resolution: "1920x1080 (FHD)", screen_panel: "IPS", screen_refresh_hz: 60,
  os: "Windows 11 Home", weight_kg: 0, battery_wh: 0, release_year: 2026,
};

test("un modelo automático pierde los valores de relleno", () => {
  const r = sinInventar(FILA_AUTO);
  for (const col of ["ram_type", "storage_type", "screen_size_in", "screen_resolution", "screen_panel", "screen_refresh_hz", "os", "weight_kg", "battery_wh", "release_year"]) {
    assert.equal(r[col as keyof typeof r], null, col);
  }
});

test("un modelo automático corregido a mano conserva lo corregido", () => {
  const r = sinInventar({ ...FILA_AUTO, screen_size_in: 14, screen_panel: "OLED", os: "macOS" });
  assert.equal(r.screen_size_in, 14);
  assert.equal(r.screen_panel, "OLED");
  assert.equal(r.os, "macOS");
  assert.equal(r.ram_type, null);
});

test("un modelo cargado a mano o de semilla no se toca", () => {
  for (const source of ["manual", "seed", undefined]) {
    assert.deepEqual(sinInventar({ ...FILA_AUTO, source }), { ...FILA_AUTO, source });
  }
});

const base: NotebookModel = {
  id: "m", brand: "Lenovo", brandSlug: "lenovo", name: "IdeaPad", slug: "ideapad", partNumber: "",
  cpu: "Core i5 1335U", cpuFamily: "i5", ramGb: 16, ramType: "", storageGb: 512, storageType: "",
  screenSizeIn: 0, screenResolution: "", screenPanel: "", screenRefreshHz: 0, gpu: "Intel Iris Xe",
  gpuType: "integrada", os: "", weightKg: 0, batteryWh: 0, releaseYear: 0, useCases: [],
};

test("la tabla no muestra 0 kg, 0 Wh ni una pantalla vacía", () => {
  const filas = Object.fromEntries(filasDeSpecs(base));
  assert.deepEqual(Object.keys(filas), ["Procesador", "Memoria RAM", "Almacenamiento", "Placa de video"]);
  assert.equal(filas["Memoria RAM"], "16 GB");
  assert.equal(filas["Almacenamiento"], "512 GB");
});

test("con datos completos, la tabla los muestra todos", () => {
  const filas = Object.fromEntries(
    filasDeSpecs({ ...base, ramType: "DDR5", storageGb: 1000, storageType: "SSD", screenSizeIn: 14, screenResolution: "2880x1800", screenPanel: "OLED", screenRefreshHz: 90, os: "Windows 11", weightKg: 1.4, batteryWh: 75, partNumber: "83DR0001AR" }),
  );
  assert.equal(filas["Pantalla"], '14" 2880x1800 OLED 90 Hz');
  assert.equal(filas["Almacenamiento"], "1 TB SSD");
  assert.equal(filas["Peso"], "1.4 kg");
  assert.equal(filas["Part number"], "83DR0001AR");
});

test("el resumen no dice 'GB SSD' si no sabe el tipo, ni '0 GB RAM'", () => {
  assert.equal(resumenDeSpecs(base), "Core i5 1335U, 16 GB RAM, 512 GB");
  assert.equal(resumenDeSpecs({ ...base, ramGb: 0, storageGb: 0 }), "Core i5 1335U");
});

test("mpn: sólo si parece un número de parte y una tienda lo muestra", async () => {
  const { mpnVerificable } = await import("../specs.ts");
  const titulos = ["Notebook Lenovo IdeaPad Slim 3 82X70055AR 15.6 i5 16GB"];
  assert.equal(mpnVerificable("82X70055AR", titulos), "82X70055AR");
  assert.equal(mpnVerificable("82x7-0055ar", titulos), "82x7-0055ar", "ignora mayúsculas y separadores");
  assert.equal(mpnVerificable("16T-AH000", titulos), null, "una serie que ninguna tienda muestra");
  assert.equal(mpnVerificable("ABCD", ["ABCD"]), null, "sin dígitos no es un número de parte");
  assert.equal(mpnVerificable("con espacio 1", ["con espacio 1"]), null);
  assert.equal(mpnVerificable("", titulos), null);
  assert.equal(mpnVerificable(undefined, titulos), null);
});

test("oferta vigente: hasta 7 días desde que se vio, y nunca sin fecha", async () => {
  const { ofertaVigente } = await import("../specs.ts");
  const ahora = Date.UTC(2026, 8, 15);
  const dia = 24 * 60 * 60 * 1000;
  assert.equal(ofertaVigente(new Date(ahora - 2 * dia).toISOString(), ahora), true);
  assert.equal(ofertaVigente(new Date(ahora - 7 * dia).toISOString(), ahora), true);
  assert.equal(ofertaVigente(new Date(ahora - 8 * dia).toISOString(), ahora), false);
  assert.equal(ofertaVigente(new Date(0).toISOString(), ahora), false, "el 1970 de mapListing");
  assert.equal(ofertaVigente("", ahora), false);
});
