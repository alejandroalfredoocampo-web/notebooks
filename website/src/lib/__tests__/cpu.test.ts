import { test } from "node:test";
import assert from "node:assert/strict";
import { ETIQUETAS_CPU, familiaDeCpu } from "../../../scrapers/cpu.mjs";

test("cada nomenclatura cae en su familia", () => {
  const casos: [string, string | null][] = [
    ["Notebook Lenovo IdeaPad Intel Core Ultra 7 155H 16GB", "ultra7"],
    ["ASUS Vivobook Core Ultra 5 125U", "ultra5"],
    ["Intel Core Ultra 9 185H", "ultra9"],
    ["HP 15 Intel Core i5-1335U 8GB 512GB", "i5"],
    ["Dell Inspiron Intel Core 7 150U", "i7"],
    ["Lenovo V15 Core 5 120U", "i5"],
    ["Acer Aspire i3 N305", "i3"],
    ["Notebook AMD Ryzen 5 7520U", "ryzen5"],
    ["Ryzen 9 8945HS", "ryzen9"],
    ["Ryzen 3 7320U", "ryzen3"],
    ["MacBook Air M3 13", "apple-m"],
    ["Notebook Celeron N4020 4GB", "intel-n"],
    ["Exo Smart Intel N100", "intel-n"],
    ["Mochila para notebook", null],
  ];
  for (const [texto, esperado] of casos) assert.equal(familiaDeCpu(texto), esperado, texto);
});

test("toda familia que se produce tiene etiqueta en el filtro", () => {
  // Es el bug que había: el matching producía ultra7 y el filtro no tenía cómo pedirlo.
  const producidas = ["ultra9", "ultra7", "ultra5", "i9", "i7", "i5", "i3", "ryzen9", "ryzen7", "ryzen5", "ryzen3", "apple-m", "intel-n"];
  for (const f of producidas) assert.ok((ETIQUETAS_CPU as Record<string, string>)[f], `falta etiqueta para ${f}`);
  assert.equal(Object.keys(ETIQUETAS_CPU).length, producidas.length, "hay etiquetas que nada produce");
});
